"use client";

import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import AdminSidebar from "@/components/admin/Sidebar";
import type { buildOverview, RangeKey } from "@/lib/reports"; // type-only: nothing from lib/reports is bundled

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
const CAT_COLORS = [C.orange, C.blue, C.green, C.purple, C.amber, C.textLight];

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  .sdp-admin-scope,.sdp-admin-scope *{box-sizing:border-box;}
  .sdp-admin-scope{font-family:'Plus Jakarta Sans',sans-serif;-webkit-font-smoothing:antialiased;}
  .sdp-admin-scope button,.sdp-admin-scope input,.sdp-admin-scope select{font-family:'Plus Jakarta Sans',sans-serif;}
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
  .metric-card{border:1.5px solid #E5E7EB;border-radius:14px;padding:18px;background:#fff;}
  .chart-bar{height:8px;border-radius:4px;background:#E5E7EB;overflow:hidden;}
  .chart-fill{height:100%;border-radius:4px;transition:width 0.5s ease;}
  .report-card{padding:16px;border:1.5px solid #E5E7EB;border-radius:12px;background:#fff;cursor:pointer;text-align:left;transition:all 0.15s;}
  .report-card:hover:not(:disabled){border-color:#F97316;background:#FFF7ED;}
  .report-card:disabled{cursor:not-allowed;opacity:.55;}
  @media(max-width:900px){.admin-sidebar{display:none!important;}.admin-main{margin-left:0!important;}.metrics-grid{grid-template-columns:repeat(2,1fr)!important;}.charts-grid{grid-template-columns:1fr!important;}.report-types{grid-template-columns:repeat(2,1fr)!important;}.hdr{height:auto!important;flex-wrap:wrap;gap:8px;padding:12px 16px!important;}}
  @media print{.admin-sidebar,.no-print{display:none!important;}.admin-main{margin-left:0!important;}.sdp-admin-scope{background:#fff!important;}header.hdr{position:static!important;}}
`;

// ─── Types ─────────────────────────────────────────────────────────
type Overview = ReturnType<typeof buildOverview>;
type Toast = { msg: string; type: "success" | "error" };

// ─── Helpers ───────────────────────────────────────────────────────
const naira = (n: number) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₦${(v / 1_000).toFixed(1)}K`;
  return `₦${Math.round(v).toLocaleString()}`;
};
const nairaFull = (n: number) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;

const REPORTS = [
  { id: "revenue", name: "Revenue report", desc: "Daily orders, revenue and commission", icon: "💰" },
  { id: "orders", name: "Orders report", desc: "Every order with status, totals, courier", icon: "🛒" },
  { id: "users", name: "User growth", desc: "New signups with role and status", icon: "👥" },
  { id: "sellers", name: "Seller performance", desc: "Sales, orders and commission per seller", icon: "🏪" },
  { id: "listings", name: "Listings report", desc: "New listings, views, watchers, status", icon: "📦" },
  { id: "payments", name: "Payment report", desc: "Escrow records and payouts", icon: "💳" },
  { id: "shipping", name: "Shipping report", desc: "Orders, deliveries and fees by courier", icon: "🚚" },
  { id: "disputes", name: "Dispute report", desc: "Disputes opened, status, priority", icon: "⚠️" },
  { id: "reviews", name: "Review report", desc: "Not available yet — no review data", icon: "⭐", disabled: true },
];



/** "↑ 18.4% vs last period" — green when better, red when worse, grey when no baseline */
function Delta({ change, unit = "%", lowerIsBetter = false }: { change: number | null | undefined; unit?: "%" | "pts"; lowerIsBetter?: boolean }) {
  if (change === null || change === undefined) {
    return <div style={{ fontSize: 12, color: C.textLight, fontWeight: 600, marginTop: 4 }}>— no data last period</div>;
  }
  if (change === 0) return <div style={{ fontSize: 12, color: C.textSub, fontWeight: 600, marginTop: 4 }}>No change vs last period</div>;
  const up = change > 0;
  const good = lowerIsBetter ? !up : up;
  return (
    <div style={{ fontSize: 12, color: good ? C.green : C.red, fontWeight: 600, marginTop: 4 }}>
      {up ? "↑" : "↓"} {Math.abs(change)}{unit === "pts" ? " pts" : "%"} vs last period
    </div>
  );
}

function MetricCard({ label, value, color, size = 26, change, unit, lowerIsBetter, delay = 0, sub }: {
  label: string;
  value: string;
  color: string;
  size?: number;
  change?: number | null;
  unit?: "%" | "pts";
  lowerIsBetter?: boolean;
  delay?: number;
  sub?: string;
}) {
  return (
    <div className="metric-card fade-up" style={{ animationDelay: `${delay}s` }}>
      <div style={{ fontSize: 11, color: C.textSub, fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: size, fontWeight: 800, color, fontFamily: FONT }}>{value}</div>
      {sub ? <div style={{ fontSize: 12, color: C.textSub, fontWeight: 600, marginTop: 4 }}>{sub}</div> : <Delta change={change} unit={unit} lowerIsBetter={lowerIsBetter} />}
    </div>
  );
}

const Card = ({ title, children, style }: { title: string; children: ReactNode; style?: CSSProperties }) => (
  <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 20, ...style }}>
    <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>{title}</div>
    {children}
  </div>
);

const Empty = ({ children }: { children: ReactNode }) => <div style={{ fontSize: 13, color: C.textSub, padding: "12px 0" }}>{children}</div>;

// ─── Page ──────────────────────────────────────────────────────────
export default function AdminReportsPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [applied, setApplied] = useState({ from: "", to: "" });
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const reqId = useRef(0);

  const buildQuery = (extra: Record<string, string> = {}) => {
    const p = new URLSearchParams({ range, ...extra });
    if (range === "custom") { p.set("from", applied.from); p.set("to", applied.to); }
    return p.toString();
  };

  // (re)load whenever the range changes — ignore out-of-date responses
  useEffect(() => {
    if (range === "custom" && (!applied.from || !applied.to)) { setLoading(false); return; }
    const id = ++reqId.current;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/admin/reports?${buildQuery()}`);
        const json = await res.json().catch(() => ({}));
        if (id !== reqId.current) return;
        if (!res.ok || json.success === false) { setError(json.error || "Failed to load report"); }
        else { setData(json.data); setError(""); }
      } catch {
        if (id === reqId.current) setError("Network error — please try again");
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, applied]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const applyCustom = () => {
    if (!draftFrom || !draftTo) return setToast({ msg: "Pick a start and end date", type: "error" });
    if (draftFrom > draftTo) return setToast({ msg: "Start date must be before end date", type: "error" });
    setApplied({ from: draftFrom, to: draftTo });
  };

  const download = async (type: string) => {
    setDownloading(type);
    try {
      const res = await fetch(`/api/admin/reports/export?${buildQuery({ type })}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Export failed");
      }
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") || "")?.[1] || `${type}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setToast({ msg: e instanceof Error && e.message ? e.message : "Export failed", type: "error" });
    } finally {
      setDownloading(null);
    }
  };

  const shell = (children: ReactNode) => (
    <>
      <style>{GLOBAL_CSS}</style>
      <div className="sdp-admin-scope" style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
        <AdminSidebar activeTab={""} admin={null} mobileOpen={false} setMobileOpen={function (v: boolean): void {
          throw new Error("Function not implemented.");
        } } />
        <main className="admin-main" style={{ marginLeft: 260, flex: 1, minWidth: 0 }}>{children}</main>
      </div>
    </>
  );

  const header = (
    <header className="hdr" style={{ height: 64, background: "#fff", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 50 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, fontFamily: FONT }}>Reports & analytics</h1>
      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <select className="sdp-input" style={{ width: 150, fontSize: 13 }} value={range} onChange={(e) => setRange(e.target.value as RangeKey)}>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="ytd">Year to date</option>
          <option value="custom">Custom range</option>
        </select>
        {range === "custom" && (
          <>
            <input className="sdp-input" type="date" style={{ width: 150, fontSize: 13 }} value={draftFrom} max={draftTo || undefined} onChange={(e) => setDraftFrom(e.target.value)} />
            <span style={{ color: C.textLight }}>→</span>
            <input className="sdp-input" type="date" style={{ width: 150, fontSize: 13 }} value={draftTo} min={draftFrom || undefined} onChange={(e) => setDraftTo(e.target.value)} />
            <button className="btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={applyCustom}>Apply</button>
          </>
        )}
        <button className="btn-ghost" style={{ padding: "8px 16px", fontSize: 13 }} disabled={!data || downloading === "revenue"} onClick={() => download("revenue")}>
          {downloading === "revenue" ? "Exporting…" : "📥 Export CSV"}
        </button>
        <button className="btn-orange" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => window.print()} disabled={!data}>🖨️ Print / PDF</button>
      </div>
    </header>
  );

  const toastEl = toast && (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 600, background: "#fff", border: `1.5px solid ${toast.type === "error" ? C.redBorder : C.greenBorder}`, color: toast.type === "error" ? C.red : C.green, padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 18px rgba(0,0,0,0.1)", maxWidth: 420 }}>
      {toast.type === "error" ? "⚠️" : "✅"} {toast.msg}
    </div>
  );

  // First load / error with nothing to show
  if (!data) {
    return shell(
      <>
        {toastEl}
        {header}
        <div style={{ padding: 24 }}>
          {loading && <div style={{ color: C.textSub, fontSize: 14 }}>Loading report…</div>}
          {!loading && range === "custom" && !applied.from && <Empty>Choose a start and end date, then press Apply.</Empty>}
          {!loading && error && (
            <div style={{ background: C.redLight, border: `1.5px solid ${C.redBorder}`, color: C.red, borderRadius: 12, padding: 18, fontSize: 14, maxWidth: 520 }}>
              ⚠️ {error}
              <div style={{ marginTop: 12 }}><button className="btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setApplied({ ...applied })}>Try again</button></div>
            </div>
          )}
        </div>
      </>
    );
  }

  const k = data.kpis;
  const points = data.trend.points;
  const maxRevenue = Math.max(1, ...points.map((p) => p.revenue));
  const maxSales = Math.max(1, ...data.topSellers.map((s) => s.sales));
  const granLabel = { day: "daily", week: "weekly", month: "monthly" }[data.trend.granularity];

  return shell(
    <>
      {toastEl}
      {header}

      <div style={{ padding: 24, maxWidth: 1200, opacity: loading ? 0.6 : 1, transition: "opacity 0.2s" }}>
        <div style={{ fontSize: 12, color: C.textSub, marginBottom: 14 }}>
          Showing <strong>{data.range.label}</strong> ({data.range.from} → {data.range.to}) · compared with the {data.range.days} days before
          {error && <span style={{ color: C.red, marginLeft: 8 }}>⚠️ {error}</span>}
        </div>

        {/* KPI cards */}
        <div className="metrics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
          <MetricCard label="TOTAL REVENUE" value={nairaFull(k.revenue.value)} color={C.orange} change={k.revenue.change} />
          <MetricCard label="TOTAL ORDERS" value={k.orders.value.toLocaleString()} color={C.blue} change={k.orders.change} delay={0.05} />
          <MetricCard label="PLATFORM COMMISSION" value={nairaFull(k.commission.value)} color={C.green} change={k.commission.change} delay={0.1} />
          <MetricCard label="AVG ORDER VALUE" value={nairaFull(k.avgOrderValue.value)} color={C.purple} change={k.avgOrderValue.change} delay={0.15} />
        </div>
        <div className="metrics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          <MetricCard label="NEW USERS" value={k.newUsers.value.toLocaleString()} color={C.text} size={22} change={k.newUsers.change} delay={0.2} />
          <MetricCard label="ACTIVE SELLERS" value={k.activeSellers.value.toLocaleString()} color={C.text} size={22} change={k.activeSellers.change} delay={0.25} />
          <MetricCard label="LISTINGS LIVE" value={data.listingsLive.toLocaleString()} color={C.text} size={22} delay={0.3}
            sub={`${k.newListings.value.toLocaleString()} new this period${k.newListings.change !== null ? ` (${k.newListings.change > 0 ? "+" : ""}${k.newListings.change}%)` : ""}`} />
          <MetricCard label="DISPUTE RATE" value={`${k.disputeRate.value}%`} color={C.red} size={22} change={k.disputeRate.change} unit="pts" lowerIsBetter delay={0.35} />
        </div>

        {/* Trend + top sellers */}
        <div className="charts-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <Card title={`Revenue & orders (${granLabel})`}>
            {points.every((p) => p.revenue === 0 && p.orders === 0) ? (
              <Empty>No orders in this period.</Empty>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {points.map((p, i) => (
                  <div key={i} className="fade-up" style={{ display: "flex", alignItems: "center", gap: 10, animationDelay: `${Math.min(i, 12) * 0.04}s` }}>
                    <div style={{ width: 58, fontSize: 12, fontWeight: 600, color: C.textSub, textAlign: "right" }}>{p.label}</div>
                    <div style={{ flex: 1 }}>
                      <div className="chart-bar"><div className="chart-fill" style={{ width: `${(p.revenue / maxRevenue) * 100}%`, background: C.orange }} /></div>
                    </div>
                    <div style={{ width: 62, fontSize: 12, fontWeight: 700, color: C.text, textAlign: "right", fontFamily: FONT }}>{naira(p.revenue)}</div>
                    <div style={{ width: 46, fontSize: 11, color: C.textSub, textAlign: "right" }}>{p.orders} ord</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Top performing sellers">
            {data.topSellers.length === 0 ? (
              <Empty>No seller sales in this period.</Empty>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {data.topSellers.map((s, i) => (
                  <div key={s.id} className="fade-up" style={{ display: "flex", alignItems: "center", gap: 12, animationDelay: `${i * 0.05}s` }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: i < 3 ? C.orange : C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: i < 3 ? "#fff" : C.textSub, fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: C.textSub }}>{s.orders} order{s.orders === 1 ? "" : "s"}{s.rating ? ` · ${s.rating}★` : ""}</div>
                      <div className="chart-bar" style={{ marginTop: 4, height: 5 }}><div className="chart-fill" style={{ width: `${(s.sales / maxSales) * 100}%`, background: C.orange }} /></div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: FONT }}>{naira(s.sales)}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: s.trend === null ? C.textLight : s.trend >= 0 ? C.green : C.red }}>
                        {s.trend === null ? "new" : `${s.trend > 0 ? "+" : ""}${s.trend}%`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Revenue by category */}
        <Card title="Revenue by category" style={{ marginBottom: 24 }}>
          {data.categories.length === 0 ? (
            <Empty>No category sales in this period.</Empty>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {data.categories.map((c, i) => (
                <div key={c.name} className="fade-up" style={{ display: "flex", alignItems: "center", gap: 12, animationDelay: `${i * 0.05}s`, flexWrap: "wrap" }}>
                  <div style={{ width: 130, fontSize: 13, fontWeight: 600, color: C.text }}>{c.name}</div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div className="chart-bar"><div className="chart-fill" style={{ width: `${c.share}%`, background: CAT_COLORS[i % CAT_COLORS.length] }} /></div>
                  </div>
                  <div style={{ width: 56, fontSize: 12, fontWeight: 700, color: C.textSub, textAlign: "right" }}>{c.share}%</div>
                  <div style={{ width: 90, fontSize: 13, fontWeight: 700, color: C.text, textAlign: "right", fontFamily: FONT }}>{naira(c.revenue)}</div>
                  <div style={{ width: 64, fontSize: 11, color: C.textSub, textAlign: "right" }}>{c.orders.toLocaleString()} ord</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Downloadable reports */}
        <div className="no-print">
          <Card title="Available reports (download as CSV for the selected period)">
            <div className="report-types" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {REPORTS.map((r) => (
                <button key={r.id} className="report-card" disabled={r.disabled || downloading === r.id} onClick={() => download(r.id)}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{r.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: C.textSub, lineHeight: 1.4 }}>{downloading === r.id ? "Preparing download…" : r.desc}</div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div style={{ marginTop: 16, fontSize: 11, color: C.textLight, lineHeight: 1.6 }}>
          Revenue counts non-cancelled orders. Commission is the commission recorded on seller earnings in the period. Dispute rate = disputes opened ÷ orders. Dates use UTC. Generated {new Date(data.generatedAt).toLocaleString("en-NG")}.
        </div>
      </div>
    </>
  );
}