import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.response) return auth.response;

    const profile = await db.getSellerProfile(auth.user.id);
    if (!profile) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Not a seller" }, { status: 403 });
    }

    const listings = await db.getSellerListings(auth.user.id);
    return NextResponse.json<ApiResponse>({ success: true, data: listings });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to load listings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.response) return auth.response;

    const profile = await db.getSellerProfile(auth.user.id);
    if (!profile) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Not a seller" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, price, type, category, condition, images, shippingFee, shippingMethod, endTime, reservePrice } = body;

    if (!title || !price || !type || !category) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Title, price, type and category are required" }, { status: 400 });
    }

    const listing = await db.createListing({
      title,
      description: description || "",
      price: Number(price),
      type,
      category,
      condition: condition || "new",
      images: images || [],
      sellerId: auth.user.id,
      sellerName: auth.user.name,
      sellerRating: (profile as any).sellerRating || 4.5,
      sellerReviews: (profile as any).sellerReviews || 0,
      sellerBadge: profile.sellerTier === "business" ? "Business" : profile.sellerTier === "verified" ? "Verified" : "Basic",
      location: (profile as any).location || "Lagos",
      shippingFee: Number(shippingFee) || 0,
      shippingMethod: shippingMethod || "GIG Logistics",
      status: "active",
      endTime: endTime || undefined,
      reservePrice: reservePrice ? Number(reservePrice) : undefined,
      views: 0,
      watchers: 0,
    });

    return NextResponse.json<ApiResponse>({ success: true, data: listing });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to create listing" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.response) return auth.response;

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Missing id or status" }, { status: 400 });
    }

    const listing = await db.getListingById(id);
    if (!listing || listing.sellerId !== auth.user.id) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const updated = await db.updateListing(id, { status });
    return NextResponse.json<ApiResponse>({ success: true, data: updated });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to update listing" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.response) return auth.response;

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Missing id" }, { status: 400 });
    }

    const listing = await db.getListingById(id);
    if (!listing || listing.sellerId !== auth.user.id) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    await db.deleteListing(id);
    return NextResponse.json<ApiResponse>({ success: true });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to delete listing" }, { status: 500 });
  }
}