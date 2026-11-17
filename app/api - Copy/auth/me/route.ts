import { NextRequest, NextResponse } from "next/server";
import { optionalAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const authUser = await optionalAuth(req);

    if (!authUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const fullUser = await db.findUserById(authUser.id);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        phone: authUser.phone,
        isVerified: fullUser?.isVerified ?? false,
        joined: fullUser?.createdAt ?? "",
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}