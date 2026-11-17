import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

const EDITABLE = [
  "name", "phone", "dob",
  "bankName", "accountNumber", "accountName",
  "storeBanner", "storeAbout", "storePolicies",
] as const;

// GET /api/seller/me — unchanged behavior (returns the seller profile)
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.response) return auth.response;

    const profile = await db.getSellerProfile(auth.user.id);
    if (!profile) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Not a seller" }, { status: 403 });
    }

    return NextResponse.json<ApiResponse>({ success: true, data: profile });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to load profile" }, { status: 500 });
  }
}

// PATCH /api/seller/me — update profile, bank and store fields
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.response) return auth.response;

    const profile = await db.getSellerProfile(auth.user.id);
    if (!profile) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Not a seller" }, { status: 403 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};
    for (const field of EDITABLE) {
      if (field in body) updates[field] = typeof body[field] === "string" ? body[field].trim().slice(0, 2000) : body[field];
    }

    if ("accountNumber" in updates && !/^\d{10}$/.test(String(updates.accountNumber))) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Account number must be exactly 10 digits" },
        { status: 400 }
      );
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Nothing to update" }, { status: 400 });
    }

    const updated = await db.updateUserAsSeller(auth.user.id, updates);
    const { password, ...safe } = updated || {};
    return NextResponse.json<ApiResponse>({ success: true, data: safe });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to update profile" }, { status: 500 });
  }
}
