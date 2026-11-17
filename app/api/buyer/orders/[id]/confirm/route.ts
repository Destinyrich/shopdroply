import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { OrderError } from "@/lib/orders";
import { releaseEscrow } from "@/lib/escrow";
import type { ApiResponse } from "@/types";

// POST /api/buyer/orders/[id]/confirm — the buyer confirms they received the item.
// This is the moment escrow is released to the seller (minus commission).
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (!auth.user) return auth.response;

  try {
    const { id } = await ctx.params;
    const order = await db.getOrderById(id);

    // same 404 for "doesn't exist" and "not yours"
    if (!order || order.buyerId !== auth.user.id) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Order not found" }, { status: 404 });
    }

    if (order.status === "Confirm receipt") {
      return NextResponse.json<ApiResponse>({ success: true, message: "Already confirmed" });
    }
    if (order.status !== "In transit" && order.status !== "Delivered") {
      throw new OrderError("You can confirm receipt once the seller has shipped your order", 409);
    }

    const result = await releaseEscrow(order.id, "buyer");
    return NextResponse.json<ApiResponse>({
      success: true,
      data: { orderId: result.orderId },
      message: "Receipt confirmed. Payment released to the seller.",
    });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json<ApiResponse>({ success: false, error: err.message }, { status: err.status });
    }
    console.error("Confirm receipt error:", err);
    return NextResponse.json<ApiResponse>({ success: false, error: "Could not confirm receipt" }, { status: 500 });
  }
}