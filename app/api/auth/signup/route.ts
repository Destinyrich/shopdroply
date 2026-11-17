import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import type { ApiResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone, role } = await req.json();

    // Validate required fields
    if (!name || !email || !password || !phone) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "All fields are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Email already registered" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (unverified)
    const user = await db.createUser({
      name,
      email,
      password: hashedPassword,
      phone,
      role: role || "buyer",
} as any);

    // Generate and store OTP
    const otp = await db.createOTP(phone);

    // ─── DEVELOPMENT ONLY: print OTP to terminal ───
    console.log("═══════════════════════════════════════════");
    console.log("📱 OTP CODE for", phone, ":", otp);
    console.log("═══════════════════════════════════════════");

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "OTP sent to your phone",
      data: { userId: user.id, phone: user.phone },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to create account" },
      { status: 500 }
    );
  }
}