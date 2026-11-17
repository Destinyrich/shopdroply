import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

/** GET /api/admin/orders/[id] — single order detail */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const { id } = await params;
    const order = await db.getOrderById(id);
    if (!order) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }
    return NextResponse.json<ApiResponse>({ success: true, data: order });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load order" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/orders/[id] — admin order intervention
 * Body: { status, trackingNumber?, courier?, eta? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await req.json();
    const { status, trackingNumber, courier, eta } = body;

    if (!status) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Missing status" },
        { status: 400 }
      );
    }

    const existing = await db.getOrderById(id);
    if (!existing) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const extra: Record<string, unknown> = {};
    if (trackingNumber !== undefined) extra.trackingNumber = trackingNumber;
    if (courier !== undefined) extra.courier = courier;
    if (eta !== undefined) extra.eta = eta;

    const updated = await db.updateOrderStatus(id, status, extra);
    return NextResponse.json<ApiResponse>({ success: true, data: updated });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to update order" },
      { status: 500 }
    );
  }
}
