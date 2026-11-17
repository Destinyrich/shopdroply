import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

/** PATCH /api/admin/banners/[id] — update a banner (fields or active toggle) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await req.json();

    // Prevent admins from faking click counts
    const { clicks, id: _id, createdAt, ...safePatch } = body;

    if (safePatch.position) {
      const validPositions = ["hero", "promo-bar", "seller-cta"];
      if (!validPositions.includes(safePatch.position)) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Invalid position" },
          { status: 400 }
        );
      }
    }

    const updated = await db.updateBanner(id, safePatch);
    if (!updated) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Banner not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({ success: true, data: updated });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to update banner" },
      { status: 500 }
    );
  }
}

/** DELETE /api/admin/banners/[id] — remove a banner */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const { id } = await params;
    const ok = await db.deleteBanner(id);
    if (!ok) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Banner not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({ success: true, data: { id } });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to delete banner" },
      { status: 500 }
    );
  }
}