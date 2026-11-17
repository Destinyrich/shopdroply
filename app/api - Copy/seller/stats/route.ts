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

    const stats = await db.getSellerStats(auth.user.id);
    return NextResponse.json<ApiResponse>({ success: true, data: stats });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to load stats" }, { status: 500 });
  }
}