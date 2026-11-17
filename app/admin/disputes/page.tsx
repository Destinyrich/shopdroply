"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin/Sidebar";
import type { Dispute } from "@/lib/db-interface";

// ─── Types ─────────────────────────────────────────────────────────
type DisputeStatus = Dispute["status"];
type Priority = Dispute["priority"];
type FilterKey = "all" | DisputeStatus;

/** A dispute as the page displays it (built from the API record by fromApi). */
type DisputeRow = {
  id: string;
  orderId: string;
  buyer: string;
  seller: string;
  item: string;
  amount: number;
  reason: string;
  status: DisputeStatus;
  opened: string;
  priority: Priority;
  buyerEvidence: string[];
  sellerResponse: string;
  resolution: string | null;
};

type StatusCfg = { label: string; color: string; bg: string; border: string; icon: string };
type PriorityCfg = { label: string; color: string };
type ApiList = { success: boolean; data?: Dispute[]; error?: string };
type ApiOne = { success: boolean; data?: Dispute; error?: string };
// The row's quick ✓ / ⚠ buttons call these with only the id (see note in the hand-off).
type ResolveFn = (id: string, resolution?: string, notes?: string) => Promise<boolean>;
type EscalateFn = (id: string, notes?: string) => Promise<boolean>;

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
  .sdp-admin-scope button,.sdp-admin-scope input,.sdp-admin-scope select,.sdp-admin-scope textarea{font-family:'Plus Jakarta Sans',sans-serif;}
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
  .dispute-row{display:grid;grid-template-columns:2fr 1fr 120px 140px 160px;gap:16px;padding:14px 16px;align-items:center;border-bottom:1px solid #F3F4F6;transition:background 0.15s;}
  .dispute-row:hover{background:#F9FAFB;}
  .status-pill{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;}
  @media(max-width:768px){.dispute-row{grid-template-columns:1fr!important;gap:8px;padding:12px;}.admin-sidebar{display:none!important;}.admin-main{margin-left:0!important;}.stats-row{grid-template-columns:repeat(2,1fr)!important;}}
`;

const STATUS_CONFIG: Record<DisputeStatus, StatusCfg> = {
  open:     { label: "Open",     color: C.red,    bg: C.redLight,    border: C.redBorder,    icon: "⚠️" },
  resolved: { label: "Resolved", color: C.green,  bg: C.greenLight,  border: C.greenBorder,  icon: "✅" },
  escalated:{ label: "Escalated",color: C.purple, bg: C.purpleLight, border: "#DDD6FE",       icon: "🔴" },
};

const PRIORITY_CONFIG: Record<Priority, PriorityCfg> = {
  low:    { label: "Low",    color: C.green },
  medium: { label: "Medium", color: C.amber },
  high:   { label: "High",   color: C.red },
};



function DisputeDetailModal({ dispute, onClose, onResolve, onEscalate, resolving }: {
  dispute: DisputeRow | null;
  onClose: () => void;
  onResolve: ResolveFn;
  onEscalate: EscalateFn;
  resolving: boolean;
}) {
  const [resolutionChoice, setResolutionChoice] = useState("Refund full amount to buyer");
  const [notes, setNotes] = useState("");

  if (!dispute) return null;
  const sc = STATUS_CONFIG[dispute.status];
  const pc = PRIORITY_CONFIG[dispute.priority];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div className="scale-in" style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 580, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.text, fontFamily: FONT }}>Dispute resolution</div>
            <div style={{ fontSize: 12, color: C.textSub }}>{dispute.id} · Order {dispute.orderId}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textLight }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <div style={{ background: sc.bg, border: `1.5px solid ${sc.border}`, borderRadius: 10, padding: "8px 14px", display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 16 }}>{sc.icon}</span><span style={{ fontSize: 12, fontWeight: 700, color: sc.color }}>{sc.label}</span>
          </div>
          <div style={{ background: pc.color + "15", border: `1.5px solid ${pc.color}30`, borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700, color: pc.color }}>
            🔥 {pc.label} priority
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 20, padding: 14, background: C.bg, borderRadius: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>{dispute.item}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.orange, fontFamily: FONT }}>₦{dispute.amount.toLocaleString()}</div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Parties</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.textSub }}>Buyer</span><span style={{ color: C.text, fontWeight: 600 }}>{dispute.buyer}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.textSub }}>Seller</span><span style={{ color: C.text, fontWeight: 600 }}>{dispute.seller}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.textSub }}>Opened</span><span style={{ color: C.text, fontWeight: 600 }}>{dispute.opened}</span></div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Buyer claim</div>
          <div style={{ background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, color: C.red, fontWeight: 600, lineHeight: 1.5 }}>
            {dispute.reason}
          </div>
        </div>

        {dispute.sellerResponse && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Seller response</div>
            <div style={{ background: C.blueLight, border: `1px solid ${C.blueBorder}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, color: C.blue, fontWeight: 600, lineHeight: 1.5 }}>
              {dispute.sellerResponse}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Buyer evidence</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {dispute.buyerEvidence.map((ev, i) => (
              <div key={i} style={{ background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 12, color: C.textMid, display: "flex", alignItems: "center", gap: 6 }}>
                <span>📎</span>{ev}
              </div>
            ))}
          </div>
        </div>

        {dispute.resolution && (
          <div style={{ background: C.greenLight, border: `1.5px solid ${C.greenBorder}`, borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#166534", marginBottom: 4 }}>Resolution</div>
            <div style={{ fontSize: 13, color: "#166534", fontWeight: 600 }}>{dispute.resolution}</div>
          </div>
        )}

        {dispute.status === "open" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Resolution decision</label>
              <select className="sdp-input" value={resolutionChoice} onChange={e => setResolutionChoice(e.target.value)}>
                <option>Refund full amount to buyer</option>
                <option>Partial refund to buyer</option>
                <option>Release escrow to seller</option>
                <option>Return item + refund</option>
                <option>Reject claim — no action</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Admin notes (internal)</label>
              <textarea className="sdp-input" style={{ minHeight: 80, resize: "vertical" }} placeholder="Document your reasoning..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-green" style={{ flex: 2, padding: "12px", fontSize: 14, opacity: resolving ? 0.6 : 1 }} disabled={resolving} onClick={async () => { const ok = await onResolve(dispute.id, resolutionChoice, notes); if (ok) onClose(); }}>{resolving ? "Saving…" : "✅ Resolve dispute"}</button>
              <button className="btn-orange" style={{ flex: 1, padding: "12px", fontSize: 14, opacity: resolving ? 0.6 : 1 }} disabled={resolving} onClick={async () => { const ok = await onEscalate(dispute.id, notes); if (ok) onClose(); }}>{resolving ? "Saving…" : "🔴 Escalate"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

// Map API Dispute -> UI shape
function fromApi(d: Dispute): DisputeRow {
  return {
    id: d.id,
    orderId: d.orderId,
    buyer: d.buyerName,
    seller: d.sellerName,
    item: d.item,
    amount: d.amount,
    reason: d.reason,
    status: d.status,
    opened: timeAgo(d.createdAt),
    priority: d.priority,
    buyerEvidence: d.buyerEvidence || [],
    sellerResponse: d.sellerResponse || "",
    resolution: d.resolution || null,
  };
}

export default function AdminDisputesPage() {
  const [filter, setFilter] = useState<FilterKey>("open");
  const [search, setSearch] = useState("");
  const [selectedDispute, setSelectedDispute] = useState<DisputeRow | null>(null);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/disputes");
      const data: ApiList = await res.json();
      if (data.success && data.data) setDisputes(data.data.map(fromApi));
      else setToast(data.error || "Failed to load disputes");
    } catch {
      setToast("Failed to load disputes");
    } finally {
      setLoading(false);
    }
  };

  const filtered = disputes.filter(d => {
    if (filter !== "all" && d.status !== filter) return false;
    if (search && !d.buyer.toLowerCase().includes(search.toLowerCase()) && !d.seller.toLowerCase().includes(search.toLowerCase()) && !d.item.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: disputes.length,
    open: disputes.filter(d => d.status === "open").length,
    resolved: disputes.filter(d => d.status === "resolved").length,
    escalated: disputes.filter(d => d.status === "escalated").length,
  };

  // Returns true on success (so the modal knows whether to close)
  const handleResolve: ResolveFn = async (id, resolutionChoice, notes) => {
    setResolving(true);
    try {
      const res = await fetch(`/api/admin/disputes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve", resolution: resolutionChoice, adminNotes: notes }),
      });
      const data: ApiOne = await res.json();
      if (!data.success || !data.data) {
        setToast(data.error || "Failed to resolve dispute");
        return false;
      }
      const updated = fromApi(data.data);
      setDisputes(prev => prev.map(d => d.id === id ? updated : d));
      return true;
    } catch {
      setToast("Failed to resolve dispute");
      return false;
    } finally {
      setResolving(false);
    }
  };

  const handleEscalate: EscalateFn = async (id, notes) => {
    setResolving(true);
    try {
      const res = await fetch(`/api/admin/disputes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "escalate", adminNotes: notes }),
      });
      const data: ApiOne = await res.json();
      if (!data.success || !data.data) {
        setToast(data.error || "Failed to escalate dispute");
        return false;
      }
      const updated = fromApi(data.data);
      setDisputes(prev => prev.map(d => d.id === id ? updated : d));
      return true;
    } catch {
      setToast("Failed to escalate dispute");
      return false;
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <div className="sdp-admin-scope" style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
          <AdminSidebar activeTab="disputes" admin={null} mobileOpen={false} setMobileOpen={() => {}} />
          <main className="admin-main" style={{ marginLeft: 260, flex: 1, padding: 24, color: C.textSub, fontSize: 14 }}>
            Loading disputes…
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
      {selectedDispute && (
        <DisputeDetailModal dispute={selectedDispute} onClose={() => setSelectedDispute(null)} onResolve={handleResolve} onEscalate={handleEscalate} resolving={resolving} />
      )}
      <div className="sdp-admin-scope" style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
        <AdminSidebar activeTab="disputes" admin={null} mobileOpen={false} setMobileOpen={() => {}} />
        <main className="admin-main" style={{ marginLeft: 260, flex: 1, minWidth: 0 }}>
          <header style={{ height: 64, background: "#fff", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 50 }}>
            <div><h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, fontFamily: FONT }}>Dispute management</h1></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-ghost" style={{ padding: "8px 16px", fontSize: 13 }}>📥 Export</button>
              <button className="btn-orange" style={{ padding: "8px 16px", fontSize: 13 }}>📊 Dispute analytics</button>
            </div>
          </header>

          <div style={{ padding: "24px", maxWidth: 1200 }}>
            {/* Stats */}
            <div className="stats-row" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { label: "TOTAL", count: counts.all, color: C.text },
                { label: "OPEN", count: counts.open, color: C.red },
                { label: "RESOLVED", count: counts.resolved, color: C.green },
                { label: "ESCALATED", count: counts.escalated, color: C.purple },
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
                { key: "all", label: "All disputes" },
                { key: "open", label: "Open" },
                { key: "resolved", label: "Resolved" },
                { key: "escalated", label: "Escalated" },
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
                <input className="sdp-input" style={{ paddingLeft: 38 }} placeholder="Search by item, buyer, or seller..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            {/* Disputes table */}
            <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div className="dispute-row" style={{ background: C.bg, padding: "10px 16px", fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <div>Dispute & Item</div><div>Parties</div><div>Amount</div><div>Status</div><div style={{ textAlign: "right" }}>Actions</div>
              </div>
              {filtered.map((d, i) => {
                const sc = STATUS_CONFIG[d.status];
                const pc = PRIORITY_CONFIG[d.priority];
                return (
                  <div key={d.id} className="dispute-row fade-up" style={{ animationDelay: `${i * 0.03}s`, cursor: "pointer" }} onClick={() => setSelectedDispute(d)}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
                        {d.item}
                        <span style={{ fontSize: 9, fontWeight: 700, color: pc.color, background: pc.color + "15", padding: "1px 5px", borderRadius: 6 }}>{pc.label}</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.textSub }}>{d.id} · {d.opened}</div>
                    </div>
                    <div style={{ fontSize: 12, color: C.textSub }}>{d.buyer} vs {d.seller}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: FONT }}>₦{d.amount.toLocaleString()}</div>
                    <div><span className="status-pill" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{sc.icon} {sc.label}</span></div>
                    <div style={{ textAlign: "right" }}>
                      {d.status === "open" && (
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button className="btn-green" style={{ padding: "5px 10px", fontSize: 11 }} onClick={e => { e.stopPropagation(); handleResolve(d.id); }}>✅</button>
                          <button className="btn-orange" style={{ padding: "5px 10px", fontSize: 11 }} onClick={e => { e.stopPropagation(); handleEscalate(d.id); }}>🔴</button>
                        </div>
                      )}
                      {d.status === "resolved" && <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>Resolved</span>}
                      {d.status === "escalated" && <span style={{ fontSize: 12, color: C.purple, fontWeight: 600 }}>Escalated</span>}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", color: C.textSub, fontSize: 14 }}>No disputes match your filters</div>}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}