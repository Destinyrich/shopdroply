// lib/admin-roles.ts
// Permission catalog, default roles, validation + helpers for Admin Roles.
// No Next.js imports — safe to use from db adapters.

import type { AdminRole, User } from "./db-interface";

// ─── Permission catalog (one permission = one admin screen) ───
export const PERMISSIONS = [
  { id: "dashboard", label: "Dashboard", category: "Overview" },
  { id: "users", label: "Users", category: "Users" },
  { id: "kyc", label: "Seller KYC", category: "Users" },
  { id: "listings", label: "Listings", category: "Commerce" },
  { id: "orders", label: "Orders", category: "Commerce" },
  { id: "escrow", label: "Escrow", category: "Finance" },
  { id: "disputes", label: "Disputes", category: "Support" },
  { id: "payouts", label: "Payouts", category: "Finance" },
  { id: "fees", label: "Fees & Commission", category: "Finance" },
  { id: "shipping", label: "Shipping", category: "Commerce" },
  { id: "categories", label: "Categories", category: "Commerce" },
  { id: "reviews", label: "Reviews", category: "Support" },
  { id: "cms", label: "CMS & Banners", category: "Marketing" },
  { id: "reports", label: "Reports", category: "Overview" },
  { id: "roles", label: "Roles & Permissions", category: "System" },
] as const;

export type PermissionId = (typeof PERMISSIONS)[number]["id"];
export const PERMISSION_IDS: string[] = PERMISSIONS.map((p) => p.id);
export const SUPER_ADMIN_ROLE_ID = "super-admin";

const SEED_DATE = "2025-11-01T00:00:00.000Z";

export const DEFAULT_ADMIN_ROLES: AdminRole[] = [
  { id: SUPER_ADMIN_ROLE_ID, name: "Super Admin", description: "Full platform access — cannot be deleted", permissions: [...PERMISSION_IDS], system: true, readOnly: false, active: true, createdAt: SEED_DATE },
  { id: "finance-manager", name: "Finance Manager", description: "Manages escrow, payouts, fees, and payment disputes", permissions: ["dashboard", "escrow", "payouts", "fees", "reports"], system: false, readOnly: false, active: true, createdAt: SEED_DATE },
  { id: "support-manager", name: "Support Manager", description: "Handles disputes, reviews, and user escalations", permissions: ["dashboard", "disputes", "reviews", "users", "reports"], system: false, readOnly: false, active: true, createdAt: SEED_DATE },
  { id: "content-manager", name: "Content Manager", description: "Manages listings, categories, CMS banners, and seller KYC", permissions: ["dashboard", "listings", "categories", "cms", "kyc", "reports"], system: false, readOnly: false, active: true, createdAt: SEED_DATE },
  { id: "logistics-manager", name: "Logistics Manager", description: "Oversees shipping, couriers, and delivery zones", permissions: ["dashboard", "orders", "shipping", "reports"], system: false, readOnly: false, active: true, createdAt: SEED_DATE },
  { id: "viewer", name: "Viewer (Read-only)", description: "Can view all data but cannot modify anything", permissions: [...PERMISSION_IDS], system: false, readOnly: true, active: false, createdAt: SEED_DATE },
];

/**
 * Cleans role data on every read. Guarantees the Super Admin role always
 * exists with every permission, so the platform can't be locked out.
 */
export function normalizeAdminRoles(raw?: Partial<AdminRole>[] | null): AdminRole[] {
  const src = raw && raw.length ? raw : DEFAULT_ADMIN_ROLES;
  const seen = new Set<string>();
  const roles: AdminRole[] = [];

  for (const r of src) {
    const id = String(r.id ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    roles.push({
      id,
      name: String(r.name ?? id),
      description: r.description ?? "",
      permissions: Array.from(new Set((r.permissions ?? []).filter((p) => PERMISSION_IDS.includes(p)))),
      system: !!r.system,
      readOnly: !!r.readOnly,
      active: r.active !== false,
      createdAt: r.createdAt ?? SEED_DATE,
    });
  }

  const i = roles.findIndex((r) => r.id === SUPER_ADMIN_ROLE_ID);
  const fixed: AdminRole = {
    ...(i >= 0 ? roles[i] : DEFAULT_ADMIN_ROLES[0]),
    system: true,
    active: true,
    readOnly: false,
    permissions: [...PERMISSION_IDS],
  };
  if (i >= 0) roles[i] = fixed;
  else roles.unshift(fixed);
  return roles;
}

// ─── Validation ───
type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

export function slugifyRoleId(name: string): string {
  return name.toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

/** Type-checks role fields. `id` is only accepted when creating. */
export function parseRoleFields(body: unknown, creating: boolean): Result<Partial<AdminRole>> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return fail("Invalid request body");
  const b = body as Record<string, unknown>;
  const out: Partial<AdminRole> = {};

  if (b.name !== undefined || creating) {
    if (typeof b.name !== "string" || !b.name.trim()) return fail("Role name is required");
    const name = b.name.trim().replace(/\s+/g, " ");
    if (name.length > 40) return fail("Role name must be 40 characters or fewer");
    out.name = name;
  }

  if (b.description !== undefined) {
    if (typeof b.description !== "string") return fail("Description must be text");
    if (b.description.trim().length > 200) return fail("Description must be 200 characters or fewer");
    out.description = b.description.trim();
  }

  if (b.permissions !== undefined) {
    if (!Array.isArray(b.permissions) || b.permissions.some((p) => typeof p !== "string")) {
      return fail("Permissions must be a list of permission ids");
    }
    const unknown = (b.permissions as string[]).find((p) => !PERMISSION_IDS.includes(p));
    if (unknown) return fail(`Unknown permission: ${unknown}`);
    out.permissions = Array.from(new Set(b.permissions as string[]));
  } else if (creating) {
    out.permissions = [];
  }

  for (const key of ["readOnly", "active"] as const) {
    if (b[key] !== undefined) {
      if (typeof b[key] !== "boolean") return fail(`${key} must be true or false`);
      out[key] = b[key] as boolean;
    }
  }

  if (creating) {
    const id = typeof b.id === "string" && b.id.trim() ? b.id.trim() : slugifyRoleId(out.name ?? "");
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) || id.length > 40) {
      return fail("Role ID can only contain lowercase letters, numbers and hyphens");
    }
    out.id = id;
  }

  return { ok: true, value: out };
}

