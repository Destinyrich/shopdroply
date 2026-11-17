import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { ApiResponse } from "@/types";

// GET /api/buyer/watchlist — list watchlist for current user
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return auth.response;

  try {
    const items = await db.getWatchlistByUser(auth.user.id);
    return NextResponse.json<ApiResponse>({ success: true, data: items });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to fetch watchlist" }, { status: 500 });
  }
}

// POST /api/buyer/watchlist — add item to watchlist
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return auth.response;

  try {
    const body = await req.json();
    const item = await db.addToWatchlist({
      userId: auth.user.id,
      listingId: body.listingId,
      item: body.item,
      image: body.image,
      price: body.price,
      origPrice: body.origPrice,
      type: body.type,
      bids: body.bids,
    });
    return NextResponse.json<ApiResponse>({ success: true, data: item, message: "Added to watchlist" });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to add to watchlist" }, { status: 500 });
  }
}

// DELETE /api/buyer/watchlist?listingId=xxx — remove from watchlist
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const listingId = searchParams.get("listingId");
    if (!listingId) {
      return NextResponse.json<ApiResponse>({ success: false, error: "listingId required" }, { status: 400 });
    }
    const removed = await db.removeFromWatchlist(auth.user.id, listingId);
    return NextResponse.json<ApiResponse>({ success: removed, message: removed ? "Removed from watchlist" : "Item not found" });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to remove from watchlist" }, { status: 500 });
  }
}