import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

/**
 * PATCH /api/admin/listings/[id] — moderation actions
 * Body: { action: "suspend" | "activate" | "delete", reason?: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = (await req.json()) as {
      action?: string;
      reason?: string;
    };
    const { action, reason } = body;

    if (!action || !["suspend", "activate", "delete"].includes(action)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid action" },
        { status: 400 }
      );
    }

    const listing = await db.getListingById(id);
    if (!listing) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Listing not found" },
        { status: 404 }
      );
    }

    if (action === "delete") {
      await db.deleteListing(id);
      return NextResponse.json<ApiResponse>({
        success: true,
        data: { id },
      });
    }

    if (action === "suspend") {
      const updated = await db.updateListing(id, {
        status: "suspended",
        moderationReason: reason || "Policy violation — suspended by admin",
        moderatedAt: new Date().toISOString(),
      });
      // TODO: notify seller — db.createNotification({ userId: listing.sellerId, ... })
      return NextResponse.json<ApiResponse>({ success: true, data: updated });
    }

    // activate — reinstate the listing
    const updated = await db.updateListing(id, {
      status: "active",
      moderationReason: undefined,
      moderatedAt: undefined,
    });
    return NextResponse.json<ApiResponse>({ success: true, data: updated });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Action failed" },
      { status: 500 }
    );
  }
}