// ─── Admin-user helpers ───
/** An admin with no assigned role is a legacy admin and keeps full access. */
export const isSuperUser = (u: User): boolean =>
  u.role === "admin" && (!u.adminRoleId || u.adminRoleId === SUPER_ADMIN_ROLE_ID);

/** Active Super Admins, not counting `excludeId` — used to prevent a lock-out. */
export const activeSuperCount = (users: User[], excludeId?: string): number =>
  users.filter((u) => isSuperUser(u) && u.accountStatus !== "suspended" && u.id !== excludeId).length;

export interface AdminView {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  status: "active" | "inactive";
  lastActive: string | null;
  joined: string;
  isYou: boolean;
}

/** Safe shape for the UI — never includes password, NIN, BVN, etc. */
export function toAdminView(u: User, roles: AdminRole[], meId?: string | null): AdminView {
  const roleId = u.adminRoleId || SUPER_ADMIN_ROLE_ID;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    roleId,
    roleName: roles.find((r) => r.id === roleId)?.name ?? roleId,
    status: u.accountStatus === "suspended" ? "inactive" : "active",
    lastActive: u.lastActiveAt ?? null,
    joined: u.adminSince ?? u.createdAt,
    isYou: !!meId && meId === u.id,
  };
}

// ═════════════════════════════════════════════════════════════
// Adapter snippets for lib/db-mongo-adapter.ts and lib/db-postgres-adapter.ts
// (the local adapter is already done). Adjust this.db / this.pool to your client.
//
// MONGO
//   async getAdminRoles() {
//     const doc = await this.db.collection("settings").findOne({ _id: "adminRoles" as any });
//     return normalizeAdminRoles((doc as any)?.roles);
//   }
//   async saveAdminRoles(roles: AdminRole[]) {
//     const next = normalizeAdminRoles(roles);
//     await this.db.collection("settings").updateOne(
//       { _id: "adminRoles" as any }, { $set: { roles: next, updatedAt: new Date() } }, { upsert: true });
//     return next;
//   }
//   async updateUser(id: string, data: Partial<User>) {
//     const set: any = {}, unset: any = {};
//     for (const [k, v] of Object.entries(data)) (v === undefined ? (unset[k] = "") : (set[k] = v));
//     const res = await this.db.collection("users").findOneAndUpdate(
//       { id }, { ...(Object.keys(set).length && { $set: set }), ...(Object.keys(unset).length && { $unset: unset }) },
//       { returnDocument: "after" });
//     return (res as any) ?? null;   // some driver versions return { value }
//   }
//
// POSTGRES
//   CREATE TABLE IF NOT EXISTS admin_roles_settings (
//     id TEXT PRIMARY KEY DEFAULT 'adminRoles', roles JSONB NOT NULL DEFAULT '[]', updated_at TIMESTAMPTZ DEFAULT now());
//   -- users table needs: admin_role_id TEXT, admin_prev_role TEXT, admin_since TIMESTAMPTZ, last_active_at TIMESTAMPTZ
//   async getAdminRoles() {
//     const { rows } = await this.pool.query("SELECT roles FROM admin_roles_settings WHERE id='adminRoles'");
//     return normalizeAdminRoles(rows[0]?.roles);
//   }
//   async saveAdminRoles(roles: AdminRole[]) {
//     const next = normalizeAdminRoles(roles);
//     await this.pool.query(
//       `INSERT INTO admin_roles_settings (id, roles) VALUES ('adminRoles', $1)
//        ON CONFLICT (id) DO UPDATE SET roles = $1, updated_at = now()`, [JSON.stringify(next)]);
//     return next;
//   }
//   // updateUser: build "UPDATE users SET col = $n, ... WHERE id = $1 RETURNING *" from the keys in `data`
//   // (map camelCase keys to your column names; use NULL for undefined to clear a field).
// ═════════════════════════════════════════════════════════════
