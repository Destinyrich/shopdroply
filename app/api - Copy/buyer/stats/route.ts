import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { ApiResponse } from "@/types";

// GET /api/buyer/stats — dashboard stats for current user
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return auth.response;

  try {
    const stats = await db.getBuyerStats(auth.user.id);
    return NextResponse.json<ApiResponse>({ success: true, data: stats });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to fetch stats" }, { status: 500 });
  }
}