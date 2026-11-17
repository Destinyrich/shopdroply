import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const stats = await (
      db as unknown as {
        getAdminDashboardStats: () => Promise<unknown>;
      }
    ).getAdminDashboardStats();
    return NextResponse.json<ApiResponse>({ success: true, data: stats });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load admin dashboard" },
      { status: 500 }
    );
  }
}