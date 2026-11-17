import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { ApiResponse } from "@/types";

// GET /api/buyer/escrow — escrow records for the current user.
// "awaiting_payment" is not money in escrow yet, so it is never shown here.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return auth.response;

  try {
    const escrows = (await db.getEscrowByUser(auth.user.id)).filter(
      (e) => e.status !== "awaiting_payment"
    );
    return NextResponse.json<ApiResponse>({ success: true, data: escrows });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to fetch escrow records" }, { status: 500 });
  }
}