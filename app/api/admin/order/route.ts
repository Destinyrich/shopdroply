import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

/** GET /api/admin/orders — list all orders on the platform */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const orders = await db.getAllOrders();
    return NextResponse.json<ApiResponse>({ success: true, data: orders });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load orders" },
      { status: 500 }
    );
  }
}
