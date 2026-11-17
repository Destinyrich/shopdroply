import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

/** PATCH /api/admin/payouts/[id] — approve, reject, or retry a payout */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const { id } = await params;
    const { action, reason } = (await req.json()) as {
      action: "approve" | "reject" | "retry";
      reason?: string;
    };

    const payouts = await db.getAllPayouts();
    const payout = payouts.find((p) => p.id === id);
    if (!payout) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Payout not found" },
        { status: 404 }
      );
    }

    let updated;
    if (action === "approve") {
      if (payout.status !== "pending") {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Only pending payouts can be approved" },
          { status: 400 }
        );
      }
      updated = await db.updatePayoutStatus(id, "processing", { failReason: undefined });
    } else if (action === "reject") {
      if (payout.status !== "pending") {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Only pending payouts can be rejected" },
          { status: 400 }
        );
      }
      updated = await db.updatePayoutStatus(id, "failed", {
        failReason: reason?.trim() || "Rejected by admin — suspicious activity",
      });
    } else if (action === "retry") {
      if (payout.status !== "failed") {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Only failed payouts can be retried" },
          { status: 400 }
        );
      }
      updated = await db.updatePayoutStatus(id, "processing", { failReason: undefined });
    } else {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid action" },
        { status: 400 }
      );
    }

    if (!updated) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Update failed" },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse>({ success: true, data: updated });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Action failed" },
      { status: 500 }
    );
  }
}