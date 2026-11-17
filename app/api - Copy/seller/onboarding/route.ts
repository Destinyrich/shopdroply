import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.response) return auth.response;
    const user = auth.user;

    const body = await req.json();
    const { tier, nin, bvn, dob, phone, bank, accountNumber, accountName } = body;

    if (!tier || !["individual", "verified", "business"].includes(tier)) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Invalid tier" }, { status: 400 });
    }
    if (!nin || nin.length !== 11 || !/^\d+$/.test(nin)) {
      return NextResponse.json<ApiResponse>({ success: false, error: "NIN must be 11 digits" }, { status: 400 });
    }
    if (tier !== "individual" && (!bvn || bvn.length !== 11)) {
      return NextResponse.json<ApiResponse>({ success: false, error: "BVN required" }, { status: 400 });
    }
    if (!dob || !bank || !accountNumber || accountNumber.length !== 10 || !accountName) {
      return NextResponse.json<ApiResponse>({ success: false, error: "All bank fields required" }, { status: 400 });
    }

    const updated = await db.updateUserAsSeller(user.id, {
      role: "seller",
      sellerTier: tier,
      nin,
      bvn: tier === "individual" ? undefined : bvn,
      dob,
      phone,
      bankName: bank,
      accountNumber,
      accountName,
      // Was "approved" — that skipped admin review entirely.
      // Every new seller now starts pending until an admin approves
      // them from /admin/kyc.
      sellerStatus: "pending",
      sellerOnboardingAt: new Date().toISOString(),
    });

    if (!updated) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Save failed" }, { status: 500 });
    }

    return NextResponse.json<ApiResponse>({ success: true, data: { tier: updated.sellerTier, status: updated.sellerStatus } });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
  }
}