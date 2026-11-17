import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse, PayoutRecord, SellerEarning } from "@/types";

// GET /api/seller/earnings → { earnings, payouts, available, pending }
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.response) return auth.response;

    const profile = await db.getSellerProfile(auth.user.id);
    if (!profile) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Not a seller" }, { status: 403 });
    }

    const [earnings, payouts] = await Promise.all([
      db.getSellerEarnings(auth.user.id),
      db.getPayoutsBySeller(auth.user.id),
    ]);

    const available = earnings
      .filter((e) => e.status === "available")
      .reduce((sum, e) => sum + e.netAmount, 0);
    const pending = earnings
      .filter((e) => e.status === "pending")
      .reduce((sum, e) => sum + e.netAmount, 0);

    return NextResponse.json<ApiResponse>({ success: true, data: { earnings, payouts, available, pending } });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to load earnings" }, { status: 500 });
  }
}

// POST /api/seller/earnings → { amount } — withdraw available balance
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.response) return auth.response;

    const profile = await db.getSellerProfile(auth.user.id);
    if (!profile) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Not a seller" }, { status: 403 });
    }

    const body = await req.json();
    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Enter a valid amount" }, { status: 400 });
    }

    const earnings = await db.getSellerEarnings(auth.user.id);
    const availableEarnings = earnings.filter((e) => e.status === "available");
    const available = availableEarnings.reduce((sum, e) => sum + e.netAmount, 0);

    if (amount > available) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: `Amount exceeds available balance (${available.toLocaleString()})` },
        { status: 400 }
      );
    }

    if (!profile.bankName || !profile.accountNumber) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Add a bank account in Settings before withdrawing" },
        { status: 400 }
      );
    }

    // Mark available earnings as withdrawn (simple full-balance model)
    for (const e of availableEarnings) {
      await db.updateEarningStatus(e.id, "withdrawn");
    }

    const payout: Omit<PayoutRecord, "id" | "createdAt"> = {
      sellerId: auth.user.id,
      amount,
      bankName: profile.bankName,
      accountNumber: `****${profile.accountNumber.slice(-4)}`,
      accountName: profile.accountName || profile.name || "Seller",
      status: "completed",
    };
    const created = await db.createPayout(payout);

    return NextResponse.json<ApiResponse>({ success: true, data: created });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Withdrawal failed" }, { status: 500 });
  }
}
