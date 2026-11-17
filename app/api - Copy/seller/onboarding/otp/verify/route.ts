import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.response) return auth.response;

    const { phone, code } = await req.json();
    if (!phone || !code) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Phone and OTP code are required" },
        { status: 400 }
      );
    }

    const valid = await db.verifyOTP(phone, code);
    if (!valid) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiResponse>({ success: true, message: "OTP verified" });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}