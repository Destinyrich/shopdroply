// lib/auth.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "./db";
import type { ApiResponse } from "@/types";

/**
 * Extracts the auth token from either:
 * 1. HTTP-only cookie (server-side)
 * 2. Authorization header (Bearer token)
 */
export function getAuthToken(req: NextRequest): string | null {
  // Try cookie first
  const cookieToken = req.cookies.get("auth-token")?.value;
  if (cookieToken) return cookieToken;

  // Fallback to Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
}

/**
 * Requires authentication. Returns user + null response if valid,
 * or null user + 401 response if invalid.
 */
export async function requireAuth(req: NextRequest): Promise<
  | { user: { id: string; email: string; name: string; phone?: string }; response: null }
  | { user: null; response: NextResponse<ApiResponse> }
> {
  const token = getAuthToken(req);

  if (!token) {
    return {
      user: null,
      response: NextResponse.json<ApiResponse>(
        { success: false, error: "Unauthorized — please log in" },
        { status: 401 }
      ),
    };
  }

  const session = await db.getSession(token);
  if (!session) {
    return {
      user: null,
      response: NextResponse.json<ApiResponse>(
        { success: false, error: "Session expired — please log in again" },
        { status: 401 }
      ),
    };
  }

  const user = await db.findUserById(session.userId);
  if (!user) {
    return {
      user: null,
      response: NextResponse.json<ApiResponse>(
        { success: false, error: "User not found" },
        { status: 401 }
      ),
    };
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
    },
    response: null,
  };
}

/**
 * Requires an authenticated ADMIN user. Returns user + null response if valid,
 * or null user + 401/403 response if not authenticated / not an admin.
 */
export async function requireAdmin(req: NextRequest): Promise<
  | { user: { id: string; email: string; name: string; role: string }; response: null }
  | { user: null; response: NextResponse<ApiResponse> }
> {
  const auth = await requireAuth(req);
  if (auth.response) return { user: null, response: auth.response };

  const fullUser = await db.findUserById(auth.user.id);
  if (!fullUser || (fullUser.role as string | undefined) !== "admin") {
    return {
      user: null,
      response: NextResponse.json<ApiResponse>(
        { success: false, error: "Forbidden — admin access required" },
        { status: 403 }
      ),
    };
  }

  return {
    user: { ...auth.user, role: "admin" },
    response: null,
  };
}

/**
 * Requires an authenticated seller whose KYC has been approved by an admin.
 * Returns user + null response if valid, or null user + 401/403 response
 * if not authenticated, not a seller, or not yet approved.
 */
export async function requireApprovedSeller(req: NextRequest): Promise<
  | { user: { id: string; email: string; name: string; sellerStatus?: string }; response: null }
  | { user: null; response: NextResponse<ApiResponse> }
> {
  const auth = await requireAuth(req);
  if (auth.response) return { user: null, response: auth.response };

  const fullUser = await db.findUserById(auth.user.id);
  if (!fullUser || fullUser.role !== "seller") {
    return {
      user: null,
      response: NextResponse.json<ApiResponse>(
        { success: false, error: "Forbidden — seller access required" },
        { status: 403 }
      ),
    };
  }

  if (fullUser.sellerStatus !== "approved") {
    return {
      user: null,
      response: NextResponse.json<ApiResponse>(
        {
          success: false,
          error:
            fullUser.sellerStatus === "rejected"
              ? "Your seller verification was declined"
              : "Your seller application is awaiting admin approval",
        },
        { status: 403 }
      ),
    };
  }

  return {
    user: { ...auth.user, sellerStatus: fullUser.sellerStatus },
    response: null,
  };
}

/**
 * Optional auth — returns user if logged in, null otherwise.
 * Never returns a 401 response.
 */
export async function optionalAuth(req: NextRequest): Promise<{ id: string; email: string; name: string; phone?: string } | null> {
  const token = getAuthToken(req);
  if (!token) return null;

  const session = await db.getSession(token);
  if (!session) return null;

  const user = await db.findUserById(session.userId);
  if (!user) return null;

  return { id: user.id, email: user.email, name: user.name, phone: user.phone };
}