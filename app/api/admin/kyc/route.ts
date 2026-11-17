import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

/** GET /api/admin/kyc — KYC queue + review history */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const users = await db.getAllUsers();

    const sellers = users.filter((u) => u.sellerStatus);
    const queue = sellers
      .filter((u) => u.sellerStatus === "pending")
      .sort(
        (a, b) =>
          new Date(a.sellerOnboardingAt || a.createdAt).getTime() -
          new Date(b.sellerOnboardingAt || b.createdAt).getTime()
      ); // oldest first — FIFO review

    const history = sellers
      .filter((u) => u.sellerStatus === "approved" || u.sellerStatus === "rejected")
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return NextResponse.json<ApiResponse>({ success: true, data: { queue, history } });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load KYC queue" },
      { status: 500 }
    );
  }
}