import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

// Fields a seller is allowed to edit on their own listing
const EDITABLE_FIELDS = [
  "title", "description", "price", "origPrice", "category", "condition",
  "location", "images", "stock", "acceptOffers", "handlingTime",
  "acceptReturns", "shippingFee", "shippingMethod", "status",
  "endTime", "reservePrice", "currentBid", "bids",
] as const;

async function getOwnedListing(req: NextRequest, id: string) {
  const auth = await requireAuth(req);
  if (auth.response) return { response: auth.response, listing: null };

  const listing = await db.getListingById(id);
  if (!listing || listing.sellerId !== auth.user.id) {
    return {
      response: NextResponse.json<ApiResponse>(
        { success: false, error: "Listing not found" },
        { status: 404 }
      ),
      listing: null,
    };
  }
  return { response: null, listing };
}

// GET /api/seller/listings/[id] — load a single owned listing (for the edit screen)
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { response, listing } = await getOwnedListing(req, id);
    if (response) return response;
    return NextResponse.json<ApiResponse>({ success: true, data: listing });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load listing" },
      { status: 500 }
    );
  }
}

// PUT /api/seller/listings/[id] — full/partial update (edit screen save)
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { response, listing } = await getOwnedListing(req, id);
    if (response) return response;

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    for (const field of EDITABLE_FIELDS) {
      if (field in body) updates[field] = body[field];
    }

    // Numeric coercion + guards
    if ("price" in updates) {
      const p = Number(updates.price);
      if (!Number.isFinite(p) || p <= 0) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Price must be a positive number" },
          { status: 400 }
        );
      }
      updates.price = p;
    }
    if ("origPrice" in updates) updates.origPrice = Math.max(0, Number(updates.origPrice) || 0);
    if ("shippingFee" in updates) updates.shippingFee = Math.max(0, Number(updates.shippingFee) || 0);
    if ("stock" in updates) updates.stock = Math.max(0, Math.floor(Number(updates.stock) || 0));
    if ("images" in updates && !Array.isArray(updates.images)) delete updates.images;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Nothing to update" },
        { status: 400 }
      );
    }

    const updated = await db.updateListing(id, updates);
    return NextResponse.json<ApiResponse>({ success: true, data: updated });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to update listing" },
      { status: 500 }
    );
  }
}