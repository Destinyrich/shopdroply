import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";
import type { AdminRole } from "@/lib/db-interface";
import { requirePermission } from "@/lib/require-permission";
import {
  PERMISSIONS,
  SUPER_ADMIN_ROLE_ID,
  parseRoleFields,
  toAdminView,
} from "@/lib/admin-roles";

const bad = (error: string, status = 400) =>
  NextResponse.json<ApiResponse>({ success: false, error }, { status });

/** GET /api/admin/roles — roles (with admin counts), admin users, permission catalog, current admin */
export async function GET(req: NextRequest) {
  try {
    const gate = await requirePermission(req, "roles");
    if (gate.response) return gate.response;
    const { ctx } = gate;

    const [roles, users] = await Promise.all([db.getAdminRoles(), db.getAllUsers()]);
    const admins = users.filter((u) => u.role === "admin");

    const rolesWithCounts = roles.map((r) => ({
      ...r,
      admins: admins.filter((u) => (u.adminRoleId || SUPER_ADMIN_ROLE_ID) === r.id).length,
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        roles: rolesWithCounts,
        admins: admins.map((u) => toAdminView(u, roles, ctx.user?.id)),
        permissions: PERMISSIONS,
        me: {
          id: ctx.user?.id ?? null,
          roleId: ctx.role?.id ?? SUPER_ADMIN_ROLE_ID,
          isSuper: ctx.isSuper,
        },
      },
    });
  } catch {
    return bad("Failed to load roles", 500);
  }
}

/** POST /api/admin/roles — create a custom role (Super Admin only) */
export async function POST(req: NextRequest) {
  try {
    const gate = await requirePermission(req, "roles", { superOnly: true });
    if (gate.response) return gate.response;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return bad("Invalid JSON body");
    }

    const parsed = parseRoleFields(body, true);
    if (!parsed.ok) return bad(parsed.error);
    const f = parsed.value;

    const roles = await db.getAdminRoles();
    if (roles.some((r) => r.id === f.id)) return bad("A role with that ID already exists", 409);
    if (roles.some((r) => r.name.toLowerCase() === f.name!.toLowerCase())) {
      return bad("A role with that name already exists", 409);
    }

    const role: AdminRole = {
      id: f.id!,
      name: f.name!,
      description: f.description ?? "",
      permissions: f.permissions ?? [],
      system: false, // only the built-in Super Admin is a system role
      readOnly: f.readOnly ?? false,
      active: f.active ?? true,
      createdAt: new Date().toISOString(),
    };

    await db.saveAdminRoles([...roles, role]);
    return NextResponse.json<ApiResponse>({ success: true, data: { ...role, admins: 0 } });
  } catch {
    return bad("Failed to create role", 500);
  }
}