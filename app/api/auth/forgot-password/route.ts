import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      // Don't reveal whether email exists
      return NextResponse.json<ApiResponse>({
        success: true,
        message: "If an account exists, a reset link has been sent",
      });
    }

    // Generate reset OTP
    const otp = await db.createOTP(user.phone || "");

    console.log("═══════════════════════════════════════════");
    console.log("🔑 PASSWORD RESET OTP for", user.phone, ":", otp);
    console.log("═══════════════════════════════════════════");

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "If an account exists, a reset code has been sent",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to process request" },
      { status: 500 }
    );
  }
}