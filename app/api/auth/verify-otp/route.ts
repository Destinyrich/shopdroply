import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Email and OTP code are required" },
        { status: 400 },
      );
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    const isValid = await db.verifyOTP(user.phone || "", code);
    if (!isValid) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid or expired OTP code" },
        { status: 400 },
      );
    }

    // Mark user as verified
    user.isVerified = true;

    // Create session
    const token = await db.createSession(user.id);

    // Set HTTP-only cookie
    const response = NextResponse.json<ApiResponse>({
      success: true,
      message: "Account verified successfully",
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: (user as any).role || "buyer",
        },
      },
    });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to verify OTP" },
      { status: 500 },
    );
  }
}
