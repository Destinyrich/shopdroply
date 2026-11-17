import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.response) return auth.response;

    const profile = await db.getSellerProfile(auth.user.id);
    if (!profile) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Not a seller" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    const activities = await db.getSellerActivities(auth.user.id, limit);
    return NextResponse.json<ApiResponse>({ success: true, data: activities });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to load activities" }, { status: 500 });
  }
}