import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { requirePermission } from "@/lib/require-permission";
import { SUPER_ADMIN_ROLE_ID, parseRoleFields } from "@/lib/admin-roles";

const bad = (error: string, status = 400) =>
  NextResponse.json<ApiResponse>({ success: false, error }, { status });

/** PATCH /api/admin/roles/[id] — edit a role (Super Admin only; system roles are locked) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requirePermission(req, "roles", { superOnly: true });
    if (gate.response) return gate.response;

    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return bad("Invalid JSON body");
    }

    const parsed = parseRoleFields(body, false);
    if (!parsed.ok) return bad(parsed.error);
    const updates = parsed.value;
    if (Object.keys(updates).length === 0) return bad("Nothing to update");

    const [roles, users] = await Promise.all([db.getAdminRoles(), db.getAllUsers()]);
    const existing = roles.find((r) => r.id === id);
    if (!existing) return bad("Role not found", 404);
    if (existing.system) return bad("System roles can't be modified", 403);

    if (updates.name && roles.some((r) => r.id !== id && r.name.toLowerCase() === updates.name!.toLowerCase())) {
      return bad("A role with that name already exists", 409);
    }

    const assigned = users.filter((u) => u.role === "admin" && u.adminRoleId === id).length;
    if (updates.active === false && existing.active && assigned > 0) {
      return bad(`${assigned} admin${assigned === 1 ? " is" : "s are"} still assigned to this role — reassign them first`, 409);
    }

    const next = { ...existing, ...updates, id: existing.id, system: false, createdAt: existing.createdAt };
    await db.saveAdminRoles(roles.map((r) => (r.id === id ? next : r)));

    return NextResponse.json<ApiResponse>({ success: true, data: { ...next, admins: assigned } });
  } catch {
    return bad("Failed to update role", 500);
  }
}

/** DELETE /api/admin/roles/[id] — delete a custom role that nobody is using */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requirePermission(req, "roles", { superOnly: true });
    if (gate.response) return gate.response;

    const { id } = await params;
    if (id === SUPER_ADMIN_ROLE_ID) return bad("System roles can't be deleted", 403);

    const [roles, users] = await Promise.all([db.getAdminRoles(), db.getAllUsers()]);
    const existing = roles.find((r) => r.id === id);
    if (!existing) return bad("Role not found", 404);
    if (existing.system) return bad("System roles can't be deleted", 403);

    const assigned = users.filter((u) => u.role === "admin" && u.adminRoleId === id).length;
    if (assigned > 0) {
      return bad(`${assigned} admin${assigned === 1 ? " is" : "s are"} still assigned to this role — reassign them first`, 409);
    }

    await db.saveAdminRoles(roles.filter((r) => r.id !== id));
    return NextResponse.json<ApiResponse>({ success: true });
  } catch {
    return bad("Failed to delete role", 500);
  }
}