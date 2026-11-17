import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.response) return auth.response;

    const profile = await db.getSellerProfile(auth.user.id);
    if (!profile) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Not a seller" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const orders = await db.getSellerOrders(auth.user.id);
    return NextResponse.json<ApiResponse>({ success: true, data: orders.slice(0, limit) });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to load orders" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.response) return auth.response;

    const body = await req.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Missing orderId or status" }, { status: 400 });
    }

    const order = await db.getOrderById(orderId);
    if (!order) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Order not found" }, { status: 404 });
    }

    // Verify seller owns this order
    const isSellerOrder = order.items.some((item) => item.sellerId === auth.user.id);
    if (!isSellerOrder) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const updated = await db.updateOrderStatus(orderId, status);
    return NextResponse.json<ApiResponse>({ success: true, data: updated });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to update order" }, { status: 500 });
  }
}