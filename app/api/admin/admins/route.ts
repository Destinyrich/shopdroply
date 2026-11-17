import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { requirePermission } from "@/lib/require-permission";
import { toAdminView } from "@/lib/admin-roles";

const bad = (error: string, status = 400) =>
  NextResponse.json<ApiResponse>({ success: false, error }, { status });

/**
 * POST /api/admin/admins — give an existing account admin access (Super Admin only)
 * Body: { email: string, roleId: string }
 *
 * The person must already have a verified account. This avoids creating
 * passwords or sending invite links, so there's nothing to intercept.
 */
export async function POST(req: NextRequest) {
  try {
    const gate = await requirePermission(req, "roles", { superOnly: true });
    if (gate.response) return gate.response;
    const { ctx } = gate;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return bad("Invalid JSON body");
    }

    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const roleId = typeof body?.roleId === "string" ? body.roleId.trim() : "";
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return bad("Enter a valid email address");
    if (!roleId) return bad("Select a role");

    const roles = await db.getAdminRoles();
    const role = roles.find((r) => r.id === roleId);
    if (!role) return bad("Role not found", 404);
    if (!role.active) return bad("That role is inactive — activate it first");

    const user = await db.findUserByEmail(email);
    if (!user) return bad("No account with that email. They need to sign up first.", 404);
    if (!user.isVerified) return bad("That account isn't verified yet");
    if (user.accountStatus === "suspended") return bad("That account is suspended");
    if (user.role === "admin") return bad("That person is already an admin", 409);

    const updated = await db.updateUser(user.id, {
      role: "admin",
      adminRoleId: roleId,
      adminPrevRole: user.role ?? "buyer",
      adminSince: new Date().toISOString(),
    });
    if (!updated) return bad("User not found", 404);

    return NextResponse.json<ApiResponse>({ success: true, data: toAdminView(updated, roles, ctx.user?.id) });
  } catch {
    return bad("Failed to add admin", 500);
  }
}