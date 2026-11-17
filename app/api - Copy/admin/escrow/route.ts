import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

/** GET /api/admin/escrow — list all escrow records, enriched with names */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const escrows = await db.getAllEscrow();

    // Enrich with buyer/seller names for display
    const enriched = await Promise.all(
      escrows.map(async (e) => {
        const [buyer, seller] = await Promise.all([
          db.findUserById(e.buyerId),
          db.findUserById(e.sellerId),
        ]);
        return {
          ...e,
          buyerName: buyer?.name || e.buyerId,
          sellerName: seller?.name || e.sellerId,
        };
      })
    );

    return NextResponse.json<ApiResponse>({ success: true, data: enriched });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load escrow records" },
      { status: 500 }
    );
  }
}