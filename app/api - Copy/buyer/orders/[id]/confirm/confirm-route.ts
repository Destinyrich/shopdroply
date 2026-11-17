import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  OrderError,
  PAY_METHODS,
  createCheckoutOrders,
  parseAddress,
  priceCheckout,
} from "@/lib/orders";
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

// POST /api/buyer/orders — create orders (status "Pending payment") from the buyer's SERVER-SIDE cart.
// The client sends only: address, payMethod, couponCode, expectedTotal. Prices/shipping are never trusted.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return auth.response;

  try {
    const body = await req.json();

    if (!PAY_METHODS.includes(body.payMethod)) {
      throw new OrderError("Choose a valid payment method");
    }
    if (typeof body.expectedTotal !== "number") {
      throw new OrderError("expectedTotal is required");
    }
    const address = parseAddress(body.address);

    const cart = await db.getCartByUser(auth.user.id);
    const priced = await priceCheckout(
      auth.user.id,
      cart.map((i) => ({ listingId: i.listingId, qty: i.qty })),
      body.couponCode
    );

    // Price/shipping changed since the buyer last looked → stop and show the new total.
    if (body.expectedTotal !== priced.total) {
      throw new OrderError(
        "Prices or shipping changed since you last viewed your cart. Please review your updated total.",
        409,
        { total: priced.total, subtotal: priced.subtotal, shipping: priced.shipping, discount: priced.discount }
      );
    }

    const { checkoutId, orders } = await createCheckoutOrders(
      auth.user.id,
      priced,
      address,
      body.payMethod
    );

    // NOTE: no "payment secured" notification and no cart clearing here.
    // Both happen in Step 2, after the payment webhook confirms funds.
    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: { checkoutId, orders, total: priced.total },
        message: "Order created — awaiting payment",
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const orderError = err instanceof OrderError ? err : null;

    if (orderError) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "message" in orderError && typeof orderError.message === "string"
            ? orderError.message
            : String(orderError),
          data: "data" in orderError ? orderError.data : undefined,
        },
        { status: orderError.status }
      );
    }

    console.error("Create order error:", err);
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to create order" }, { status: 500 });
  }
}