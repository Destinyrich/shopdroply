import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

const EDITABLE = ["storeBanner", "storeAbout", "storePolicies"] as const;

// GET /api/seller/storefront → { profile, listings } for the logged-in seller
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.response) return auth.response;

    const profile = await db.getSellerProfile(auth.user.id);
    if (!profile) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Not a seller" }, { status: 403 });
    }

    const listings = await db.getSellerListings(auth.user.id);
    return NextResponse.json<ApiResponse>({
      success: true,
      data: { profile, listings: listings.filter((l) => l.status === "active") },
    });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to load storefront" }, { status: 500 });
  }
}

// PATCH /api/seller/storefront → update banner / about / policies
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.response) return auth.response;

    const profile = await db.getSellerProfile(auth.user.id);
    if (!profile) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Not a seller" }, { status: 403 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};
    for (const field of EDITABLE) {
      if (field in body) updates[field] = typeof body[field] === "string" ? body[field].slice(0, 2000) : body[field];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Nothing to update" }, { status: 400 });
    }

    const updated = await db.updateUserAsSeller(auth.user.id, updates);
    const { password, ...safe } = updated || {};
    return NextResponse.json<ApiResponse>({ success: true, data: safe });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to update storefront" }, { status: 500 });
  }
}
