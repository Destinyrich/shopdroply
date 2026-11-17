import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

/** GET /api/admin/escrow/[id] — single escrow record */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const { id } = await params;
    const record = await db.getEscrowById(id);
    if (!record) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Escrow record not found" },
        { status: 404 }
      );
    }

    const [buyer, seller] = await Promise.all([
      db.findUserById(record.buyerId),
      db.findUserById(record.sellerId),
    ]);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        ...record,
        buyerName: buyer?.name || record.buyerId,
        sellerName: seller?.name || record.sellerId,
      },
    });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load escrow record" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/escrow/[id] — admin escrow intervention
 * Body: { action: "release" | "refund" | "hold" }
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
    const { action } = body as { action?: unknown };

    const validActions = ["release", "refund", "hold"] as const;
    if (action !== "release" && action !== "refund" && action !== "hold") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid action — use release, refund or hold" },
        { status: 400 }
      );
    }

    const record = await db.getEscrowById(id);
    if (!record) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Escrow record not found" },
        { status: 404 }
      );
    }

    // Only funds still held (pending / disputed) can be moved
    if (record.status !== "pending" && record.status !== "disputed") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: `Funds already ${record.status} — no action possible` },
        { status: 409 }
      );
    }

    const statusMap = {
      release: "released",
      refund: "refunded",
      hold: "disputed",
    } as const;

    const updated = await db.updateEscrowStatus(id, statusMap[action]);
    return NextResponse.json<ApiResponse>({ success: true, data: updated });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to update escrow record" },
      { status: 500 }
    );
  }
}