import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await db.findUserByEmail(email.toLowerCase().trim());
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // ── Password check ────────────────────────────────────────────
    // The local dev adapter stores plain-text passwords, so compare
    // directly. Swap this for bcrypt.compare(password, user.password)
    // once you move to an adapter that stores bcrypt hashes.
    const valid = user.password === password;
    if (!valid) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // ── Admin gate ────────────────────────────────────────────────
    if (user.role !== "admin") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "This account does not have admin access" },
        { status: 403 }
      );
    }

    const token = await db.createSession(user.id);

    const res = NextResponse.json<ApiResponse>({
      success: true,
      data: { id: user.id, email: user.email, name: user.name, role: user.role },
    });

    res.cookies.set("auth-token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Login failed — please try again" },
      { status: 500 }
    );
  }
}