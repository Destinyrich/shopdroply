import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function GET() {
  try {
    const categories = await db.getCategories();
    return NextResponse.json<ApiResponse>({ success: true, data: categories });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load categories" },
      { status: 500 }
    );
  }
}