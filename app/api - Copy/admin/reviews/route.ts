import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

/** GET /api/admin/reviews — list all reviews with enriched names */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // approved | pending | flagged

    let reviews = await db.getAllReviews();
    if (status) {
      reviews = reviews.filter((r) => r.status === status);
    }

    // Enrich with buyer / seller names
    const enriched = await Promise.all(
      reviews.map(async (r) => {
        const [buyer, seller] = await Promise.all([
          db.findUserById(r.buyerId),
          db.findUserById(r.sellerId),
        ]);
        return {
          ...r,
          buyerName: buyer?.name || r.buyerId,
          sellerName: seller?.name || r.sellerId,
        };
      })
    );

    return NextResponse.json<ApiResponse>({ success: true, data: enriched });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load reviews" },
      { status: 500 }
    );
  }
}