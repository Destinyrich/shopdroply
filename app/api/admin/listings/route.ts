import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

/** GET /api/admin/listings — all listings enriched with seller account status */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const [listings, users] = await Promise.all([
      db.getListings(),
      db.getAllUsers(),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const enriched = listings
      .map((l) => ({
        ...l,
        sellerEmail: userMap.get(l.sellerId)?.email || null,
        sellerAccountStatus: userMap.get(l.sellerId)?.accountStatus || "active",
      }))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return NextResponse.json<ApiResponse>({ success: true, data: enriched });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load listings" },
      { status: 500 }
    );
  }
}