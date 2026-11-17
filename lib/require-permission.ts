// lib/require-permission.ts
// Drop-in upgrade for requireAdmin(): also checks the admin's ROLE.
//
//   const gate = await requirePermission(req, "reports");
//   if (gate.response) return gate.response;
//   const { ctx } = gate;            // ctx.user, ctx.role, ctx.isSuper
//
// Rules
//  • Admin with no role assigned (e.g. your existing admin@shopdroply.ng)
//    is treated as a Super Admin, so nobody is locked out.
//  • Suspended admins and admins whose role is inactive are refused.
//  • Read-only roles are refused on anything except GET/HEAD/OPTIONS.
//  • { superOnly: true } restricts the route to Super Admins.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { AdminRole, User } from "@/lib/db-interface";
import { SUPER_ADMIN_ROLE_ID, type PermissionId } from "@/lib/admin-roles";

export interface AdminContext {
  user: User | null; // null only if requireAdmin() doesn't expose who is logged in (see below)
  role: AdminRole | null; // null = legacy full-access admin
  isSuper: boolean;
}

type Gate =
  | { response: NextResponse; ctx?: undefined }
  | { response?: undefined; ctx: AdminContext };

const deny = (error: string, status: number): Gate => ({
  response: NextResponse.json({ success: false, error }, { status }),
});

/**
 * ⚠️ ONE LINE TO CHECK: this reads the logged-in admin's id from whatever
 * requireAdmin() returns. If your requireAdmin() returns the user under a
 * different key, add it here — otherwise role limits can't be applied and
 * every admin is treated as a Super Admin (a warning is logged).
 */
function pickUserId(auth: unknown): string | null {
  const a = auth as any;
  return a?.user?.id ?? a?.userId ?? a?.session?.userId ?? a?.admin?.id ?? a?.id ?? null;
}

let warned = false;

export async function requirePermission(
  req: NextRequest,
  permission: PermissionId | null,
  opts: { superOnly?: boolean } = {}
): Promise<Gate> {
  const auth = await requireAdmin(req);
  if (auth.response) return { response: auth.response };

  const userId = pickUserId(auth);
  if (!userId) {
    if (!warned) {
      warned = true;
      console.warn(
        "[requirePermission] requireAdmin() didn't expose the admin's id — role limits are NOT being enforced. Update pickUserId() in lib/require-permission.ts."
      );
    }
    return { ctx: { user: null, role: null, isSuper: true } };
  }

  const user = await db.findUserById(userId);
  if (!user || user.role !== "admin") return deny("Admin access required", 403);
  if (user.accountStatus === "suspended") return deny("Your admin account is inactive", 403);

  // Legacy admin (no role assigned) → full access
  if (!user.adminRoleId) return { ctx: { user, role: null, isSuper: true } };

  const role = (await db.getAdminRoles()).find((r) => r.id === user.adminRoleId);
  if (!role || !role.active) return deny("Your admin role is inactive — ask a Super Admin", 403);

  const isSuper = role.id === SUPER_ADMIN_ROLE_ID;
  const ctx: AdminContext = { user, role, isSuper };

  if (opts.superOnly && !isSuper) return deny("Only Super Admins can do this", 403);
  if (permission && !role.permissions.includes(permission)) {
    return deny("You don't have permission to access this area", 403);
  }
  if (role.readOnly && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return deny("Your role is read-only", 403);
  }

  return { ctx };
}
