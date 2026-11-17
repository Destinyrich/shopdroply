// app/api/listings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || undefined;
    const category = searchParams.get("category") || undefined;

    const listings = await db.getListings({
      ...(type && { type }),
      ...(category && { category }),
    });

    // Only return active listings to the public
    const active = listings.filter((l) => l.status === "active");
    return NextResponse.json<ApiResponse>({ success: true, data: active });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load listings" },
      { status: 500 }
    );
  }
}