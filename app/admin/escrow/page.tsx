"use client";

import { useState, useEffect } from "react";

// ─── Design Tokens ─────────────────────────────────────────────────
const C = {
  orange:       "#F97316", orangeLight:  "#FFF7ED", orangeBorder: "#FED7AA",
  green:        "#16A34A", greenLight:   "#F0FDF4", greenBorder:  "#BBF7D0",
  red:          "#DC2626", redLight:     "#FEF2F2", redBorder:    "#FECACA",
  amber:        "#D97706", amberLight:   "#FFFBEB", amberBorder:  "#FDE68A",
  blue:         "#2563EB", blueLight:    "#EFF6FF", blueBorder:   "#BFDBFE",
  purple:       "#7C3AED", purpleLight:  "#F5F3FF", purpleBorder: "#DDD6FE",
  bg:           "#F9FAFB", surface:      "#FFFFFF", border:       "#E5E7EB",
  text:         "#1A1A1A", textMid:      "#374151", textSub:      "#6B7280", textLight: "#9CA3AF",
};
const FONT = "'Plus Jakarta Sans', sans-serif";

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  .sdp-admin-scope,.sdp-admin-scope *{box-sizing:border-box;}
  .sdp-admin-scope{font-family:'Plus Jakarta Sans',sans-serif;-webkit-font-smoothing:antialiased;}
  .sdp-admin-scope button,.sdp-admin-scope input,.sdp-admin-scope select{font-family:'Plus Jakarta Sans',sans-serif;}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
  @keyframes scaleIn{from{opacity:0;transform:scale(0.92);}to{opacity:1;transform:scale(1);}}
  .fade-up{animation:fadeUp 0.35s ease both;}
  .scale-in{animation:scaleIn 0.3s ease both;}
  .btn-orange{background:#F97316;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;transition:all 0.15s;display:inline-flex;align-items:center;justify-content:center;gap:8px;}
  .btn-orange:hover{background:#EA6C0A;transform:translateY(-1px);box-shadow:0 4px 18px rgba(249,115,22,0.28);}
  .btn-green{background:#16A34A;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;transition:all 0.15s;display:inline-flex;align-items:center;justify-content:center;gap:8px;}
  .btn-green:hover{background:#15803D;transform:translateY(-1px);}
  .btn-red{background:#FEF2F2;color:#DC2626;border:1.5px solid #FECACA;border-radius:10px;font-weight:600;cursor:pointer;transition:all 0.15s;display:inline-flex;align-items:center;justify-content:center;gap:6px;}
  .btn-red:hover{background:#DC2626;color:#fff;}
  .btn-ghost{background:#fff;border:1.5px solid #E5E7EB;border-radius:10px;color:#374151;font-weight:600;cursor:pointer;transition:all 0.15s;display:inline-flex;align-items:center;justify-content:center;gap:6px;}
  .btn-ghost:hover{border-color:#F97316;color:#F97316;background:#FFF7ED;}
  .sdp-input{width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:14px;color:#1A1A1A;outline:none;transition:border-color 0.15s,box-shadow 0.15s;background:#fff;}
  .sdp-input:focus{border-color:#F97316;box-shadow:0 0 0 3px rgba(249,115,22,0.1);}
  .escrow-row{display:grid;grid-template-columns:1.8fr 1fr 1fr 110px 120px 130px 140px;gap:16px;padding:14px 16px;align-items:center;border-bottom:1px solid #F3F4F6;transition:background 0.15s;}
  .escrow-row:hover{background:#F9FAFB;}
  .status-pill{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;}
  @media(max-width:900px){.escrow-row{grid-template-columns:1fr 1fr;gap:8px;padding:12px;}.admin-sidebar{display:none!important;}.admin-main{margin-left:0!important;}.stats-row{grid-template-columns:repeat(2,1fr)!important;}}
`;

const STATUS_CONFIG = {
  pending:   { label: "Held",      color: C.amber,  bg: C.amberLight,  border: C.amberBorder,  icon: "🛡️" },
  disputed:  { label: "Disputed",  color: C.red,    bg: C.redLight,    border: C.redBorder,    icon: "⚠️" },
  released:  { label: "Released",  color: C.green,  bg: C.greenLight,  border: C.greenBorder,  icon: "✅" },
  refunded:  { label: "Refunded",  color: C.blue,   bg: C.blueLight,   border: C.blueBorder,   icon: "↩️" },
};

const TABS = [
  { key: "all",      label: "All" },
  { key: "pending",  label: "Held" },
  { key: "disputed", label: "Disputed" },
  { key: "released", label: "Released" },
  { key: "refunded", label: "Refunded" },
] as const;

// Only funds still held can be moved
const isHeld = (r: { status: string }) => r.status === "pending" || r.status === "disputed";

function AdminSidebar({ heldCount }: { heldCount: number }) {
  return (
    <aside className="admin-sidebar" style={{ width: 260, minHeight: "100vh", background: "#1A1A1A", position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 100, overflowY: "auto", padding: "20px 0" }}>
      <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #333" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: FONT }}>shop<span style={{ color: C.orange }}>droply</span></div>
        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>Admin Control Center</div>
      </div>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #333" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 12 }}>SA</div>
          <div><div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Super Admin</div><div style={{ fontSize: 11, color: "#9CA3AF" }}>Full access</div></div>
        </div>
      </div>
      <nav style={{ padding: "12px 0" }}>
        {[
          { id: "dashboard", label: "Dashboard", icon: "📊" },
          { id: "users", label: "Users", icon: "👥" },
          { id: "kyc", label: "Seller KYC", icon: "🪪" },
          { id: "listings", label: "Listings", icon: "📦" },
          { id: "orders", label: "Orders", icon: "🛒" },
          { id: "escrow", label: "Escrow", icon: "🛡️", active: true },
          { id: "disputes", label: "Disputes", icon: "⚠️" },
          { id: "payouts", label: "Payouts", icon: "💰" },
          { id: "fees", label: "Fees & Commission", icon: "📋" },
          { id: "shipping", label: "Shipping", icon: "🚚" },
          { id: "categories", label: "Categories", icon: "🏷️" },
          { id: "reviews", label: "Reviews", icon: "⭐" },
          { id: "cms", label: "CMS & Banners", icon: "🎨" },
          { id: "reports", label: "Reports", icon: "📈" },
          { id: "roles", label: "Roles", icon: "🔐" },
        ].map(item => (
          <button key={item.id} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 20px", border: "none", background: item.active ? "rgba(249,115,22,0.15)" : "transparent", color: item.active ? C.orange : "#9CA3AF", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", textAlign: "left", borderRight: item.active ? `3px solid ${C.orange}` : "3px solid transparent" }}>
            <span style={{ fontSize: 15 }}>{item.icon}</span>{item.label}
            {item.id === "escrow" && heldCount > 0 && <span style={{ marginLeft: "auto", background: C.amber, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>{heldCount}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}

type EscrowRecord = {
  id: string;
  orderId: string;
  buyerName: string;
  sellerName: string;
  amount: number;
  status: keyof typeof STATUS_CONFIG;
  time: string;
};

function EscrowDetailModal({ record, onClose, onAction, acting }: {
  record: EscrowRecord | null;
  onClose: () => void;
  onAction: (id: string, action: "release" | "refund" | "hold") => Promise<boolean>;
  acting: boolean;
}) {
  if (!record) return null;
  const sc = STATUS_CONFIG[record.status];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div className="scale-in" style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div><div style={{ fontSize: 17, fontWeight: 800, color: C.text, fontFamily: FONT }}>Escrow record</div><div style={{ fontSize: 12, color: C.textSub }}>{record.id}</div></div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textLight }}>✕</button>
        </div>

        <div style={{ background: sc.bg, border: `1.5px solid ${sc.border}`, borderRadius: 10, padding: "10px 14px", display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 18 }}>{sc.icon}</span><span style={{ fontSize: 13, fontWeight: 700, color: sc.color }}>{sc.label}</span>
        </div>

        {/* Flow diagram: buyer -> platform -> seller */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 15, marginBottom: 2 }}>🧑</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{record.buyerName}</div>
            <div style={{ fontSize: 10, color: C.textSub }}>Buyer</div>
          </div>
          <div style={{ fontSize: 16, color: C.textLight }}>→</div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 15, marginBottom: 2 }}>🛡️</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.orange }}>shopdroply</div>
            <div style={{ fontSize: 10, color: C.textSub }}>Holding</div>
          </div>
          <div style={{ fontSize: 16, color: C.textLight }}>{isHeld(record) ? "⏸" : record.status === "released" ? "→" : "↩"}</div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 15, marginBottom: 2 }}>🏪</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{record.sellerName}</div>
            <div style={{ fontSize: 10, color: C.textSub }}>Seller</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: C.textSub }}>Order</span><span style={{ color: C.text, fontWeight: 600 }}>{record.orderId}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: C.textSub }}>Created</span><span style={{ color: C.text, fontWeight: 600 }}>{record.time}</span></div>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}><span style={{ color: C.textSub }}>Amount held</span><span style={{ color: C.text, fontWeight: 600 }}>₦{record.amount.toLocaleString()}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}><span style={{ color: C.textLight }}>Commission on release (4–12% by category)</span><span style={{ color: C.textSub, fontWeight: 600 }}>deducted at payout</span></div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {isHeld(record) ? (
            <>
              <button className="btn-green" style={{ flex: 1, padding: "12px", fontSize: 13, opacity: acting ? 0.6 : 1 }} disabled={acting}
                onClick={async () => { if (window.confirm(`Release ₦${record.amount.toLocaleString()} to ${record.sellerName}?`)) { const ok = await onAction(record.id, "release"); if (ok) onClose(); } }}>
                {acting ? "Working…" : "✅ Release to seller"}
              </button>
              <button className="btn-red" style={{ flex: 1, padding: "12px", fontSize: 13, opacity: acting ? 0.6 : 1 }} disabled={acting}
                onClick={async () => { if (window.confirm(`Refund ₦${record.amount.toLocaleString()} to ${record.buyerName}?`)) { const ok = await onAction(record.id, "refund"); if (ok) onClose(); } }}>
                {acting ? "Working…" : "↩️ Refund buyer"}
              </button>
              {record.status === "pending" && (
                <button className="btn-ghost" style={{ width: "100%", padding: "12px", fontSize: 13, opacity: acting ? 0.6 : 1 }} disabled={acting}
                  onClick={async () => { const ok = await onAction(record.id, "hold"); if (ok) onClose(); }}>
                  ⚠️ Flag as disputed (hold funds)
                </button>
              )}
            </>
          ) : (
            <div style={{ width: "100%", textAlign: "center", padding: "12px", fontSize: 14, fontWeight: 700, background: sc.bg, borderRadius: 10, border: `1px solid ${sc.border}`, color: sc.color }}>
              {sc.icon} Funds {sc.label.toLowerCase()} — no action available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diffMs / 3600000);
  if (hrs < 1) return "Just now";
  if (hrs < 24) return `Today ${new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

// Map API EscrowRecord (enriched) -> UI shape
function fromApi(e: any) {
  return {
    id: e.id,
    orderId: e.orderId,
    buyerName: e.buyerName || e.buyerId,
    sellerName: e.sellerName || e.sellerId,
    amount: e.amount ?? 0,
    status: e.status,
    createdAt: e.createdAt,
    time: timeAgo(e.createdAt),
  };
}

type ToastState = {
  msg: string;
  type: "success" | "error";
} | null;

export default function AdminEscrowScreen() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<EscrowRecord | null>(null);
  const [records, setRecords] = useState<EscrowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/escrow");
      const data = await res.json();
      if (data.success) setRecords(data.data.map(fromApi));
      else setToast({ msg: data.error || "Failed to load escrow records", type: "error" });
    } catch {
      setToast({ msg: "Failed to load escrow records", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const counts = {
    all: records.length,
    pending: records.filter(r => r.status === "pending").length,
    disputed: records.filter(r => r.status === "disputed").length,
    released: records.filter(r => r.status === "released").length,
    refunded: records.filter(r => r.status === "refunded").length,
  };

  const heldTotal = records.filter(r => r.status === "pending").reduce((a, r) => a + r.amount, 0);
  const disputedTotal = records.filter(r => r.status === "disputed").reduce((a, r) => a + r.amount, 0);

  const filtered = records.filter(r => {
    if (filter !== "all" && r.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hit = r.id.toLowerCase().includes(q)
        || r.orderId.toLowerCase().includes(q)
        || r.buyerName.toLowerCase().includes(q)
        || r.sellerName.toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });

  const runAction = async (id: string, action: "release" | "refund" | "hold") => {
    setActing(true);
    try {
      const res = await fetch(`/api/admin/escrow/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!data.success) {
        setToast({ msg: data.error || "Action failed", type: "error" });
        return false;
      }
      const updated = fromApi(data.data);
      setRecords(prev => prev.map(r => r.id === id ? { ...updated, buyerName: r.buyerName, sellerName: r.sellerName, time: r.time } : r));
      setToast({ msg: `Escrow ${action === "hold" ? "flagged as disputed" : action + "d"}`, type: "success" });
      return true;
    } catch {
      setToast({ msg: "Action failed", type: "error" });
      return false;
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <div className="sdp-admin-scope" style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
          <AdminSidebar heldCount={0} />
          <main className="admin-main" style={{ marginLeft: 260, flex: 1, padding: 24, color: C.textSub, fontSize: 14 }}>
            Loading escrow records…
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 600, background: "#fff", border: `1.5px solid ${toast.type === "error" ? C.redBorder : C.greenBorder}`, color: toast.type === "error" ? C.red : C.green, padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 18px rgba(0,0,0,0.1)" }}>
          {toast.type === "error" ? "⚠️" : "✅"} {toast.msg}
          <button onClick={() => setToast(null)} style={{ marginLeft: 10, background: "none", border: "none", cursor: "pointer", color: C.textLight }}>✕</button>
        </div>
      )}
      {selectedRecord && (
        <EscrowDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} onAction={runAction} acting={acting} />
      )}
      <div className="sdp-admin-scope" style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
        <AdminSidebar heldCount={counts.pending} />
        <main className="admin-main" style={{ marginLeft: 260, flex: 1, minWidth: 0 }}>
          <header style={{ height: 64, background: "#fff", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 50 }}>
            <div><h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, fontFamily: FONT }}>Escrow management</h1></div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ background: C.amberLight, border: `1px solid ${C.amberBorder}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: C.amber }}>
                🛡️ ₦{heldTotal.toLocaleString()} held
              </div>
              {counts.disputed > 0 && (
                <div style={{ background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: C.red }}>
                  ⚠️ ₦{disputedTotal.toLocaleString()} disputed
                </div>
              )}
              <button className="btn-ghost" style={{ padding: "8px 16px", fontSize: 13 }}>📥 Export</button>
            </div>
          </header>

          <div style={{ padding: "24px", maxWidth: 1300 }}>
            {/* Stats */}
            <div className="stats-row" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { label: "HELD", value: heldTotal, color: C.amber, format: (v: number) => `₦${v.toLocaleString()}` },
                { label: "HELD RECORDS", value: counts.pending, color: C.amber, format: (v: number) => v.toString() },
                { label: "RELEASED", value: counts.released, color: C.green, format: (v: number) => v.toString() },
                { label: "DISPUTED", value: counts.disputed, color: C.red, format: (v: number) => v.toString() },
                { label: "REFUNDED", value: counts.refunded, color: C.blue, format: (v: number) => v.toString() },
              ].map((s, i) => {
                const numericValue = typeof s.value === "number" ? s.value : Number(String(s.value).replace(/[^\d.-]/g, ""));
                return (
                  <div key={i} style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
                    <div style={{ fontSize: 11, color: C.textSub, fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: numericValue > 999 ? 20 : 26, fontWeight: 800, color: s.color, fontFamily: FONT }}>{s.format(s.value)}</div>
                  </div>
                );
              })}
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${C.border}`, marginBottom: 16, overflowX: "auto" }}>
              {TABS.map(tab => (
                <button key={tab.key} onClick={() => setFilter(tab.key)} style={{ padding: "12px 18px", border: "none", background: "transparent", color: filter === tab.key ? C.orange : C.textSub, fontSize: 14, fontWeight: 600, cursor: "pointer", borderBottom: `2px solid ${filter === tab.key ? C.orange : "transparent"}`, marginBottom: -2, whiteSpace: "nowrap", transition: "all 0.15s" }}>
                  {tab.label}
                  <span style={{ marginLeft: 8, background: filter === tab.key ? C.orange : C.bg, color: filter === tab.key ? "#fff" : C.textSub, fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>{counts[tab.key]}</span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ position: "relative", maxWidth: 400 }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: C.textLight }}>🔍</span>
                <input className="sdp-input" style={{ paddingLeft: 38 }} placeholder="Search by record ID, order, buyer or seller…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            {/* Escrow table */}
            <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div className="escrow-row" style={{ background: C.bg, padding: "10px 16px", fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <div>Record / Order</div><div>Buyer</div><div>Seller</div><div>Amount</div><div>Age</div><div>Status</div><div style={{ textAlign: "right" }}>Actions</div>
              </div>
              {filtered.map((r, i) => {
                const sc = STATUS_CONFIG[r.status];
                return (
                  <div key={r.id} className="escrow-row fade-up" style={{ animationDelay: `${i * 0.03}s`, cursor: "pointer" }} onClick={() => setSelectedRecord(r)}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{r.id}</div>
                      <div style={{ fontSize: 11, color: C.textSub }}>{r.orderId}</div>
                    </div>
                    <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{r.buyerName}</div>
                    <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{r.sellerName}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: FONT }}>₦{r.amount.toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: C.textSub }}>{r.time}</div>
                    <div><span className="status-pill" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{sc.icon} {sc.label}</span></div>
                    <div style={{ textAlign: "right" }} onClick={e => e.stopPropagation()}>
                      {isHeld(r) ? (
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button className="btn-green" style={{ padding: "5px 10px", fontSize: 11 }} title="Release to seller" onClick={() => { if (window.confirm(`Release ₦${r.amount.toLocaleString()} to ${r.sellerName}?`)) runAction(r.id, "release"); }}>✅</button>
                          <button className="btn-red" style={{ padding: "5px 10px", fontSize: 11 }} title="Refund buyer" onClick={() => { if (window.confirm(`Refund ₦${r.amount.toLocaleString()} to ${r.buyerName}?`)) runAction(r.id, "refund"); }}>↩️</button>
                          {r.status === "pending" && (
                            <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} title="Flag as disputed" onClick={() => runAction(r.id, "hold")}>⚠️</button>
                          )}
                        </div>
                      ) : (
                        <button className="btn-ghost" style={{ padding: "5px 12px", fontSize: 11 }} onClick={() => setSelectedRecord(r)}>View</button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", color: C.textSub, fontSize: 14 }}>No escrow records match your filters</div>}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}