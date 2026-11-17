import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { ApiResponse } from "@/types";

// GET /api/buyer/notifications — list notifications for current user
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return auth.response;

  try {
    const notifs = await db.getNotificationsByUser(auth.user.id);
    return NextResponse.json<ApiResponse>({ success: true, data: notifs });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// POST /api/buyer/notifications — mark as read or mark all as read
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return auth.response;

  try {
    const body = await req.json();
    if (body.all) {
      await db.markAllNotificationsRead(auth.user.id);
      return NextResponse.json<ApiResponse>({ success: true, message: "All notifications marked as read" });
    }
    if (body.notifId) {
      await db.markNotificationRead(auth.user.id, body.notifId);
      return NextResponse.json<ApiResponse>({ success: true, message: "Notification marked as read" });
    }
    return NextResponse.json<ApiResponse>({ success: false, error: "Invalid request" }, { status: 400 });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to update notification" }, { status: 500 });
  }
}