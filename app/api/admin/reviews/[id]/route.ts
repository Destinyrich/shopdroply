import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

/**
 * PATCH /api/admin/reviews/[id] — moderate a review
 * Body: { status, adminNotes? }
 *   status: "approved" | "pending" | "flagged" | "rejected"
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await req.json();
    const { status, adminNotes } = body;

    const valid = ["approved", "pending", "flagged", "rejected"];
    if (!status || !valid.includes(status)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    const updated = await db.updateReviewStatus(id, status, adminNotes);
    if (!updated) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Review not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({ success: true, data: updated });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to update review" },
      { status: 500 }
    );
  }
}