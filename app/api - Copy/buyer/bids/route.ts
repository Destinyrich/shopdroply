import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { ApiResponse } from "@/types";

// GET /api/buyer/bids — list active bids for current user
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return auth.response;

  try {
    const bids = await db.getBidsByUser(auth.user.id);
    return NextResponse.json<ApiResponse>({ success: true, data: bids });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to fetch bids" }, { status: 500 });
  }
}

// POST /api/buyer/bids — place a new bid
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return auth.response;

  try {
    const body = await req.json();
    const bid = await db.createBid({
      userId: auth.user.id,
      listingId: body.listingId,
      item: body.item,
      image: body.image,
      myBid: body.amount,
      currentBid: body.amount,
      leading: true,
      endTime: body.endTime,
      totalBids: 1,
    });

    await db.createNotification({
      userId: auth.user.id,
      icon: "⚡",
      title: "Bid placed",
      body: `You placed a bid of ₦${body.amount.toLocaleString()} on ${body.item}.`,
      time: "Just now",
      unread: true,
    });

    return NextResponse.json<ApiResponse>({ success: true, data: bid, message: "Bid placed" });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to place bid" }, { status: 500 });
  }
}