import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

// GET /api/storefront/[sellerId] — PUBLIC endpoint (buyers viewing a store)
export async function GET(_req: NextRequest, context: { params: Promise<{ sellerId: string }> }) {
  try {
    const { sellerId } = await context.params;
    const profile = await db.getSellerProfile(sellerId);
    if (!profile) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Store not found" }, { status: 404 });
    }

    const listings = await db.getSellerListings(sellerId);
    const active = listings.filter((l) => l.status === "active");

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        seller: {
          id: profile.id,
          name: profile.name,
          sellerTier: profile.sellerTier,
          phone: profile.phone,
          createdAt: profile.createdAt,
          storeBanner: profile.storeBanner,
          storeAbout: profile.storeAbout,
          storePolicies: profile.storePolicies,
        },
        listings: active,
        soldCount: listings.filter((l) => l.status === "sold").length,
      },
    });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to load store" }, { status: 500 });
  }
}
