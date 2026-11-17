import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { requirePermission } from "@/lib/require-permission";
import { SUPER_ADMIN_ROLE_ID, activeSuperCount, isSuperUser, toAdminView } from "@/lib/admin-roles";

const bad = (error: string, status = 400) =>
  NextResponse.json<ApiResponse>({ success: false, error }, { status });

/**
 * PATCH /api/admin/admins/[id] — change an admin's role or active status (Super Admin only)
 * Body: { roleId?: string, status?: "active" | "inactive" }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requirePermission(req, "roles", { superOnly: true });
    if (gate.response) return gate.response;
    const { ctx } = gate;
    const { id } = await params;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return bad("Invalid JSON body");
    }
    const roleId = body?.roleId;
    const status = body?.status;
    if (roleId === undefined && status === undefined) return bad("Nothing to update");
    if (roleId !== undefined && typeof roleId !== "string") return bad("Invalid role");
    if (status !== undefined && status !== "active" && status !== "inactive") return bad("Status must be active or inactive");

    if (ctx.user?.id === id) return bad("You can't change your own access — ask another Super Admin", 400);

    const [users, roles] = await Promise.all([db.getAllUsers(), db.getAdminRoles()]);
    const target = users.find((u) => u.id === id && u.role === "admin");
    if (!target) return bad("Admin not found", 404);

    const losesSuper =
      isSuperUser(target) &&
      ((roleId !== undefined && roleId !== SUPER_ADMIN_ROLE_ID) || status === "inactive");
    if (losesSuper && activeSuperCount(users, id) === 0) {
      return bad("At least one active Super Admin must remain", 409);
    }

    const patch: Parameters<typeof db.updateUser>[1] = {};
    if (roleId !== undefined) {
      const role = roles.find((r) => r.id === roleId);
      if (!role) return bad("Role not found", 404);
      if (!role.active) return bad("That role is inactive — activate it first");
      patch.adminRoleId = roleId;
    }
    if (status !== undefined) patch.accountStatus = status === "active" ? "active" : "suspended";

    const updated = await db.updateUser(id, patch);
    if (!updated) return bad("Admin not found", 404);
    return NextResponse.json<ApiResponse>({ success: true, data: toAdminView(updated, roles, ctx.user?.id) });
  } catch {
    return bad("Failed to update admin", 500);
  }
}

/** DELETE /api/admin/admins/[id] — remove admin access (the account itself stays) */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requirePermission(req, "roles", { superOnly: true });
    if (gate.response) return gate.response;
    const { ctx } = gate;
    const { id } = await params;

    if (ctx.user?.id === id) return bad("You can't remove your own admin access", 400);

    const users = await db.getAllUsers();
    const target = users.find((u) => u.id === id && u.role === "admin");
    if (!target) return bad("Admin not found", 404);

    if (isSuperUser(target) && activeSuperCount(users, id) === 0) {
      return bad("At least one active Super Admin must remain", 409);
    }

    await db.updateUser(id, {
      role: target.adminPrevRole ?? "buyer",
      adminRoleId: undefined,
      adminPrevRole: undefined,
      adminSince: undefined,
    });
    return NextResponse.json<ApiResponse>({ success: true });
  } catch {
    return bad("Failed to remove admin", 500);
  }
}