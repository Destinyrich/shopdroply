import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

/** PATCH /api/admin/kyc/[id] — approve or reject a seller application */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const { id } = await params;
    const { action, reason } = (await req.json()) as {
      action: "approve" | "reject";
      reason?: string;
    };

    const user = await db.findUserById(id);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }
    if (user.sellerStatus !== "pending") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "This application is not awaiting review" },
        { status: 400 }
      );
    }

    if (action === "reject" && !reason?.trim()) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "A rejection reason is required" },
        { status: 400 }
      );
    }

    const updated =
      action === "approve"
        ? await db.updateUserKyc(id, "approved")
        : await db.updateUserKyc(id, "rejected", reason?.trim());

    if (!updated) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Update failed" },
        { status: 500 }
      );
    }

    try {
      await db.createNotification({
        userId: id,
        icon: action === "approve" ? "🎉" : "❌",
        title:
          action === "approve"
            ? "🎉 Seller verification approved"
            : "❌ Seller verification declined",
        body:
          action === "approve"
            ? `Congratulations ${user.name.split(" ")[0]}! Your ${user.sellerTier || "seller"} verification has been approved. Your listings now carry the verified badge.`
            : `Your seller verification was declined. Reason: ${reason?.trim()}. You can correct this and re-apply from your seller settings.`,
        time: "Just now",
        unread: true,
      });
    } catch { /* notification is best-effort */ }

    const { password, nin, bvn, ...safe } = updated;
    return NextResponse.json<ApiResponse>({ success: true, data: safe });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Action failed" },
      { status: 500 }
    );
  }
}