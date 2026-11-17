import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const token = getAuthToken(req);
    if (token) {
      await db.deleteSession(token);
    }

    const response = NextResponse.json<ApiResponse>({
      success: true,
      message: "Logged out successfully",
    });

    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to log out" },
      { status: 500 }
    );
  }
}