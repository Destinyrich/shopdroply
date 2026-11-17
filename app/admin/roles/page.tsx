"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import AdminSidebar from "@/components/admin/Sidebar";
import type { AdminRole } from "@/lib/db-interface";
import type { AdminView } from "@/lib/admin-roles";

// ─── Design Tokens ─────────────────────────────────────────────────
const C = {
  orange: "#F97316", orangeLight: "#FFF7ED", orangeBorder: "#FED7AA",
  green: "#16A34A", greenLight: "#F0FDF4", greenBorder: "#BBF7D0",
  red: "#DC2626", redLight: "#FEF2F2", redBorder: "#FECACA",
  amber: "#D97706", amberLight: "#FFFBEB", amberBorder: "#FDE68A",
  blue: "#2563EB", blueLight: "#EFF6FF", blueBorder: "#BFDBFE",
  purple: "#7C3AED", purpleLight: "#F5F3FF", purpleBorder: "#DDD6FE",
  bg: "#F9FAFB", border: "#E5E7EB",
  text: "#1A1A1A", textMid: "#374151", textSub: "#6B7280", textLight: "#9CA3AF",
};
const FONT = "'Plus Jakarta Sans', sans-serif";

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  .sdp-admin-scope,.sdp-admin-scope *{box-sizing:border-box;}
  .sdp-admin-scope{font-family:'Plus Jakarta Sans',sans-serif;-webkit-font-smoothing:antialiased;}
  .sdp-admin-scope button,.sdp-admin-scope input,.sdp-admin-scope select,.sdp-admin-scope textarea{font-family:'Plus Jakarta Sans',sans-serif;}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
  @keyframes scaleIn{from{opacity:0;transform:scale(0.92);}to{opacity:1;transform:scale(1);}}
  .fade-up{animation:fadeUp 0.35s ease both;}
  .scale-in{animation:scaleIn 0.3s ease both;}
  .btn-orange{background:#F97316;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;transition:all 0.15s;display:inline-flex;align-items:center;justify-content:center;gap:8px;}
  .btn-orange:hover:not(:disabled){background:#EA6C0A;transform:translateY(-1px);box-shadow:0 4px 18px rgba(249,115,22,0.28);}
  .btn-orange:disabled{opacity:.5;cursor:not-allowed;}
  .btn-ghost{background:#fff;border:1.5px solid #E5E7EB;border-radius:10px;color:#374151;font-weight:600;cursor:pointer;transition:all 0.15s;display:inline-flex;align-items:center;justify-content:center;gap:6px;}
  .btn-ghost:hover:not(:disabled){border-color:#F97316;color:#F97316;background:#FFF7ED;}
  .btn-ghost:disabled{opacity:.45;cursor:not-allowed;}
  .btn-red{background:#FEF2F2;color:#DC2626;border:1.5px solid #FECACA;border-radius:10px;font-weight:600;cursor:pointer;transition:all 0.15s;display:inline-flex;align-items:center;justify-content:center;gap:6px;}
  .btn-red:hover:not(:disabled){background:#DC2626;color:#fff;}
  .btn-red:disabled{opacity:.45;cursor:not-allowed;}
  .sdp-input{width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:14px;color:#1A1A1A;outline:none;transition:border-color 0.15s,box-shadow 0.15s;background:#fff;}
  .sdp-input:focus{border-color:#F97316;box-shadow:0 0 0 3px rgba(249,115,22,0.1);}
  .sdp-input:disabled{background:#F9FAFB;color:#6B7280;cursor:not-allowed;}
  .role-row{display:grid;grid-template-columns:2fr 1.5fr 80px 150px 120px 110px;gap:16px;padding:14px 16px;align-items:center;border-bottom:1px solid #F3F4F6;transition:background 0.15s;}
  .role-row:hover{background:#F9FAFB;}
  .admin-row{display:grid;grid-template-columns:2fr 1.3fr 110px 130px 140px;gap:16px;padding:14px 16px;align-items:center;border-bottom:1px solid #F3F4F6;transition:background 0.15s;}
  .admin-row:hover{background:#F9FAFB;}
  .status-pill{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;}
  .perm-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
  .perm-cell{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:8px;border:1.5px solid #E5E7EB;background:#fff;cursor:pointer;transition:all 0.15s;user-select:none;}
  .perm-cell:hover{border-color:#F97316;}
  .perm-cell.active{border-color:#16A34A;background:#F0FDF4;}
  .perm-cell.active .perm-dot{background:#16A34A;}
  .perm-cell.locked{cursor:default;opacity:.8;}
  .perm-dot{width:10px;height:10px;border-radius:50%;background:#E5E7EB;transition:background 0.15s;flex-shrink:0;}
  .switch{width:40px;height:22px;border-radius:20px;border:none;cursor:pointer;position:relative;transition:background 0.2s;flex-shrink:0;padding:0;}
  .switch .knob{position:absolute;top:2px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.25);}
  @media(max-width:900px){.role-row,.admin-row{grid-template-columns:1fr!important;gap:8px;padding:12px;}.role-head,.admin-head{display:none!important;}.admin-sidebar{display:none!important;}.admin-main{margin-left:0!important;}.stats-row{grid-template-columns:repeat(2,1fr)!important;}.perm-grid{grid-template-columns:repeat(2,1fr)!important;}}
`;

// ─── Types ─────────────────────────────────────────────────────────
type PermissionDef = { id: string; label: string; category: string };
type RoleRow = AdminRole & { admins: number };
type Me = { id: string | null; roleId?: string; isSuper: boolean };
type RoleForm = Pick<AdminRole, "id" | "name" | "description" | "permissions" | "readOnly" | "active">;
type Toast = { msg: string; type: "success" | "error" };
type Tab = "roles" | "admins";
type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };
type RolesPayload = { roles: RoleRow[]; admins: AdminView[]; permissions: PermissionDef[]; me: Me };

// ─── Helpers ───────────────────────────────────────────────────────
async function api<T = unknown>(url: string, method = "GET", body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) return { ok: false, error: json.error || `Request failed (${res.status})` };
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, error: "Network error — please try again" };
  }
}

const slugify = (s: string) => s.toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—");
const initials = (name?: string) => (name || "?").split(/\s+/).map((n) => n[0]).slice(0, 2).join("").toUpperCase();
const timeAgo = (iso?: string | null) => {
  if (!iso) return "—";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} hr ago`;
  return fmtDate(iso);
};

function Toggle({ on, onClick, disabled, title }: { on: boolean; onClick: () => void; disabled?: boolean; title?: string }) {
  return (
    <button className="switch" onClick={onClick} disabled={disabled} title={title}
      style={{ background: on ? C.green : "#D1D5DB", opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
      <span className="knob" style={{ left: on ? 20 : 2 }} />
    </button>
  );
}



const Label = ({ children }: { children: ReactNode }) => (
  <label style={{ fontSize: 13, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>{children}</label>
);

// ─── Role modal (create / edit / view-only for system roles) ───────
function RoleModal({ role, permissions, canEdit, saving, onClose, onSave }: {
  role: RoleRow | null;
  permissions: PermissionDef[];
  canEdit: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (form: RoleForm) => void;
}) {
  const creating = !role;
  const locked = !creating && (role.system || !canEdit);
  const [initial] = useState<RoleForm>(() => role
    ? { id: role.id, name: role.name, description: role.description, permissions: [...role.permissions], readOnly: role.readOnly, active: role.active }
    : { id: "", name: "", description: "", permissions: [], readOnly: false, active: true });
  const [form, setForm] = useState(initial);
  const [idTouched, setIdTouched] = useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const tryClose = () => { if (!dirty || window.confirm("Discard your changes?")) onClose(); };

  const categories = Array.from(new Set(permissions.map((p) => p.category)));
  const togglePerm = (id: string) => {
    if (locked) return;
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(id) ? prev.permissions.filter((p: string) => p !== id) : [...prev.permissions, id],
    }));
  };
  const toggleCategory = (cat: string) => {
    if (locked) return;
    const ids = permissions.filter((p) => p.category === cat).map((p) => p.id);
    const allOn = ids.every((id) => form.permissions.includes(id));
    setForm((prev) => ({
      ...prev,
      permissions: allOn ? prev.permissions.filter((p: string) => !ids.includes(p)) : Array.from(new Set([...prev.permissions, ...ids])),
    }));
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={tryClose}>
      <div className="scale-in" style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 640, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text, fontFamily: FONT }}>
            {creating ? "Create new role" : locked ? `${role.name} — view only` : "Edit role"}
          </div>
          <button onClick={tryClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textLight }}>✕</button>
        </div>

        {!creating && role.system && (
          <div style={{ background: C.purpleLight, border: `1.5px solid ${C.purpleBorder}`, color: C.purple, borderRadius: 10, padding: 12, fontSize: 13, marginBottom: 16 }}>
            🔒 System roles can't be edited or deleted. Super Admin always has every permission.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Label>Role name</Label>
              <input className="sdp-input" value={form.name} disabled={locked} maxLength={40} placeholder="e.g. Finance Manager"
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((prev) => ({ ...prev, name, id: creating && !idTouched ? slugify(name) : prev.id }));
                }} />
            </div>
            <div>
              <Label>Role ID (slug)</Label>
              <input className="sdp-input" value={form.id} disabled={!creating} placeholder="finance-manager"
                onChange={(e) => { setIdTouched(true); setForm((prev) => ({ ...prev, id: e.target.value.toLowerCase() })); }} />
              {!creating && <div style={{ fontSize: 11, color: C.textSub, marginTop: 4 }}>The ID can't be changed after creation</div>}
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <textarea className="sdp-input" style={{ minHeight: 60, resize: "vertical" }} value={form.description} disabled={locked} maxLength={200}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="What this role can do..." />
          </div>

          <div>
            <Label>Permissions ({form.permissions.length} of {permissions.length} selected)</Label>
            {categories.map((cat) => (
              <div key={cat} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em" }}>{cat}</div>
                  {!locked && (
                    <button onClick={() => toggleCategory(cat)} style={{ background: "none", border: "none", color: C.orange, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      {permissions.filter((p) => p.category === cat).every((p) => form.permissions.includes(p.id)) ? "Clear" : "Select all"}
                    </button>
                  )}
                </div>
                <div className="perm-grid">
                  {permissions.filter((p) => p.category === cat).map((p) => (
                    <div key={p.id} className={`perm-cell${form.permissions.includes(p.id) ? " active" : ""}${locked ? " locked" : ""}`} onClick={() => togglePerm(p.id)}>
                      <div className="perm-dot" />
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Toggle on={form.readOnly} disabled={locked} onClick={() => setForm((prev) => ({ ...prev, readOnly: !prev.readOnly }))} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.textMid }}>Read-only</div>
                <div style={{ fontSize: 11, color: C.textSub }}>Can view these screens but not change anything</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Toggle on={form.active} disabled={locked} onClick={() => setForm((prev) => ({ ...prev, active: !prev.active }))} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.textMid }}>Active role</div>
                <div style={{ fontSize: 11, color: C.textSub }}>Inactive roles can't be assigned</div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            {!locked && (
              <button className="btn-orange" disabled={saving || !form.name.trim() || (creating && !form.id.trim())} style={{ flex: 1, padding: 12, fontSize: 14 }}
                onClick={() => onSave(form)}>
                {saving ? "Saving…" : `💾 ${creating ? "Create role" : "Save changes"}`}
              </button>
            )}
            <button className="btn-ghost" style={{ padding: "12px 20px", fontSize: 14, flex: locked ? 1 : undefined }} onClick={tryClose}>{locked ? "Close" : "Cancel"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Admin modal (add by email / change role) ──────────────────────
function AdminModal({ admin, roles, saving, onClose, onSave }: {
  admin: AdminView | null;
  roles: RoleRow[];
  saving: boolean;
  onClose: () => void;
  onSave: (v: { email: string; roleId: string }) => void;
}) {
  const creating = !admin;
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState(admin?.roleId || "");
  const assignable = roles.filter((r) => r.active || r.id === admin?.roleId);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div className="scale-in" style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 480, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text, fontFamily: FONT }}>{creating ? "Add admin" : "Change role"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textLight }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {creating ? (
            <div>
              <Label>Email address</Label>
              <input className="sdp-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoFocus />
              <div style={{ fontSize: 11, color: C.textSub, marginTop: 6, lineHeight: 1.5 }}>
                They need an existing, verified Shopdroply account. Their access starts immediately after you add them.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, background: C.bg, borderRadius: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 12 }}>{initials(admin.name)}</div>
              <div><div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{admin.name}</div><div style={{ fontSize: 12, color: C.textSub }}>{admin.email}</div></div>
            </div>
          )}

          <div>
            <Label>Role</Label>
            <select className="sdp-input" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
              <option value="">Select a role...</option>
              {assignable.map((r) => <option key={r.id} value={r.id}>{r.name}{r.readOnly ? " (read-only)" : ""}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button className="btn-orange" disabled={saving || !roleId || (creating && !email.trim()) || (!creating && roleId === admin.roleId)}
              style={{ flex: 1, padding: 12, fontSize: 14 }} onClick={() => onSave({ email: email.trim(), roleId })}>
              {saving ? "Saving…" : creating ? "➕ Add admin" : "💾 Save changes"}
            </button>
            <button className="btn-ghost" style={{ padding: "12px 20px", fontSize: 14 }} onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────
export default function AdminRolesPage() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [admins, setAdmins] = useState<AdminView[]>([]);
  const [permissions, setPermissions] = useState<PermissionDef[]>([]);
  const [me, setMe] = useState<Me>({ id: null, isSuper: false });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("roles");
  const [search, setSearch] = useState("");
  const [modalRole, setModalRole] = useState<RoleRow | null | undefined>(undefined);   // undefined = closed, null = create, object = edit/view
  const [modalAdmin, setModalAdmin] = useState<AdminView | null | undefined>(undefined);

  const load = useCallback(async () => {
    const res = await api<RolesPayload>("/api/admin/roles");
    if (res.ok) {
      setRoles(res.data.roles);
      setAdmins(res.data.admins);
      setPermissions(res.data.permissions);
      setMe(res.data.me);
      setLoadError("");
    } else {
      setLoadError(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const ok = (msg: string) => setToast({ msg, type: "success" });
  const fail = (msg: string) => setToast({ msg, type: "error" });
  const canManage = !!me.isSuper;

  // ── Roles ──
  const handleSaveRole = async (form: RoleForm) => {
    setSaving(true);
    const res = modalRole
      ? await api(`/api/admin/roles/${modalRole.id}`, "PATCH", { name: form.name, description: form.description, permissions: form.permissions, readOnly: form.readOnly, active: form.active })
      : await api("/api/admin/roles", "POST", form);
    setSaving(false);
    if (!res.ok) return fail(res.error);
    setModalRole(undefined);
    ok(modalRole ? "Role updated" : "Role created");
    load();
  };

  const handleDeleteRole = async (r: RoleRow) => {
    if (!window.confirm(`Delete the "${r.name}" role? This can't be undone.`)) return;
    setBusyId(r.id);
    const res = await api(`/api/admin/roles/${r.id}`, "DELETE");
    setBusyId(null);
    if (!res.ok) return fail(res.error);
    ok("Role deleted");
    load();
  };

  // ── Admins ──
  const handleSaveAdmin = async ({ email, roleId }: { email: string; roleId: string }) => {
    setSaving(true);
    const res = modalAdmin
      ? await api(`/api/admin/admins/${modalAdmin.id}`, "PATCH", { roleId })
      : await api("/api/admin/admins", "POST", { email, roleId });
    setSaving(false);
    if (!res.ok) return fail(res.error);
    setModalAdmin(undefined);
    ok(modalAdmin ? "Role changed" : "Admin added");
    load();
  };

  const handleToggleAdmin = async (a: AdminView) => {
    setBusyId(a.id);
    const res = await api(`/api/admin/admins/${a.id}`, "PATCH", { status: a.status === "active" ? "inactive" : "active" });
    setBusyId(null);
    if (!res.ok) return fail(res.error);
    ok(a.status === "active" ? `${a.name} deactivated` : `${a.name} activated`);
    load();
  };

  const handleRemoveAdmin = async (a: AdminView) => {
    if (!window.confirm(`Remove admin access for ${a.name}? Their account stays, but they lose the admin dashboard.`)) return;
    setBusyId(a.id);
    const res = await api(`/api/admin/admins/${a.id}`, "DELETE");
    setBusyId(null);
    if (!res.ok) return fail(res.error);
    ok("Admin access removed");
    load();
  };

  const exportAdmins = () => {
    const rows = [["Name", "Email", "Role", "Status", "Joined"], ...admins.map((a) => [a.name, a.email, a.roleName, a.status, fmtDate(a.joined)])];
    const csv = "\uFEFF" + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "admins.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const q = search.trim().toLowerCase();
  const filteredRoles = roles.filter((r) => !q || r.name.toLowerCase().includes(q) || r.id.includes(q));
  const filteredAdmins = admins.filter((a) => !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
  const activeAdmins = admins.filter((a) => a.status === "active").length;
  const customRoles = roles.filter((r) => !r.system).length;

  const shell = (children: ReactNode) => (
    <>
      <style>{GLOBAL_CSS}</style>
      <div className="sdp-admin-scope" style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
        <AdminSidebar activeTab={""} admin={null} mobileOpen={false} setMobileOpen={function (v: boolean): void {
          throw new Error("Function not implemented.");
        } } />
        {children}
      </div>
    </>
  );

  if (loading) {
    return shell(<main className="admin-main" style={{ marginLeft: 260, flex: 1, padding: 24, color: C.textSub, fontSize: 14 }}>Loading roles…</main>);
  }

  if (loadError) {
    return shell(
      <main className="admin-main" style={{ marginLeft: 260, flex: 1, padding: 24 }}>
        <div style={{ background: C.redLight, border: `1.5px solid ${C.redBorder}`, color: C.red, borderRadius: 12, padding: 18, fontSize: 14, maxWidth: 520 }}>
          ⚠️ {loadError}
          <div style={{ marginTop: 12 }}><button className="btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => { setLoading(true); load(); }}>Try again</button></div>
        </div>
      </main>
    );
  }

  const stats = [
    { label: "TOTAL ROLES", value: roles.length, color: C.orange },
    { label: "CUSTOM ROLES", value: customRoles, color: C.blue },
    { label: "ACTIVE ADMINS", value: activeAdmins, color: C.green },
    { label: "PERMISSIONS", value: permissions.length, color: C.purple },
  ];

  return shell(
    <>
      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 600, background: "#fff", border: `1.5px solid ${toast.type === "error" ? C.redBorder : C.greenBorder}`, color: toast.type === "error" ? C.red : C.green, padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 18px rgba(0,0,0,0.1)", maxWidth: 420 }}>
          {toast.type === "error" ? "⚠️" : "✅"} {toast.msg}
          <button onClick={() => setToast(null)} style={{ marginLeft: 10, background: "none", border: "none", cursor: "pointer", color: C.textLight }}>✕</button>
        </div>
      )}

      {modalRole !== undefined && (
        <RoleModal role={modalRole} permissions={permissions} canEdit={canManage} saving={saving} onClose={() => setModalRole(undefined)} onSave={handleSaveRole} />
      )}
      {modalAdmin !== undefined && (
        <AdminModal admin={modalAdmin} roles={roles} saving={saving} onClose={() => setModalAdmin(undefined)} onSave={handleSaveAdmin} />
      )}

      <main className="admin-main" style={{ marginLeft: 260, flex: 1, minWidth: 0 }}>
        <header style={{ height: 64, background: "#fff", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 50 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, fontFamily: FONT }}>Admin roles & permissions</h1>
          <button className="btn-ghost" style={{ padding: "8px 16px", fontSize: 13 }} onClick={exportAdmins} disabled={admins.length === 0}>📥 Export admins</button>
        </header>

        <div style={{ padding: 24, maxWidth: 1200 }}>
          {!canManage && (
            <div style={{ background: C.amberLight, border: `1.5px solid ${C.amberBorder}`, borderRadius: 10, padding: 12, fontSize: 13, color: "#92400E", marginBottom: 16 }}>
              👀 You can view roles and admins, but only Super Admins can change them.
            </div>
          )}

          <div className="stats-row" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 11, color: C.textSub, fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: FONT }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", borderBottom: `2px solid ${C.border}`, overflowX: "auto" }}>
              {([{ key: "roles", label: "Roles & permissions" }, { key: "admins", label: "Admin users" }] as const).map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: "12px 18px", border: "none", background: "transparent", color: activeTab === tab.key ? C.orange : C.textSub, fontSize: 14, fontWeight: 600, cursor: "pointer", borderBottom: `2px solid ${activeTab === tab.key ? C.orange : "transparent"}`, marginBottom: -2, whiteSpace: "nowrap" }}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ position: "relative", maxWidth: 240, minWidth: 180 }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: C.textLight }}>🔍</span>
                <input className="sdp-input" style={{ paddingLeft: 38 }} placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              {canManage && activeTab === "roles" && <button className="btn-orange" onClick={() => setModalRole(null)} style={{ padding: "9px 16px", fontSize: 13 }}>+ New role</button>}
              {canManage && activeTab === "admins" && <button className="btn-orange" onClick={() => setModalAdmin(null)} style={{ padding: "9px 16px", fontSize: 13 }}>+ Add admin</button>}
            </div>
          </div>

          {/* ───── Roles tab ───── */}
          {activeTab === "roles" && (
            <>
              <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
                <div className="role-row role-head" style={{ background: C.bg, padding: "10px 16px", fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  <div>Role</div><div>Description</div><div>Admins</div><div>Permissions</div><div>Type</div><div style={{ textAlign: "right" }}>Actions</div>
                </div>
                {filteredRoles.map((r, i) => (
                  <div key={r.id} className="role-row fade-up" style={{ animationDelay: `${i * 0.03}s`, opacity: r.active ? 1 : 0.7 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: C.textSub }}>{r.id}</div>
                    </div>
                    <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5 }}>{r.description || "—"}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: FONT }}>{r.admins}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.orange, background: C.orangeLight, padding: "3px 10px", borderRadius: 20, border: `1px solid ${C.orangeBorder}` }}>
                        {r.permissions.length} / {permissions.length}
                      </span>
                      {r.readOnly && <span style={{ fontSize: 11, fontWeight: 700, color: C.amber, background: C.amberLight, padding: "3px 8px", borderRadius: 20, border: `1px solid ${C.amberBorder}` }}>👁 read-only</span>}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <span className="status-pill" style={{ background: r.system ? C.purpleLight : C.blueLight, color: r.system ? C.purple : C.blue, border: `1px solid ${r.system ? C.purpleBorder : C.blueBorder}` }}>
                        {r.system ? "🔒 System" : "🔓 Custom"}
                      </span>
                      {!r.active && <span className="status-pill" style={{ background: C.redLight, color: C.red, border: `1px solid ${C.redBorder}` }}>inactive</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => setModalRole(r)} title={r.system || !canManage ? "View" : "Edit"}>
                        {r.system || !canManage ? "👁" : "✏️"}
                      </button>
                      {canManage && !r.system && (
                        <button className="btn-red" disabled={busyId === r.id} style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => handleDeleteRole(r)} title="Delete">🗑️</button>
                      )}
                    </div>
                  </div>
                ))}
                {filteredRoles.length === 0 && <div style={{ padding: 24, fontSize: 13, color: C.textSub }}>No roles match your search.</div>}
              </div>

              <div style={{ marginTop: 24, background: C.blueLight, border: `1.5px solid ${C.blueBorder}`, borderRadius: 10, padding: 14, fontSize: 13, color: "#1E40AF", lineHeight: 1.6 }}>
                ℹ️ <strong>System roles</strong> (Super Admin) can't be deleted or modified. Custom roles can use any combination of the {permissions.length} permissions — each one controls access to one admin area. A <strong>read-only</strong> role can open its screens but can't make changes. A role can't be deleted or deactivated while admins are assigned to it. Changes apply to assigned admins immediately.
              </div>
            </>
          )}

          {/* ───── Admins tab ───── */}
          {activeTab === "admins" && (
            <>
              <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
                <div className="admin-row admin-head" style={{ background: C.bg, padding: "10px 16px", fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  <div>Admin</div><div>Role</div><div>Status</div><div>Last active</div><div style={{ textAlign: "right" }}>Actions</div>
                </div>
                {filteredAdmins.map((a, i) => (
                  <div key={a.id} className="admin-row fade-up" style={{ animationDelay: `${i * 0.03}s` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{initials(a.name)}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{a.name}{a.isYou && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: C.blue, background: C.blueLight, padding: "2px 6px", borderRadius: 10 }}>You</span>}</div>
                        <div style={{ fontSize: 11, color: C.textSub, overflow: "hidden", textOverflow: "ellipsis" }}>{a.email} · Joined {fmtDate(a.joined)}</div>
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.textMid, background: C.bg, padding: "3px 10px", borderRadius: 20, border: `1px solid ${C.border}` }}>{a.roleName}</span>
                    </div>
                    <div>
                      <span className="status-pill" style={{ background: a.status === "active" ? C.greenLight : C.redLight, color: a.status === "active" ? C.green : C.red, border: `1px solid ${a.status === "active" ? C.greenBorder : C.redBorder}` }}>
                        {a.status === "active" ? "🟢" : "🔴"} {a.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: C.textSub }}>{timeAgo(a.lastActive)}</div>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                      {canManage && !a.isYou ? (
                        <>
                          <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => setModalAdmin(a)} title="Change role">✏️</button>
                          <Toggle on={a.status === "active"} disabled={busyId === a.id} onClick={() => handleToggleAdmin(a)} title={a.status === "active" ? "Deactivate" : "Activate"} />
                          <button className="btn-red" disabled={busyId === a.id} style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => handleRemoveAdmin(a)} title="Remove admin access">🗑️</button>
                        </>
                      ) : (
                        <span style={{ fontSize: 11, color: C.textLight }}>{a.isYou ? "—" : ""}</span>
                      )}
                    </div>
                  </div>
                ))}
                {filteredAdmins.length === 0 && <div style={{ padding: 24, fontSize: 13, color: C.textSub }}>No admins match your search.</div>}
              </div>

              <div style={{ marginTop: 24, background: C.amberLight, border: `1.5px solid ${C.amberBorder}`, borderRadius: 10, padding: 14, fontSize: 13, color: "#92400E", lineHeight: 1.6 }}>
                ⚠️ <strong>Security note:</strong> Only Super Admins can add admins or change roles, and you can't change or remove your own access. At least one active Super Admin must always remain. Deactivated admins can't use the dashboard but keep their account. "Last active" appears once your login flow records it.
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}