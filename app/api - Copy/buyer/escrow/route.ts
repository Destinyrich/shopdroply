import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { ApiResponse } from "@/types";

// GET /api/buyer/escrow — list escrow records for current user
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return auth.response;

  try {
    const escrows = await db.getEscrowByUser(auth.user.id);
    return NextResponse.json<ApiResponse>({ success: true, data: escrows });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to fetch escrow records" }, { status: 500 });
  }
}