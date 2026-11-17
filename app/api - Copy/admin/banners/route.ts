import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

/** GET /api/admin/banners — list all banners */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const banners = await db.getAllBanners();
    return NextResponse.json<ApiResponse>({ success: true, data: banners });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load banners" },
      { status: 500 }
    );
  }
}

/** POST /api/admin/banners — create a banner */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const body = await req.json();
    const { title, subtitle, position, cta, link, image, bgColor, active, startDate, endDate, priority } = body;

    if (!title?.trim() || !position || !startDate || !endDate) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Title, position, start and end dates are required" },
        { status: 400 }
      );
    }

    const validPositions = ["hero", "promo-bar", "seller-cta"];
    if (!validPositions.includes(position)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid position" },
        { status: 400 }
      );
    }

    const banner = await db.createBanner({
      title: title.trim(),
      subtitle: subtitle || "",
      position,
      cta: cta || "Shop now",
      link: link || "/",
      image: image || "🖼️",
      bgColor: bgColor || "#FFF7ED",
      active: active ?? true,
      startDate,
      endDate,
      priority: priority ?? 1,
      clicks: 0,
    });

    return NextResponse.json<ApiResponse>({ success: true, data: banner }, { status: 201 });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to create banner" },
      { status: 500 }
    );
  }
}