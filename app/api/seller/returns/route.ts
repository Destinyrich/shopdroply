import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

// GET /api/seller/returns → all return requests for this seller
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.response) return auth.response;

    const profile = await db.getSellerProfile(auth.user.id);
    if (!profile) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Not a seller" }, { status: 403 });
    }

    const returns = await db.getSellerReturns(auth.user.id);
    return NextResponse.json<ApiResponse>({ success: true, data: returns });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to load returns" }, { status: 500 });
  }
}

// PATCH /api/seller/returns → { id, status, resolution? }
// allowed transitions: requested→approved|declined, approved→received, received→refunded
const ALLOWED: Record<string, string[]> = {
  requested: ["approved", "declined"],
  approved: ["received"],
  received: ["refunded"],
};

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.response) return auth.response;

    const body = await req.json();
    const { id, status, resolution } = body;

    if (!id || !status) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Missing id or status" }, { status: 400 });
    }

    const existing = await db.getSellerReturns(auth.user.id).then((arr) => arr.find((r) => r.id === id));
    if (!existing) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Return request not found" }, { status: 404 });
    }

    if (!ALLOWED[existing.status]?.includes(status)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: `Cannot move a return from "${existing.status}" to "${status}"` },
        { status: 400 }
      );
    }

    if ((status === "declined" || status === "refunded") && !resolution?.trim()) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "A resolution note is required for this action" },
        { status: 400 }
      );
    }

    const updated = await db.updateReturnStatus(id, status, resolution?.trim());
    return NextResponse.json<ApiResponse>({ success: true, data: updated });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to update return" }, { status: 500 });
  }
}
