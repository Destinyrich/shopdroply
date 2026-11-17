import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

/** GET /api/admin/disputes — list all disputes */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const disputes = await db.getDisputes();
    return NextResponse.json<ApiResponse>({ success: true, data: disputes });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load disputes" },
      { status: 500 }
    );
  }
}