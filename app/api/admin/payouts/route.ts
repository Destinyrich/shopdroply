import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

/** GET /api/admin/payouts — list all seller payouts */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const payouts = await db.getAllPayouts();
    return NextResponse.json<ApiResponse>({ success: true, data: payouts });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load payouts" },
      { status: 500 }
    );
  }
}