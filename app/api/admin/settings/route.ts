import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

/** GET /api/admin/settings — platform-wide fee & payout settings */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const settings = await db.getPlatformSettings();
    return NextResponse.json<ApiResponse>({ success: true, data: settings });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

/** PATCH /api/admin/settings — update platform-wide settings */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const body = await req.json();
    const { paymentProcessingFee, minimumPayout, payoutSchedule } = body as {
      paymentProcessingFee?: number;
      minimumPayout?: number;
      payoutSchedule?: string;
    };

    const updates: Record<string, unknown> = {};
    if (paymentProcessingFee !== undefined) {
      if (Number.isNaN(paymentProcessingFee) || paymentProcessingFee < 0 || paymentProcessingFee > 10) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Payment processing fee must be between 0 and 10" },
          { status: 400 }
        );
      }
      updates.paymentProcessingFee = paymentProcessingFee;
    }
    if (minimumPayout !== undefined) {
      if (Number.isNaN(minimumPayout) || minimumPayout < 0) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Minimum payout must be a positive number" },
          { status: 400 }
        );
      }
      updates.minimumPayout = minimumPayout;
    }
    if (payoutSchedule !== undefined) {
      if (!payoutSchedule.trim()) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Payout schedule is required" },
          { status: 400 }
        );
      }
      updates.payoutSchedule = payoutSchedule;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Nothing to update" },
        { status: 400 }
      );
    }

    const updated = await db.updatePlatformSettings(updates);
    return NextResponse.json<ApiResponse>({ success: true, data: updated });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to update settings" },
      { status: 500 }
    );
  }
}