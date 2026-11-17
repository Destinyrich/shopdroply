"use client";

import { useState, useEffect } from "react";
// import AdminSidebar from "@/components/admin/Sidebar";

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
  .order-row{display:grid;grid-template-columns:1.6fr 1.1fr 1.4fr 110px 130px 120px;gap:16px;padding:14px 16px;align-items:center;border-bottom:1px solid #F3F4F6;transition:background 0.15s;}
  .order-row:hover{background:#F9FAFB;}
  .status-pill{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;}
  @media(max-width:900px){.order-row{grid-template-columns:1fr 1fr;gap:8px;padding:12px;}.admin-sidebar{display:none!important;}.admin-main{margin-left:0!important;}.stats-row{grid-template-columns:repeat(2,1fr)!important;}}
`;

// Statuses are stored with mixed case across the app — normalize to
// lowercase bucket keys so counts, tabs and pills all line up.
function normStatus(s: string): string {
  const k = (s || "").toLowerCase();
  if (k === "in transit") return "shipped";
  if (k === "confirm receipt") return "delivered";
  return k;
}

type StatusConfigEntry = {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
};

const STATUS_CONFIG: Record<string, StatusConfigEntry> = {
  pending:    { label: "Pending",    color: C.amber,  bg: C.amberLight,  border: C.amberBorder,  icon: "⏳" },
  processing: { label: "Processing", color: C.blue,   bg: C.blueLight,   border: C.blueBorder,   icon: "🔄" },
  shipped:    { label: "Shipped",    color: C.purple, bg: C.purpleLight, border: C.purpleBorder, icon: "🚚" },
  delivered:  { label: "Delivered",  color: C.green,  bg: C.greenLight,  border: C.greenBorder,  icon: "✅" },
  dispute:    { label: "Disputed",   color: C.red,    bg: C.redLight,    border: C.redBorder,    icon: "⚠️" },
  cancelled:  { label: "Cancelled",  color: C.textSub,bg: C.bg,          border: C.border,       icon: "🚫" },
};

// Every value the admin may set, passed through to db.updateOrderStatus
const ALL_STATUSES = [
  "pending", "Processing", "shipped", "In transit",
  "Delivered", "Confirm receipt", "dispute", "Cancelled",
];

type OrderCountKey = "all" | "pending" | "processing" | "shipped" | "delivered" | "dispute" | "cancelled";

const TABS: { key: OrderCountKey; label: string }[] = [
  { key: "all",       label: "All" },
  { key: "pending",   label: "Pending" },
  { key: "processing",label: "Processing" },
  { key: "shipped",   label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "dispute",   label: "Disputed" },
  { key: "cancelled", label: "Cancelled" },
];

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
          { id: "orders", label: "Orders", icon: "🛒", active: true },
          { id: "escrow", label: "Escrow", icon: "🛡️" },
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
            {item.id === "orders" && pendingCount > 0 && <span style={{ marginLeft: "auto", background: C.amber, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>{pendingCount}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function OrderDetailModal({ order, onClose, onUpdate, acting }: { order: any; onClose: () => void; onUpdate: (id: string, data: any) => Promise<boolean>; acting: boolean }) {
  const [status, setStatus] = useState(order.status);
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || "");
  const [courier, setCourier] = useState(order.courier || "");

  if (!order) return null;
  const sc = STATUS_CONFIG[normStatus(order.status)];
  const addr = order.address || {};

  const save = async () => {
    const ok = await onUpdate(order.id, {
      status,
      trackingNumber: trackingNumber || undefined,
      courier: courier || undefined,
    });
    if (ok) onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div className="scale-in" style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div><div style={{ fontSize: 17, fontWeight: 800, color: C.text, fontFamily: FONT }}>Order details</div><div style={{ fontSize: 12, color: C.textSub }}>{order.id} · {order.time}</div></div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textLight }}>✕</button>
        </div>

        <div style={{ background: sc.bg, border: `1.5px solid ${sc.border}`, borderRadius: 10, padding: "10px 14px", display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 18 }}>{sc.icon}</span><span style={{ fontSize: 13, fontWeight: 700, color: sc.color }}>{sc.label}</span>
        </div>

        {/* Buyer & delivery */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Buyer</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{order.buyerName}</div>
            <div style={{ fontSize: 12, color: C.textSub }}>{order.payMethod} payment</div>
          </div>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Delivery</div>
            <div style={{ fontSize: 12, color: C.text }}>{addr.street || "—"}</div>
            <div style={{ fontSize: 12, color: C.textSub }}>{[addr.city, addr.state].filter(Boolean).join(", ") || "—"}</div>
          </div>
        </div>

        {/* Items */}
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Items ({order.items.length})</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {order.items.map((item: any) => (
            <div key={item.id} style={{ display: "flex", gap: 10, alignItems: "center", border: `1px solid ${C.border}`, borderRadius: 10, padding: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.image}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                <div style={{ fontSize: 11, color: C.textSub }}>{item.seller} · qty {item.qty} · {item.condition}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: FONT }}>₦{(item.price * item.qty).toLocaleString()}</div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}><span style={{ color: C.textSub }}>Subtotal</span><span style={{ color: C.text, fontWeight: 600 }}>₦{order.subtotal.toLocaleString()}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}><span style={{ color: C.textSub }}>Shipping</span><span style={{ color: C.text, fontWeight: 600 }}>₦{order.shipping.toLocaleString()}</span></div>
          {order.discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}><span style={{ color: C.textSub }}>Discount</span><span style={{ color: C.green, fontWeight: 600 }}>−₦{order.discount.toLocaleString()}</span></div>}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800, color: C.text, fontFamily: FONT, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
            <span>Total</span><span style={{ color: C.orange }}>₦{order.total.toLocaleString()}</span>
          </div>
        </div>

        {/* Courier / tracking */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textSub, display: "block", marginBottom: 4 }}>COURIER</label>
            <input className="sdp-input" value={courier} onChange={e => setCourier(e.target.value)} placeholder="GIG Logistics" />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textSub, display: "block", marginBottom: 4 }}>TRACKING NO.</label>
            <input className="sdp-input" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="GIG-0000000" />
          </div>
        </div>

        {/* Admin status intervention */}
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Update status</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
          <select className="sdp-input" style={{ flex: 1 }} value={status} onChange={e => setStatus(e.target.value)}>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn-orange" style={{ padding: "10px 18px", fontSize: 13, opacity: acting ? 0.6 : 1 }} disabled={acting} onClick={save}>{acting ? "Saving…" : "Update"}</button>
        </div>
        {normStatus(order.status) === "dispute" && (
          <div style={{ background: C.redLight, border: `1.5px solid ${C.redBorder}`, borderRadius: 8, padding: "10px 12px", marginTop: 8, fontSize: 12, color: C.red, fontWeight: 600 }}>
            ⚠️ This order is under dispute — resolve it from the Disputes screen before releasing escrow.
          </div>
        )}
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

// Map API Order -> UI shape
function fromApi(o: any) {
  return {
    id: o.id,
    buyerName: o.buyerName || o.buyerId || "—",
    buyerId: o.buyerId,
    items: o.items || [],
    total: o.total ?? 0,
    subtotal: o.subtotal ?? o.total ?? 0,
    shipping: o.shipping ?? 0,
    discount: o.discount ?? 0,
    status: o.status,
    payMethod: o.payMethod || "—",
    courier: o.courier || "",
    trackingNumber: o.trackingNumber || "",
    address: o.address || {},
    createdAt: o.createdAt,
    time: timeAgo(o.createdAt),
  };
}

export default function AdminOrdersScreen() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<ReturnType<typeof fromApi> | null>(null);
  const [orders, setOrders] = useState<ReturnType<typeof fromApi>[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "error" | "success" } | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/orders");
      const data = await res.json();
      if (data.success) setOrders(data.data.map(fromApi));
      else setToast({ msg: data.error || "Failed to load orders", type: "error" });
    } catch {
      setToast({ msg: "Failed to load orders", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const bucket = (o: { status?: string | null }) => normStatus(o.status ?? "");
  const inEscrow = (o: { status?: string | null }) => ["pending", "processing", "shipped"].includes(bucket(o));

  const counts = {
    all: orders.length,
    pending: orders.filter(o => bucket(o) === "pending").length,
    processing: orders.filter(o => bucket(o) === "processing").length,
    shipped: orders.filter(o => bucket(o) === "shipped").length,
    delivered: orders.filter(o => bucket(o) === "delivered").length,
    dispute: orders.filter(o => bucket(o) === "dispute").length,
    cancelled: orders.filter(o => bucket(o) === "cancelled").length,
  };

  const escrowTotal = orders.filter(inEscrow).reduce((a, o) => a + o.total, 0);

  const filtered = orders.filter(o => {
    if (filter !== "all" && bucket(o) !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hit = o.id.toLowerCase().includes(q)
        || o.buyerName.toLowerCase().includes(q)
        || o.items.some((i: { title?: string | null }) => (i.title ?? "").toLowerCase().includes(q));
      if (!hit) return false;
    }
    return true;
  });

  const handleUpdate = async (id: string, patch: Record<string, unknown>) => {
    setActing(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!data.success) {
        setToast({ msg: data.error || "Update failed", type: "error" });
        return false;
      }
      setOrders(prev => prev.map(o => o.id === id ? fromApi(data.data) : o));
      setToast({ msg: `Order ${id} updated`, type: "success" });
      return true;
    } catch {
      setToast({ msg: "Update failed", type: "error" });
      return false;
    } finally {
      setActing(false);
    }
  };

  const handleCancel = (id: string) => {
    if (!window.confirm(`Cancel order ${id}? Escrow funds will be refunded to the buyer.`)) return;
    handleUpdate(id, { status: "Cancelled" });
  };

  if (loading) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <div className="sdp-admin-scope" style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
          <AdminSidebar pendingCount={0} />
          <main className="admin-main" style={{ marginLeft: 260, flex: 1, padding: 24, color: C.textSub, fontSize: 14 }}>
            Loading orders…
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
      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onUpdate={handleUpdate} acting={acting} />
      )}
      <div className="sdp-admin-scope" style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
        <AdminSidebar pendingCount={counts.pending} />
        <main className="admin-main" style={{ marginLeft: 260, flex: 1, minWidth: 0 }}>
          <header style={{ height: 64, background: "#fff", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 50 }}>
            <div><h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, fontFamily: FONT }}>Order management</h1></div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ background: C.blueLight, border: `1px solid ${C.blueBorder}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: C.blue }}>
                🛡️ ₦{escrowTotal.toLocaleString()} in escrow
              </div>
              {counts.dispute > 0 && (
                <div style={{ background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: C.red }}>
                  ⚠️ {counts.dispute} disputed
                </div>
              )}
              <button className="btn-ghost" style={{ padding: "8px 16px", fontSize: 13 }}>📥 Export</button>
            </div>
          </header>

          <div style={{ padding: "24px", maxWidth: 1300 }}>
            {/* Stats */}
            <div className="stats-row" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { label: "TOTAL", count: counts.all, color: C.text },
                { label: "PENDING", count: counts.pending, color: C.amber },
                { label: "PROCESSING", count: counts.processing, color: C.blue },
                { label: "SHIPPED", count: counts.shipped, color: C.purple },
                { label: "DELIVERED", count: counts.delivered, color: C.green },
                { label: "DISPUTED", count: counts.dispute, color: C.red },
              ].map((s, i) => (
                <div key={i} style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
                  <div style={{ fontSize: 11, color: C.textSub, fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: FONT }}>{s.count}</div>
                </div>
              ))}
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
                <input className="sdp-input" style={{ paddingLeft: 38 }} placeholder="Search by order ID, buyer or item…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            {/* Orders table */}
            <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div className="order-row" style={{ background: C.bg, padding: "10px 16px", fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <div>Order</div><div>Buyer</div><div>Items</div><div>Total</div><div>Status</div><div style={{ textAlign: "right" }}>Actions</div>
              </div>
              {filtered.map((o, i) => {
                const sc = STATUS_CONFIG[bucket(o)];
                const first = o.items[0];
                const qty = o.items.reduce((a: number, it: { qty?: number | null }) => a + Number(it.qty ?? 0), 0);
                return (
                  <div key={o.id} className="order-row fade-up" style={{ animationDelay: `${i * 0.03}s`, cursor: "pointer" }} onClick={() => setSelectedOrder(o)}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{o.id}</div>
                      <div style={{ fontSize: 11, color: C.textSub }}>{o.time} · {o.payMethod}</div>
                    </div>
                    <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{o.buyerName}</div>
                    <div>
                      <div style={{ fontSize: 13, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{first?.image}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200, display: "inline-block", verticalAlign: "middle" }}>{first?.title}</span>
                      </div>
                      {o.items.length > 1 && <div style={{ fontSize: 11, color: C.textLight }}>+{o.items.length - 1} more · {qty} items</div>}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: FONT }}>₦{o.total.toLocaleString()}</div>
                    <div><span className="status-pill" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{sc.icon} {sc.label}</span></div>
                    <div style={{ textAlign: "right" }} onClick={e => e.stopPropagation()}>
                      {["pending", "processing"].includes(bucket(o)) ? (
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button className="btn-ghost" style={{ padding: "5px 12px", fontSize: 11 }} onClick={() => setSelectedOrder(o)}>View</button>
                          <button className="btn-red" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => handleCancel(o.id)}>Cancel</button>
                        </div>
                      ) : (
                        <button className="btn-ghost" style={{ padding: "5px 12px", fontSize: 11 }} onClick={() => setSelectedOrder(o)}>View</button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", color: C.textSub, fontSize: 14 }}>No orders match your filters</div>}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
