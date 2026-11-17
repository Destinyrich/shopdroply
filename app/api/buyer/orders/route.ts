import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { ApiResponse } from "@/types";

// GET /api/buyer/orders — list orders for current user
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return auth.response;

  try {
    const orders = await db.getOrdersByUser(auth.user.id);
    return NextResponse.json<ApiResponse>({ success: true, data: orders });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to fetch orders" }, { status: 500 });
  }
}

// POST /api/buyer/orders — create a new order
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return auth.response;

  try {
    const body = await req.json();
    const order = await db.createOrder({
      buyerId: auth.user.id,
      items: body.items,
      status: "Processing",
      total: body.total,
      subtotal: body.subtotal,
      shipping: body.shipping,
      discount: body.discount || 0,
      address: body.address,
      payMethod: body.payMethod,
      courier: body.courier,
      eta: "2–3 days",
    });

    // Create escrow record
    await db.createEscrow({
      orderId: order.id,
      buyerId: auth.user.id,
      sellerId: body.sellerId || "unknown",
      amount: order.total,
      status: "pending",
    });

    // Create notification
    await db.createNotification({
      userId: auth.user.id,
      icon: "📦",
      title: "Order placed successfully",
      body: `Your order ${order.id} has been placed and payment secured in escrow.`,
      time: "Just now",
      unread: true,
    });

    return NextResponse.json<ApiResponse>({ success: true, data: order, message: "Order created" });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to create order" }, { status: 500 });
  }
}