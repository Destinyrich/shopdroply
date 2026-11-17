"use client";

import { useState, useEffect } from "react";
import type { PayoutRecord } from "@/lib/db-interface";

// ─── Types ─────────────────────────────────────────────────────────
type PayoutStatus = PayoutRecord["status"];
type FilterKey = "all" | PayoutStatus;
type PayoutAction = "approve" | "reject" | "retry";

/** A payout as the page displays it (built from the API record by fromApi). */
type PayoutRow = {
  id: string;
  seller: string;
  bank: string;
  account: string; // masked, e.g. ****1234
  amount: number;
  fee: number;
  net: number;
  status: PayoutStatus;
  requested: string;
  processed: string | null;
  failReason: string | null;
};

type StatusCfg = { label: string; color: string; bg: string; border: string; icon: string };
type ApiList = { success: boolean; data?: PayoutRecord[]; error?: string };
type ApiOne = { success: boolean; data?: PayoutRecord; error?: string };

// ─── Design Tokens ─────────────────────────────────────────────────
const C = {
  orange:       "#F97316", orangeLight:  "#FFF7ED", orangeBorder: "#FED7AA",
  green:        "#16A34A", greenLight:   "#F0FDF4", greenBorder:  "#BBF7D0",
  red:          "#DC2626", redLight:     "#FEF2F2", redBorder:    "#FECACA",
  amber:        "#D97706", amberLight:   "#FFFBEB", amberBorder:  "#FDE68A",
  blue:         "#2563EB", blueLight:    "#EFF6FF", blueBorder:   "#BFDBFE",
  purple:       "#7C3AED", purpleLight:  "#F5F3FF",
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
  .payout-row{display:grid;grid-template-columns:2fr 1fr 120px 120px 140px 140px;gap:16px;padding:14px 16px;align-items:center;border-bottom:1px solid #F3F4F6;transition:background 0.15s;}
  .payout-row:hover{background:#F9FAFB;}
  .status-pill{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;}
  @media(max-width:768px){.payout-row{grid-template-columns:1fr!important;gap:8px;padding:12px;}.admin-sidebar{display:none!important;}.admin-main{margin-left:0!important;}.stats-row{grid-template-columns:repeat(2,1fr)!important;}}
`;

const STATUS_CONFIG: Record<PayoutStatus, StatusCfg> = {
  pending:    { label: "Pending",    color: C.amber,  bg: C.amberLight,  border: C.amberBorder,  icon: "⏳" },
  processing: { label: "Processing", color: C.blue,   bg: C.blueLight,   border: C.blueBorder,   icon: "🔄" },
  completed:  { label: "Completed",  color: C.green,  bg: C.greenLight,  border: C.greenBorder,  icon: "✅" },
  failed:     { label: "Failed",     color: C.red,    bg: C.redLight,    border: C.redBorder,    icon: "❌" },
};

function AdminSidebar({ pendingCount }: { pendingCount: number }) {
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
          { id: "escrow", label: "Escrow", icon: "🛡️" },
          { id: "disputes", label: "Disputes", icon: "⚠️" },
          { id: "payouts", label: "Payouts", icon: "💰", active: true },
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
            {item.id === "payouts" && pendingCount > 0 && <span style={{ marginLeft: "auto", background: C.amber, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>{pendingCount}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function PayoutDetailModal({ payout, onClose, onApprove, onReject, acting }: {
  payout: PayoutRow | null;
  onClose: () => void;
  onApprove: (id: string) => Promise<boolean>;
  onReject: (id: string) => Promise<boolean>;
  acting: boolean;
}) {
  if (!payout) return null;
  const sc = STATUS_CONFIG[payout.status];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div className="scale-in" style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div><div style={{ fontSize: 17, fontWeight: 800, color: C.text, fontFamily: FONT }}>Payout details</div><div style={{ fontSize: 12, color: C.textSub }}>{payout.id}</div></div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textLight }}>✕</button>
        </div>

        <div style={{ background: sc.bg, border: `1.5px solid ${sc.border}`, borderRadius: 10, padding: "10px 14px", display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 18 }}>{sc.icon}</span><span style={{ fontSize: 13, fontWeight: 700, color: sc.color }}>{sc.label}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: C.textSub }}>Seller</span><span style={{ color: C.text, fontWeight: 600 }}>{payout.seller}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: C.textSub }}>Bank</span><span style={{ color: C.text, fontWeight: 600 }}>{payout.bank} · {payout.account}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: C.textSub }}>Requested</span><span style={{ color: C.text, fontWeight: 600 }}>{payout.requested}</span></div>
          {payout.processed && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: C.textSub }}>Processed</span><span style={{ color: C.green, fontWeight: 600 }}>{payout.processed}</span></div>}
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}><span style={{ color: C.textSub }}>Gross amount</span><span style={{ color: C.text, fontWeight: 600 }}>₦{payout.amount.toLocaleString()}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}><span style={{ color: C.textSub }}>Platform fee (5%)</span><span style={{ color: C.red, fontWeight: 600 }}>−₦{payout.fee.toLocaleString()}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800, color: C.text, fontFamily: FONT, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
            <span>Net payout</span><span style={{ color: C.green }}>₦{payout.net.toLocaleString()}</span>
          </div>
        </div>

        {payout.failReason && (
          <div style={{ background: C.redLight, border: `1.5px solid ${C.redBorder}`, borderRadius: 8, padding: "10px 12px", marginBottom: 20, fontSize: 13, color: C.red, fontWeight: 600 }}>
            ❌ Failure reason: {payout.failReason}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {payout.status === "pending" && (
            <>
              <button className="btn-green" style={{ flex: 1, padding: "12px", fontSize: 14, opacity: acting ? 0.6 : 1 }} disabled={acting} onClick={async () => { const ok = await onApprove(payout.id); if (ok) onClose(); }}>{acting ? "Working…" : "✅ Approve & process"}</button>
              <button className="btn-red" style={{ flex: 1, padding: "12px", fontSize: 14, opacity: acting ? 0.6 : 1 }} disabled={acting} onClick={async () => { const ok = await onReject(payout.id); if (ok) onClose(); }}>{acting ? "Working…" : "❌ Reject"}</button>
            </>
          )}
          {payout.status === "processing" && (
            <div style={{ width: "100%", textAlign: "center", padding: "12px", fontSize: 14, color: C.blue, fontWeight: 700, background: C.blueLight, borderRadius: 10, border: `1px solid ${C.blueBorder}` }}>🔄 Processing — NIBSS transfer in progress</div>
          )}
          {payout.status === "completed" && (
            <div style={{ width: "100%", textAlign: "center", padding: "12px", fontSize: 14, color: C.green, fontWeight: 700, background: C.greenLight, borderRadius: 10, border: `1px solid ${C.greenBorder}` }}>✅ Completed — funds transferred</div>
          )}
          {payout.status === "failed" && (
            <button className="btn-orange" style={{ width: "100%", padding: "12px", fontSize: 14, opacity: acting ? 0.6 : 1 }} disabled={acting} onClick={async () => { const ok = await onApprove(payout.id); if (ok) onClose(); }}>{acting ? "Working…" : "🔄 Retry payout"}</button>
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

// Map API PayoutRecord -> UI shape
function fromApi(p: PayoutRecord): PayoutRow {
  return {
    id: p.id,
    seller: p.sellerName || p.sellerId,
    bank: p.bankName,
    account: "****" + String(p.accountNumber || "").slice(-4),
    amount: p.amount,
    fee: p.fee ?? 0,
    net: p.net ?? p.amount,
    status: p.status,
    requested: timeAgo(p.createdAt),
    processed: p.processedAt ? timeAgo(p.processedAt) : null,
    failReason: p.failReason || null,
  };
}

export default function PayoutManagementScreen() {
  const [filter, setFilter] = useState<FilterKey>("pending");
  const [search, setSearch] = useState("");
  const [selectedPayout, setSelectedPayout] = useState<PayoutRow | null>(null);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    loadPayouts();
  }, []);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/payouts");
      const data: ApiList = await res.json();
      if (data.success && data.data) setPayouts(data.data.map(fromApi));
      else setToast(data.error || "Failed to load payouts");
    } catch {
      setToast("Failed to load payouts");
    } finally {
      setLoading(false);
    }
  };

  const filtered = payouts.filter(p => {
    if (filter !== "all" && p.status !== filter) return false;
    if (search && !p.seller.toLowerCase().includes(search.toLowerCase()) && !p.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: payouts.length,
    pending: payouts.filter(p => p.status === "pending").length,
    processing: payouts.filter(p => p.status === "processing").length,
    completed: payouts.filter(p => p.status === "completed").length,
    failed: payouts.filter(p => p.status === "failed").length,
  };

  const totalPending = payouts.filter(p => p.status === "pending").reduce((a, p) => a + p.net, 0);

  const runAction = async (id: string, action: PayoutAction): Promise<boolean> => {
    setActing(true);
    try {
      const res = await fetch(`/api/admin/payouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data: ApiOne = await res.json();
      if (!data.success || !data.data) {
        setToast(data.error || "Action failed");
        return false;
      }
      const updated = fromApi(data.data);
      setPayouts(prev => prev.map(p => p.id === id ? updated : p));
      return true;
    } catch {
      setToast("Action failed");
      return false;
    } finally {
      setActing(false);
    }
  };

  // Same button calls this for both "approve" (pending -> processing) and
  // "retry" (failed -> processing) since the UI reuses one button/handler.
  const handleApprove = (id: string) => {
    const current = payouts.find(p => p.id === id);
    return runAction(id, current?.status === "failed" ? "retry" : "approve");
  };
  const handleReject = (id: string) => runAction(id, "reject");

  if (loading) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <div className="sdp-admin-scope" style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
          <AdminSidebar pendingCount={0} />
          <main className="admin-main" style={{ marginLeft: 260, flex: 1, padding: 24, color: C.textSub, fontSize: 14 }}>
            Loading payouts…
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 600, background: "#fff", border: `1.5px solid ${C.redBorder}`, color: C.red, padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 18px rgba(0,0,0,0.1)" }}>
          ⚠️ {toast}
          <button onClick={() => setToast("")} style={{ marginLeft: 10, background: "none", border: "none", cursor: "pointer", color: C.textLight }}>✕</button>
        </div>
      )}
      {selectedPayout && (
        <PayoutDetailModal payout={selectedPayout} onClose={() => setSelectedPayout(null)} onApprove={handleApprove} onReject={handleReject} acting={acting} />
      )}
      <div className="sdp-admin-scope" style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
        <AdminSidebar pendingCount={counts.pending} />
        <main className="admin-main" style={{ marginLeft: 260, flex: 1, minWidth: 0 }}>
          <header style={{ height: 64, background: "#fff", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 50 }}>
            <div><h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, fontFamily: FONT }}>Payout management</h1></div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ background: C.amberLight, border: `1px solid ${C.amberBorder}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: C.amber }}>
                💰 ₦{totalPending.toLocaleString()} pending approval
              </div>
              <button className="btn-ghost" style={{ padding: "8px 16px", fontSize: 13 }}>📥 Export</button>
            </div>
          </header>

          <div style={{ padding: "24px", maxWidth: 1300 }}>
            {/* Stats */}
            <div className="stats-row" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { label: "TOTAL", count: counts.all, color: C.text },
                { label: "PENDING", count: counts.pending, color: C.amber },
                { label: "PROCESSING", count: counts.processing, color: C.blue },
                { label: "COMPLETED", count: counts.completed, color: C.green },
                { label: "FAILED", count: counts.failed, color: C.red },
              ].map((s, i) => (
                <div key={i} style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
                  <div style={{ fontSize: 11, color: C.textSub, fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: FONT }}>{s.count}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${C.border}`, marginBottom: 16, overflowX: "auto" }}>
              {([
                { key: "all", label: "All" },
                { key: "pending", label: "Pending" },
                { key: "processing", label: "Processing" },
                { key: "completed", label: "Completed" },
                { key: "failed", label: "Failed" },
              ] as const).map(tab => (
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
                <input className="sdp-input" style={{ paddingLeft: 38 }} placeholder="Search by seller or payout ID..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            {/* Payouts table */}
            <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div className="payout-row" style={{ background: C.bg, padding: "10px 16px", fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <div>Seller</div><div>Bank</div><div>Amount</div><div>Net</div><div>Status</div><div style={{ textAlign: "right" }}>Actions</div>
              </div>
              {filtered.map((p, i) => {
                const sc = STATUS_CONFIG[p.status];
                return (
                  <div key={p.id} className="payout-row fade-up" style={{ animationDelay: `${i * 0.03}s`, cursor: "pointer" }} onClick={() => setSelectedPayout(p)}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.seller}</div>
                      <div style={{ fontSize: 11, color: C.textSub }}>{p.id} · {p.requested}</div>
                    </div>
                    <div style={{ fontSize: 13, color: C.text }}>{p.bank}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: FONT }}>₦{p.amount.toLocaleString()}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.green, fontFamily: FONT }}>₦{p.net.toLocaleString()}</div>
                    <div><span className="status-pill" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{sc.icon} {sc.label}</span></div>
                    <div style={{ textAlign: "right" }}>
                      {p.status === "pending" && (
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button className="btn-green" style={{ padding: "5px 10px", fontSize: 11 }} onClick={e => { e.stopPropagation(); handleApprove(p.id); }}>✅</button>
                          <button className="btn-red" style={{ padding: "5px 10px", fontSize: 11 }} onClick={e => { e.stopPropagation(); handleReject(p.id); }}>❌</button>
                        </div>
                      )}
                      {p.status === "failed" && (
                        <button className="btn-orange" style={{ padding: "5px 12px", fontSize: 11 }} onClick={e => { e.stopPropagation(); handleApprove(p.id); }}>🔄 Retry</button>
                      )}
                      {p.status === "processing" && <span style={{ fontSize: 12, color: C.blue, fontWeight: 600 }}>Processing</span>}
                      {p.status === "completed" && <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>Done</span>}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", color: C.textSub, fontSize: 14 }}>No payouts match your filters</div>}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}