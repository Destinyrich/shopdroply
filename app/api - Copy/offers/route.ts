import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

// GET /api/seller/offers — returns { offers, bids } for this seller
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.response) return auth.response;

    const profile = await db.getSellerProfile(auth.user.id);
    if (!profile) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Not a seller" }, { status: 403 });
    }

    const [offers, bids] = await Promise.all([
      db.getSellerOffers(auth.user.id),
      db.getBidsForSeller(auth.user.id),
    ]);

    return NextResponse.json<ApiResponse>({ success: true, data: { offers, bids } });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to load offers" }, { status: 500 });
  }
}

// PATCH /api/seller/offers — accept / decline / counter an offer
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.response) return auth.response;

    const body = await req.json();
    const { id, status, counterPrice } = body;

    if (!id || !status) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Missing id or status" }, { status: 400 });
    }

    const offer = await db.getSellerOffers(auth.user.id).then((arr) => arr.find((o) => o.id === id));
    if (!offer) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Offer not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { status };
    if (status === "countered" && counterPrice) updates.counterPrice = Number(counterPrice);

    const updated = await db.updateOffer(id, updates);
    return NextResponse.json<ApiResponse>({ success: true, data: updated });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to update offer" }, { status: 500 });
  }
}
