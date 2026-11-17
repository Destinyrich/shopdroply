"use client";

import { useState, useEffect, type ReactNode } from "react";
import AdminSidebar from "@/components/admin/Sidebar";

// ─── Design Tokens ─────────────────────────────────────────────────
const C = {
  orange: "#F97316", orangeLight: "#FFF7ED", orangeBorder: "#FED7AA",
  green: "#16A34A", greenLight: "#F0FDF4", greenBorder: "#BBF7D0",
  red: "#DC2626", redLight: "#FEF2F2", redBorder: "#FECACA",
  amber: "#D97706", amberLight: "#FFFBEB", amberBorder: "#FDE68A",
  blue: "#2563EB", blueLight: "#EFF6FF", blueBorder: "#BFDBFE",
  purple: "#7C3AED", purpleLight: "#F5F3FF",
  bg: "#F9FAFB", border: "#E5E7EB",
  text: "#1A1A1A", textMid: "#374151", textSub: "#6B7280", textLight: "#9CA3AF",
};
const FONT = "'Plus Jakarta Sans', sans-serif";

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  .sdp-admin-scope,.sdp-admin-scope *{box-sizing:border-box;}
  .sdp-admin-scope{font-family:'Plus Jakarta Sans',sans-serif;-webkit-font-smoothing:antialiased;}
  .sdp-admin-scope button,.sdp-admin-scope input{font-family:'Plus Jakarta Sans',sans-serif;}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
  .fade-up{animation:fadeUp 0.35s ease both;}
  .btn-orange{background:#F97316;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;transition:all 0.15s;display:inline-flex;align-items:center;justify-content:center;gap:8px;}
  .btn-orange:hover:not(:disabled){background:#EA6C0A;transform:translateY(-1px);box-shadow:0 4px 18px rgba(249,115,22,0.28);}
  .btn-orange:disabled{opacity:.5;cursor:not-allowed;}
  .btn-ghost{background:#fff;border:1.5px solid #E5E7EB;border-radius:10px;color:#374151;font-weight:600;cursor:pointer;transition:all 0.15s;display:inline-flex;align-items:center;justify-content:center;gap:6px;}
  .btn-ghost:hover:not(:disabled){border-color:#F97316;color:#F97316;background:#FFF7ED;}
  .btn-ghost:disabled{opacity:.5;cursor:not-allowed;}
  .sdp-input{width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:14px;color:#1A1A1A;outline:none;transition:border-color 0.15s,box-shadow 0.15s;background:#fff;}
  .sdp-input:focus{border-color:#F97316;box-shadow:0 0 0 3px rgba(249,115,22,0.1);}
  .zone-row{display:grid;grid-template-columns:1.5fr 130px 80px 80px 1.3fr 60px;gap:16px;padding:14px 16px;align-items:center;border-bottom:1px solid #F3F4F6;transition:background 0.15s;}
  .zone-row:hover{background:#F9FAFB;}
  .courier-row{display:grid;grid-template-columns:2fr 1fr 110px 130px 60px;gap:16px;padding:14px 16px;align-items:center;border-bottom:1px solid #F3F4F6;transition:background 0.15s;}
  .courier-row:hover{background:#F9FAFB;}
  .status-pill{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;}
  .chip{font-size:11px;font-weight:600;padding:3px 8px;border-radius:6px;cursor:pointer;transition:all .15s;font-family:inherit;}
  .switch{width:40px;height:22px;border-radius:20px;border:none;cursor:pointer;position:relative;transition:background 0.2s;flex-shrink:0;padding:0;}
  .switch .knob{position:absolute;top:2px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.25);}
  .form-grid{display:grid;gap:8px;}
  @media(max-width:900px){.admin-sidebar{display:none!important;}.admin-main{margin-left:0!important;}.stats-row{grid-template-columns:repeat(2,1fr)!important;}.zone-row,.courier-row{grid-template-columns:1fr!important;gap:8px;padding:12px;}.zone-head,.courier-head{display:none!important;}.form-grid{grid-template-columns:1fr!important;}}
`;

// ─── Helpers ───────────────────────────────────────────────────────
const digits = (v: string) => v.replace(/\D/g, "");
const toNum = (v: string | number | null | undefined) => (v === "" || v === null || v === undefined ? NaN : Number(v));
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
const naira = (n: number | string | null | undefined) => `₦${(Number(n) || 0).toLocaleString()}`;

/** Turns the editable UI state into the exact shape the API expects. */
const toPayload = (couriers: Array<Record<string, any>>, zones: Array<Record<string, any>>) => ({
  couriers: couriers.map((c) => ({
    id: c.id, name: c.name.trim(), logo: c.logo, type: c.type.trim(),
    coverage: c.coverage.trim(), avgTime: c.avgTime.trim(), apiStatus: c.apiStatus, active: c.active,
  })),
  zones: zones.map((z) => ({
    id: z.id, name: z.name.trim(), description: (z.description || "").trim(),
    maxFee: toNum(z.maxFee), minDays: toNum(z.minDays), maxDays: toNum(z.maxDays),
    courierIds: z.courierIds, active: z.active,
  })),
});

/** Returns the first problem found, or null. Mirrors the server rules. */
function validate({ couriers, zones }: { couriers: Array<Record<string, any>>; zones: Array<Record<string, any>> }) {
  const seenC = new Set<string>();
  for (const c of couriers) {
    if (!c.name) return "Every courier needs a name";
    if (seenC.has(c.name.toLowerCase())) return `Duplicate courier: ${c.name}`;
    seenC.add(c.name.toLowerCase());
  }
  const seenZ = new Set<string>();
  for (const z of zones) {
    if (!z.name) return "Every zone needs a name";
    if (seenZ.has(z.name.toLowerCase())) return `Duplicate zone: ${z.name}`;
    seenZ.add(z.name.toLowerCase());
    if (!Number.isInteger(z.maxFee) || z.maxFee < 0) return `${z.name}: max fee must be a number ≥ 0`;
    if (!Number.isInteger(z.minDays) || !Number.isInteger(z.maxDays)) return `${z.name}: enter min and max days`;
    if (z.minDays > z.maxDays) return `${z.name}: min days can't be more than max days`;
  }
  return null;
}

// ─── Small components ──────────────────────────────────────────────
function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button className="switch" onClick={onClick} disabled={disabled}
      style={{ background: on ? C.green : "#D1D5DB", opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
      title={on ? "Active — visible to sellers" : "Inactive — hidden from sellers"}>
      <span className="knob" style={{ left: on ? 20 : 2 }} />
    </button>
  );
}



const EMPTY_ZONE = { name: "", description: "", maxFee: "", minDays: "1", maxDays: "3" };
const EMPTY_COURIER = { name: "", logo: "🚚", type: "", coverage: "", avgTime: "" };

// ─── Page ──────────────────────────────────────────────────────────
export default function AdminShippingScreen() {
  type ToastState = { msg: string; type: "error" | "success" };

  const [couriers, setCouriers] = useState<Array<Record<string, any>>>([]);
  const [zones, setZones] = useState<Array<Record<string, any>>>([]);
  const [snapshot, setSnapshot] = useState("");   // JSON of last-saved payload
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [tab, setTab] = useState("zones");
  const [showAddZone, setShowAddZone] = useState(false);
  const [showAddCourier, setShowAddCourier] = useState(false);
  const [newZone, setNewZone] = useState(EMPTY_ZONE);
  const [newCourier, setNewCourier] = useState(EMPTY_COURIER);

  type ShippingServerData = {
    couriers?: Array<Record<string, any>>;
    zones?: Array<Record<string, any>>;
  };

  // Server data → editable UI state (numbers become strings so inputs can be emptied)
  const applyServer = (data: ShippingServerData) => {
    const cs = (data.couriers || []).map((c) => ({ ...c }));
    const zs = (data.zones || []).map((z) => ({
      ...z, maxFee: String(z.maxFee), minDays: String(z.minDays), maxDays: String(z.maxDays),
    }));
    setCouriers(cs);
    setZones(zs);
    setSnapshot(JSON.stringify(toPayload(cs, zs)));
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/shipping");
      const data = await res.json();
      if (data.success) applyServer(data.data);
      else setToast({ msg: data.error || "Failed to load shipping settings", type: "error" });
    } catch {
      setToast({ msg: "Failed to load shipping settings", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSettings(); }, []);

  // auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const dirty = !loading && JSON.stringify(toPayload(couriers, zones)) !== snapshot;

  // warn before leaving with unsaved edits
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // ── Edits (local only until "Save all changes") ──
  const editZone = (id: string, field: string, value: any) =>
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, [field]: value } : z)));
  const editCourier = (id: string, field: string, value: any) =>
    setCouriers((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));

  const toggleZoneCourier = (zoneId: string, courierId: string) =>
    setZones((prev) => prev.map((z) => {
      if (z.id !== zoneId) return z;
      const has = z.courierIds.includes(courierId);
      return { ...z, courierIds: has ? z.courierIds.filter((x: string) => x !== courierId) : [...z.courierIds, courierId] };
    }));

  const addCourier = () => {
    const name = newCourier.name.trim();
    if (!name) return setToast({ msg: "Courier needs a name", type: "error" });
    if (couriers.some((c) => c.name.toLowerCase() === name.toLowerCase()))
      return setToast({ msg: "A courier with that name already exists", type: "error" });
    setCouriers((prev) => [...prev, {
      id: `courier-${slug(name)}-${Date.now().toString(36)}`, name,
      logo: newCourier.logo.trim() || "🚚", type: newCourier.type, coverage: newCourier.coverage,
      avgTime: newCourier.avgTime, apiStatus: "disconnected", active: false,
    }]);
    setNewCourier(EMPTY_COURIER);
    setShowAddCourier(false);
    setToast({ msg: `${name} added — click Save all changes`, type: "success" });
  };

  const addZone = () => {
    const name = newZone.name.trim();
    if (!name) return setToast({ msg: "Zone needs a name", type: "error" });
    if (zones.some((z) => z.name.toLowerCase() === name.toLowerCase()))
      return setToast({ msg: "A zone with that name already exists", type: "error" });
    setZones((prev) => [...prev, {
      id: `zone-${slug(name)}-${Date.now().toString(36)}`, name, description: newZone.description,
      maxFee: newZone.maxFee || "0", minDays: newZone.minDays || "1", maxDays: newZone.maxDays || "3",
      courierIds: [], active: false,
    }]);
    setNewZone(EMPTY_ZONE);
    setShowAddZone(false);
    setToast({ msg: `${name} added (off by default) — pick couriers, then save`, type: "success" });
  };

  // ── Save / discard ──
  const saveAll = async () => {
    const payload = toPayload(couriers, zones);
    const problem = validate(payload);
    if (problem) return setToast({ msg: problem, type: "error" });

    setSaving(true);
    try {
      const res = await fetch("/api/admin/shipping", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) return setToast({ msg: data.error || "Save failed", type: "error" });
      applyServer(data.data);
      setToast({ msg: "Shipping settings saved", type: "success" });
    } catch {
      setToast({ msg: "Save failed", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const discard = () => { if (snapshot) { const s = JSON.parse(snapshot); applyServer(s); } };

  // ── Derived ──
  const activeCouriers = couriers.filter((c) => c.active);
  const activeZones = zones.filter((z) => z.active);
  const connectedApis = couriers.filter((c) => c.apiStatus === "connected").length;
  const top = activeZones.reduce<Record<string, any> | null>(
    (best, z) => (toNum(z.maxFee) > (best ? toNum(best.maxFee) : -1) ? z : best),
    null,
  );
  const uncovered = activeZones.filter((z) => !z.courierIds.some((id: string) => couriers.find((c) => c.id === id)?.active));

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
    return shell(
      <main className="admin-main" style={{ marginLeft: 260, flex: 1, padding: 24, color: C.textSub, fontSize: 14 }}>
        Loading shipping settings…
      </main>
    );
  }

  const stats = [
    { label: "ACTIVE ZONES", value: `${activeZones.length} / ${zones.length}`, color: C.orange },
    { label: "ACTIVE COURIERS", value: `${activeCouriers.length} / ${couriers.length}`, color: C.green },
    { label: "APIs CONNECTED", value: connectedApis, color: C.blue },
    { label: "HIGHEST CAP", value: top ? naira(top.maxFee) : "₦0", color: C.purple, sub: top ? `${top.name} zone` : "No active zones" },
  ];

  const inputStyle = { fontSize: 13, padding: "8px 10px" };

  return shell(
    <>
      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 600, background: "#fff", border: `1.5px solid ${toast.type === "error" ? C.redBorder : C.greenBorder}`, color: toast.type === "error" ? C.red : C.green, padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 18px rgba(0,0,0,0.1)", maxWidth: 420 }}>
          {toast.type === "error" ? "⚠️" : "✅"} {toast.msg}
          <button onClick={() => setToast(null)} style={{ marginLeft: 10, background: "none", border: "none", cursor: "pointer", color: C.textLight }}>✕</button>
        </div>
      )}

      <main className="admin-main" style={{ marginLeft: 260, flex: 1, minWidth: 0 }}>
        <header style={{ height: 64, background: "#fff", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 50 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, fontFamily: FONT }}>Shipping zone & cap settings</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {dirty && (
              <span style={{ fontSize: 12, fontWeight: 700, color: C.amber, background: C.amberLight, border: `1px solid ${C.amberBorder}`, padding: "6px 12px", borderRadius: 20 }}>
                Unsaved changes
              </span>
            )}
            <button className="btn-ghost" onClick={discard} disabled={!dirty || saving} style={{ padding: "8px 16px", fontSize: 14 }}>Discard</button>
            <button className="btn-orange" onClick={saveAll} disabled={!dirty || saving} style={{ padding: "8px 20px", fontSize: 14 }}>
              {saving ? "Saving…" : "💾 Save all changes"}
            </button>
          </div>
        </header>

        <div style={{ padding: 24, maxWidth: 1250 }}>
          {/* Stats */}
          <div className="stats-row" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 11, color: C.textSub, fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: FONT }}>{s.value}</div>
                {s.sub && <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>{s.sub}</div>}
              </div>
            ))}
          </div>

          {/* Warning: active zone nobody can deliver to */}
          {uncovered.length > 0 && (
            <div style={{ background: C.redLight, border: `1.5px solid ${C.redBorder}`, borderRadius: 10, padding: 12, fontSize: 13, color: C.red, marginBottom: 16, lineHeight: 1.6 }}>
              ⚠️ No active courier is assigned to: <strong>{uncovered.map((z) => z.name).join(", ")}</strong>. Sellers won't be able to ship to these zones until you assign one.
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: `2px solid ${C.border}`, marginBottom: 24, overflowX: "auto" }}>
            {[{ key: "zones", label: "Delivery zones & caps" }, { key: "couriers", label: "Courier partners" }].map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "12px 18px", border: "none", background: "transparent", color: tab === t.key ? C.orange : C.textSub, fontSize: 14, fontWeight: 600, cursor: "pointer", borderBottom: `2px solid ${tab === t.key ? C.orange : "transparent"}`, marginBottom: -2, whiteSpace: "nowrap" }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ───────── ZONES TAB ───────── */}
          {tab === "zones" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Delivery zones & fee caps</div>
                <button className="btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setShowAddZone((v) => !v)}>
                  {showAddZone ? "Cancel" : "＋ Add zone"}
                </button>
              </div>

              {showAddZone && (
                <div className="form-grid fade-up" style={{ gridTemplateColumns: "1.3fr 2fr 1fr 0.7fr 0.7fr auto", background: "#fff", border: `1.5px solid ${C.orangeBorder}`, borderRadius: 14, padding: 14, marginBottom: 16, alignItems: "center" }}>
                  <input className="sdp-input" style={inputStyle} placeholder="Zone name" value={newZone.name} onChange={(e) => setNewZone((p) => ({ ...p, name: e.target.value }))} />
                  <input className="sdp-input" style={inputStyle} placeholder="Description" value={newZone.description} onChange={(e) => setNewZone((p) => ({ ...p, description: e.target.value }))} />
                  <input className="sdp-input" style={inputStyle} placeholder="Cap ₦" inputMode="numeric" value={newZone.maxFee} onChange={(e) => setNewZone((p) => ({ ...p, maxFee: digits(e.target.value) }))} />
                  <input className="sdp-input" style={inputStyle} placeholder="Min d" inputMode="numeric" value={newZone.minDays} onChange={(e) => setNewZone((p) => ({ ...p, minDays: digits(e.target.value) }))} />
                  <input className="sdp-input" style={inputStyle} placeholder="Max d" inputMode="numeric" value={newZone.maxDays} onChange={(e) => setNewZone((p) => ({ ...p, maxDays: digits(e.target.value) }))} />
                  <button className="btn-orange" style={{ padding: "9px 16px", fontSize: 13 }} onClick={addZone}>Add</button>
                </div>
              )}

              <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 24 }}>
                <div className="zone-row zone-head" style={{ background: C.bg, padding: "10px 16px", fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  <div>Zone</div><div>Max fee</div><div>Min days</div><div>Max days</div><div>Allowed couriers</div><div style={{ textAlign: "right" }}>Active</div>
                </div>

                {zones.map((z, i) => {
                  const feeBad = z.maxFee === "";
                  const daysBad = z.minDays === "" || z.maxDays === "" || toNum(z.minDays) > toNum(z.maxDays);
                  return (
                    <div key={z.id} className="zone-row fade-up" style={{ animationDelay: `${i * 0.04}s`, opacity: z.active ? 1 : 0.75 }}>
                      <div>
                        <input className="sdp-input" style={{ ...inputStyle, fontWeight: 600, marginBottom: 4 }} value={z.name} onChange={(e) => editZone(z.id, "name", e.target.value)} />
                        <input className="sdp-input" style={{ ...inputStyle, fontSize: 11, color: C.textSub, padding: "5px 10px" }} placeholder="Description" value={z.description} onChange={(e) => editZone(z.id, "description", e.target.value)} />
                      </div>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, fontWeight: 700, color: C.textMid }}>₦</span>
                        <input className="sdp-input" inputMode="numeric" style={{ ...inputStyle, paddingLeft: 24, borderColor: feeBad ? C.red : C.border }} value={z.maxFee} onChange={(e) => editZone(z.id, "maxFee", digits(e.target.value))} />
                      </div>
                      <input className="sdp-input" inputMode="numeric" style={{ ...inputStyle, textAlign: "center", borderColor: daysBad ? C.red : C.border }} value={z.minDays} onChange={(e) => editZone(z.id, "minDays", digits(e.target.value))} />
                      <input className="sdp-input" inputMode="numeric" style={{ ...inputStyle, textAlign: "center", borderColor: daysBad ? C.red : C.border }} value={z.maxDays} onChange={(e) => editZone(z.id, "maxDays", digits(e.target.value))} />
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {couriers.map((c) => {
                          const on = z.courierIds.includes(c.id);
                          return (
                            <button key={c.id} className="chip" onClick={() => toggleZoneCourier(z.id, c.id)}
                              title={on ? "Click to remove from this zone" : "Click to allow in this zone"}
                              style={{
                                color: on ? (c.active ? C.orange : C.textSub) : C.textLight,
                                background: on ? (c.active ? C.orangeLight : "#F3F4F6") : "#fff",
                                border: `1px ${on ? "solid" : "dashed"} ${on ? (c.active ? C.orangeBorder : C.border) : C.border}`,
                                textDecoration: c.active ? "none" : "line-through",
                              }}>
                              {c.logo} {c.name}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <Toggle on={z.active} onClick={() => editZone(z.id, "active", !z.active)} disabled={saving} />
                      </div>
                    </div>
                  );
                })}
                {zones.length === 0 && <div style={{ padding: 24, fontSize: 13, color: C.textSub }}>No zones yet — add one above.</div>}
              </div>

              <div style={{ background: C.amberLight, border: `1.5px solid ${C.amberBorder}`, borderRadius: 10, padding: 14, fontSize: 13, color: "#92400E", lineHeight: 1.6 }}>
                ⚠️ <strong>Important:</strong> The max fee cap is the highest amount a seller can charge buyers for shipping in each zone. Sellers can set fees from ₦0 (free shipping) up to this cap. Shopdroply takes zero commission on shipping — the full fee goes to the seller or courier. Struck-through couriers are switched off and won't be offered even if ticked here.
              </div>
            </>
          )}

          {/* ───────── COURIERS TAB ───────── */}
          {tab === "couriers" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Courier partner management</div>
                <button className="btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setShowAddCourier((v) => !v)}>
                  {showAddCourier ? "Cancel" : "＋ Add courier"}
                </button>
              </div>

              {showAddCourier && (
                <div className="form-grid fade-up" style={{ gridTemplateColumns: "60px 1.5fr 1.3fr 1.3fr 1fr auto", background: "#fff", border: `1.5px solid ${C.orangeBorder}`, borderRadius: 14, padding: 14, marginBottom: 16, alignItems: "center" }}>
                  <input className="sdp-input" style={{ ...inputStyle, textAlign: "center" }} placeholder="🚚" maxLength={4} value={newCourier.logo} onChange={(e) => setNewCourier((p) => ({ ...p, logo: e.target.value }))} />
                  <input className="sdp-input" style={inputStyle} placeholder="Courier name — e.g. Kobo360" value={newCourier.name} onChange={(e) => setNewCourier((p) => ({ ...p, name: e.target.value }))} />
                  <input className="sdp-input" style={inputStyle} placeholder="Type — e.g. Last-mile" value={newCourier.type} onChange={(e) => setNewCourier((p) => ({ ...p, type: e.target.value }))} />
                  <input className="sdp-input" style={inputStyle} placeholder="Coverage — e.g. Lagos only" value={newCourier.coverage} onChange={(e) => setNewCourier((p) => ({ ...p, coverage: e.target.value }))} />
                  <input className="sdp-input" style={inputStyle} placeholder="Avg time" value={newCourier.avgTime} onChange={(e) => setNewCourier((p) => ({ ...p, avgTime: e.target.value }))} />
                  <button className="btn-orange" style={{ padding: "9px 16px", fontSize: 13 }} onClick={addCourier}>Add</button>
                </div>
              )}

              <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 24 }}>
                <div className="courier-row courier-head" style={{ background: C.bg, padding: "10px 16px", fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  <div>Courier</div><div>Coverage</div><div>Avg time</div><div>API status</div><div style={{ textAlign: "right" }}>Active</div>
                </div>
                {couriers.map((c, i) => {
                  const connected = c.apiStatus === "connected";
                  return (
                    <div key={c.id} className="courier-row fade-up" style={{ animationDelay: `${i * 0.04}s`, opacity: c.active ? 1 : 0.75 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{c.logo}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <input className="sdp-input" style={{ ...inputStyle, fontWeight: 600, marginBottom: 4 }} value={c.name} onChange={(e) => editCourier(c.id, "name", e.target.value)} />
                          <input className="sdp-input" style={{ ...inputStyle, fontSize: 11, color: C.textSub, padding: "5px 10px" }} placeholder="Type" value={c.type} onChange={(e) => editCourier(c.id, "type", e.target.value)} />
                        </div>
                      </div>
                      <input className="sdp-input" style={inputStyle} placeholder="Coverage" value={c.coverage} onChange={(e) => editCourier(c.id, "coverage", e.target.value)} />
                      <input className="sdp-input" style={inputStyle} placeholder="Avg time" value={c.avgTime} onChange={(e) => editCourier(c.id, "avgTime", e.target.value)} />
                      <div>
                        <span className="status-pill" style={{
                          background: connected ? C.greenLight : C.redLight, color: connected ? C.green : C.red,
                          border: `1px solid ${connected ? C.greenBorder : C.redBorder}`,
                        }}>
                          {connected ? "🟢" : "🔴"} {c.apiStatus}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <Toggle on={c.active} onClick={() => editCourier(c.id, "active", !c.active)} disabled={saving} />
                      </div>
                    </div>
                  );
                })}
                {couriers.length === 0 && <div style={{ padding: 24, fontSize: 13, color: C.textSub }}>No couriers yet — add one above.</div>}
              </div>

              <div style={{ background: C.blueLight, border: `1.5px solid ${C.blueBorder}`, borderRadius: 10, padding: 14, fontSize: 13, color: "#1E40AF", lineHeight: 1.6 }}>
                ℹ️ <strong>API integration:</strong> Each courier requires a REST API key for rate quotes, booking, waybill generation, and webhook tracking. New couriers start as <em>disconnected</em> and switched off. To connect one, get sandbox credentials from the logistics provider and enter them in Developer settings.
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}