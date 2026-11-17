import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

type Action = "suspend" | "activate" | "approveKyc" | "rejectKyc";

/** GET /api/admin/users/[id] — user detail with orders & stats */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const { id } = await params;
    const user = await db.findUserById(id);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Never expose credentials/NIN/BVN in list; detail is admin-only but still mask
    const { password, nin, bvn, ...safe } = user;

    const orders = await db.getOrdersByUser(id).catch(() => []);

    let buyerStats = null;
    let sellerStats = null;
    try {
      buyerStats = await db.getBuyerStats(id);
    } catch { /* user may have no buyer activity */ }
    if (user.sellerStatus || user.role === "seller") {
      try {
        sellerStats = await db.getSellerStats(id);
      } catch { /* not a seller */ }
    }

    const totalSpent = orders
      .filter((o) => o.status !== "Cancelled" && o.status !== "cancelled")
      .reduce((s, o) => s + o.total, 0);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        user: {
          ...safe,
          nin: nin ? `****${nin.slice(-4)}` : undefined,
          bvn: bvn ? `****${bvn.slice(-4)}` : undefined,
        },
        orders,
        orderCount: orders.length,
        totalSpent,
        buyerStats,
        sellerStats,
      },
    });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load user" },
      { status: 500 }
    );
  }
}

/** PATCH /api/admin/users/[id] — admin actions on a user */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const { id } = await params;
    const { action } = (await req.json()) as { action: Action };

    const user = await db.findUserById(id);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Safety rules
    if (user.role === "admin") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Admin accounts cannot be modified here" },
        { status: 403 }
      );
    }
    if (id === auth.user.id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "You cannot modify your own account" },
        { status: 403 }
      );
    }

    let updated = null;
    let notifTitle = "";
    let notifBody = "";

    switch (action) {
      case "suspend":
        updated = await db.updateUserAccountStatus(id, "suspended");
        notifTitle = "⚠️ Account suspended";
        notifBody = "Your Shopdroply account has been suspended. Contact support if you believe this is a mistake.";
        break;
      case "activate":
        updated = await db.updateUserAccountStatus(id, "active");
        notifTitle = "✅ Account reactivated";
        notifBody = "Your Shopdroply account has been reactivated. Welcome back!";
        break;
      case "approveKyc":
        if (user.sellerStatus !== "pending") {
          return NextResponse.json<ApiResponse>(
            { success: false, error: "This seller is not awaiting KYC review" },
            { status: 400 }
          );
        }
        updated = await db.updateUserStatus(id, "approved");
        notifTitle = "🎉 Seller verification approved";
        notifBody = "Congratulations! Your seller verification has been approved. Your listings now carry the verified badge.";
        break;
      case "rejectKyc":
        if (user.sellerStatus !== "pending") {
          return NextResponse.json<ApiResponse>(
            { success: false, error: "This seller is not awaiting KYC review" },
            { status: 400 }
          );
        }
        updated = await db.updateUserStatus(id, "rejected");
        notifTitle = "❌ Seller verification declined";
        notifBody = "Your seller verification was declined. Please review your NIN/BVN details and re-apply.";
        break;
      default:
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Unknown action" },
          { status: 400 }
        );
    }

    if (!updated) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Update failed" },
        { status: 500 }
      );
    }

    // Notify the user
    try {
      await db.createNotification({
        userId: id,
        icon: action === "suspend" || action === "rejectKyc" ? "⚠️" : "✅",
        title: notifTitle,
        body: notifBody,
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