import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const listing = await db.getListingById(id);
    if (!listing) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Not found" },
        { status: 404 }
      );
    }
    return NextResponse.json<ApiResponse>({ success: true, data: listing });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load listing" },
      { status: 500 }
    );
  }
}