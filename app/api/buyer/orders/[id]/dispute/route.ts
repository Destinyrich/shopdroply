import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { OrderError } from "@/lib/orders";
import { openDispute } from "@/lib/escrow";
import type { ApiResponse } from "@/types";

// POST /api/buyer/orders/[id]/dispute  { reason, description? }
// Freezes the escrow (seller can't be paid) and puts the case in the admin disputes queue.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (!auth.user) return auth.response;

  try {
    const { id } = await ctx.params;
    const order = await db.getOrderById(id);
    if (!order || order.buyerId !== auth.user.id) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Order not found" }, { status: 404 });
    }

    if (!["Processing", "In transit", "Delivered"].includes(order.status)) {
      throw new OrderError("This order can't be disputed in its current state", 409);
    }

    const body = await req.json();
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 120) : "";
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 1000) : "";
    if (reason.length < 3) throw new OrderError("Please choose a reason for the dispute");

    const dispute = await openDispute({ order, buyerName: auth.user.name, reason, description });
    return NextResponse.json<ApiResponse>(
      { success: true, data: { disputeId: dispute.id }, message: "Dispute filed" },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json<ApiResponse>({ success: false, error: err.message }, { status: err.status });
    }
    console.error("Open dispute error:", err);
    return NextResponse.json<ApiResponse>({ success: false, error: "Could not file the dispute" }, { status: 500 });
  }
}