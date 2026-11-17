import { NextRequest, NextResponse } from "next/server";
import { requireApprovedSeller } from "@/lib/auth";
import { db } from "@/lib/db";
import { OrderError } from "@/lib/orders";
import { refundEscrow } from "@/lib/escrow";
import { PaymentError } from "@/lib/payments/paystack";
import type { ApiResponse } from "@/types";

function fail(err: unknown, fallback: string) {
  if (err instanceof OrderError) {
    return NextResponse.json<ApiResponse>({ success: false, error: err.message }, { status: err.status });
  }
  if (err instanceof PaymentError) {
    console.error("Refund failed:", err.message);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "The refund couldn't be processed right now. Nothing was changed. Please try again." },
      { status: 502 }
    );
  }
  console.error(fallback, err);
  return NextResponse.json<ApiResponse>({ success: false, error: fallback }, { status: 500 });
}

// GET /api/seller/orders?limit=50
export async function GET(req: NextRequest) {
  const auth = await requireApprovedSeller(req);
  if (!auth.user) return auth.response;

  try {
    const raw = parseInt(req.nextUrl.searchParams.get("limit") || "50", 10);
    const limit = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 200) : 50;
    const orders = await db.getSellerOrders(auth.user.id); // never includes unpaid orders
    return NextResponse.json<ApiResponse>({ success: true, data: orders.slice(0, limit) });
  } catch (err) {
    return fail(err, "Failed to load orders");
  }
}

// PATCH /api/seller/orders  { orderId, status: "In transit" | "Cancelled", trackingNumber?, courier? }
// A seller may ONLY: ship a paid order, or cancel it before shipping (which refunds the buyer).
// "Delivered" / "Confirm receipt" are never set by the seller. That is what protects the buyer's escrow.
export async function PATCH(req: NextRequest) {
  const auth = await requireApprovedSeller(req);
  if (!auth.user) return auth.response;

  try {
    const body = await req.json();
    const orderId = typeof body.orderId === "string" ? body.orderId : "";
    const wanted = typeof body.status === "string" ? body.status.trim().toLowerCase() : "";
    if (!orderId || !wanted) throw new OrderError("Missing orderId or status");

    const order = await db.getOrderById(orderId);
    if (!order) throw new OrderError("Order not found", 404);

    const owns = order.sellerId
      ? order.sellerId === auth.user.id
      : order.items.length > 0 && order.items.every((i) => i.sellerId === auth.user.id);
    if (!owns) throw new OrderError("Order not found", 404); // don't reveal other sellers' orders

    // legacy orders have no paymentStatus; anything that HAS one must be "paid"
    if ((order.paymentStatus && order.paymentStatus !== "paid") || order.status === "Pending payment") {
      throw new OrderError("This order hasn't been paid yet, so it can't be shipped or changed", 409);
    }

    if (wanted === "in transit" || wanted === "shipped") {
      if (order.status !== "Processing") {
        throw new OrderError(`An order that is "${order.status}" can't be marked as shipped`, 409);
      }
      const trackingNumber = typeof body.trackingNumber === "string" ? body.trackingNumber.trim().slice(0, 60) : "";
      const courier = typeof body.courier === "string" ? body.courier.trim().slice(0, 60) : "";

      const updated = await db.updateOrderStatus(order.id, "In transit", {
        ...(trackingNumber ? { trackingNumber } : {}),
        ...(courier ? { courier } : {}),
      });
      await db.createNotification({
        userId: order.buyerId,
        icon: "🚚",
        title: "Your order is on the way",
        body: `Order ${order.id} has been shipped${courier ? ` with ${courier}` : ""}${trackingNumber ? ` (tracking ${trackingNumber})` : ""}.`,
        time: "Just now",
        unread: true,
      });
      return NextResponse.json<ApiResponse>({ success: true, data: updated });
    }

    if (wanted === "cancelled") {
      if (order.status !== "Processing") {
        throw new OrderError("You can only cancel an order before it ships", 409);
      }
      await refundEscrow(order.id, "The seller cancelled this order", "seller");
      return NextResponse.json<ApiResponse>({ success: true, data: await db.getOrderById(order.id), message: "Order cancelled and buyer refunded" });
    }

    if (wanted === "delivered" || wanted === "confirm receipt") {
      throw new OrderError("Delivery is confirmed by the buyer or the courier, not the seller", 403);
    }
    throw new OrderError("That status change isn't allowed");
  } catch (err) {
    return fail(err, "Failed to update order");
  }
}