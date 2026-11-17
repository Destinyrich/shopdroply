import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

/** PATCH /api/admin/disputes/[id] — resolve or escalate a dispute */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const { id } = await params;
    const { action, resolution, adminNotes } = (await req.json()) as {
      action: "resolve" | "escalate";
      resolution?: string;
      adminNotes?: string;
    };

    const dispute = await db.getDisputeById(id);
    if (!dispute) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Dispute not found" },
        { status: 404 }
      );
    }
    if (dispute.status !== "open") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "This dispute is not open" },
        { status: 400 }
      );
    }

    if (action === "resolve" && !resolution?.trim()) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "A resolution decision is required" },
        { status: 400 }
      );
    }

    const updated =
      action === "resolve"
        ? await db.resolveDispute(id, resolution!.trim(), adminNotes?.trim())
        : await db.escalateDispute(id, adminNotes?.trim());

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