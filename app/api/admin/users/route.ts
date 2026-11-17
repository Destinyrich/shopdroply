import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";
import type { User } from "@/lib/db-interface";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").toLowerCase().trim();
    const role = searchParams.get("role") || "";

    let users = await db.getAllUsers();

    if (role) users = users.filter((u) => (u.role || "buyer") === role);
    if (search) {
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          (u.phone || "").includes(search)
      );
    }

    // Newest first
    users = [...users].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json<ApiResponse>({ success: true, data: users });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load users" },
      { status: 500 }
    );
  }
}

// Re-export for convenience in other admin modules
export type { User };