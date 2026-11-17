"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SellerSidebar from "@/components/seller/Sidebar";

// ─── Types ─────────────────────────────────────────────────────────
interface SellerAccountProfile {
  id: string;
  name: string;
  email: string;
  sellerStatus?: string;
}

interface OrderItem {
  id: string;
  listingId: string;
  title: string;
  image: string;
  price: number;
  qty: number;
  seller: string;
  sellerId: string;
  shipping: number;
  courier: string;
  condition: string;
}

interface Order {
  id: string;
  buyerId: string;
  buyerName?: string;
  items: OrderItem[];
  status: string;
  total: number;
  subtotal: number;
  shipping: number;
  discount: number;
  address: Record<string, string | number>;
  payMethod: string;
  courier: string;
  eta: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Status normalization (seed data mixes several conventions) ───
const STATUS_MAP: Record<string, string> = {
  pending: "pending", "Processing": "pending",
  shipped: "shipped", "In transit": "shipped",
  delivered: "delivered", "Delivered": "delivered", "Confirm receipt": "delivered",
  dispute: "dispute",
  cancelled: "cancelled", "Cancelled": "cancelled",
};
const normStatus = (s: string) => STATUS_MAP[s] || "pending";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  pending:   { label: "Pending",   color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "⏳" },
  shipped:   { label: "Shipped",   color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", icon: "🚚" },
  delivered: { label: "Delivered", color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0", icon: "✅" },
  dispute:   { label: "Dispute",   color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: "⚠️" },
  cancelled: { label: "Cancelled", color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB", icon: "❌" },
};

const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const time = d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `Today ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" }) + " " + time;
}

const fmtAddress = (addr: Record<string, string | number>) => {
  const parts = Object.values(addr || {}).filter(Boolean);
  return parts.length ? parts.join(", ") : "No address on file";
};

// ─── Components ────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border"
      style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}>
      {sc.icon} {sc.label}
    </span>
  );
}

// ─── Order detail modal ────────────────────────────────────────────
function OrderDetailModal({ order, ownItems, ownTotal, onClose, onStatusChange, busy }: {
  order: Order;
  ownItems: OrderItem[];
  ownTotal: { subtotal: number; shipping: number; total: number };
  onClose: () => void;
  onStatusChange: (orderId: string, status: string) => void;
  busy: boolean;
}) {
  const st = normStatus(order.status);
  const ownShipping = ownItems.reduce((a, i) => a + (i.shipping || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-[500] flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-[20px] p-6 max-w-[520px] w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-5">
          <div>
            <div className="text-[17px] font-extrabold text-[#111827]">Order details</div>
            <div className="text-[12px] text-[#6B7280]">{order.id}</div>
          </div>
          <button onClick={onClose} className="bg-transparent border-none text-xl cursor-pointer text-[#9CA3AF] hover:text-[#111827] p-1">✕</button>
        </div>

        {/* Items */}
        <div className="flex flex-col gap-2.5 mb-5">
          {ownItems.map((item) => (
            <div key={item.id} className="flex gap-3 items-center p-3 bg-[#F9FAFB] rounded-[12px]">
              <div className="w-14 h-14 rounded-[10px] bg-white border-[1.5px] border-[#E5E7EB] flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : "📦"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-[#111827] truncate">{item.title}</div>
                <div className="text-[11px] text-[#6B7280]">Qty: {item.qty} · {item.courier}</div>
                <div className="text-[13px] font-extrabold text-[#F97316]">{naira(item.price * item.qty)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-3 mb-5 text-[13px]">
          <div className="flex justify-between gap-4">
            <span className="text-[#6B7280] shrink-0">Buyer</span>
            <span className="text-[#111827] font-semibold text-right">{order.buyerName || "Buyer"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#6B7280] shrink-0">Delivery address</span>
            <span className="text-[#111827] font-semibold text-right max-w-[240px]">{fmtAddress(order.address)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#6B7280] shrink-0">Payment</span>
            <span className="text-[#111827] font-semibold capitalize text-right">{order.payMethod || "—"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#6B7280] shrink-0">Order date</span>
            <span className="text-[#111827] font-semibold text-right">{formatDate(order.createdAt)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#6B7280] shrink-0">Status</span>
            <StatusPill status={st} />
          </div>
        </div>

        {/* Totals (this seller's portion) */}
        <div className="border-t border-[#E5E7EB] pt-4 mb-5">
          <div className="flex justify-between text-[13px] mb-1.5">
            <span className="text-[#6B7280]">Items subtotal</span>
            <span className="text-[#111827] font-semibold">{naira(ownTotal.subtotal)}</span>
          </div>
          <div className="flex justify-between text-[13px] mb-2">
            <span className="text-[#6B7280]">Shipping{ownShipping !== ownTotal.shipping ? " (your items)" : ""}</span>
            <span className="text-[#111827] font-semibold">{naira(ownTotal.shipping)}</span>
          </div>
          <div className="flex justify-between text-[15px] font-extrabold text-[#111827] border-t border-[#E5E7EB] pt-2.5">
            <span>You receive</span>
            <span>{naira(ownTotal.total)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {st === "pending" && (
            <button disabled={busy} onClick={() => onStatusChange(order.id, "shipped")}
              className="w-full py-3 text-sm font-bold text-white bg-[#F97316] rounded-[10px] hover:bg-[#EA6C0A] transition-all cursor-pointer border-none disabled:opacity-50">
              🚚 Mark as shipped
            </button>
          )}
          {st === "shipped" && (
            <button disabled={busy} onClick={() => onStatusChange(order.id, "Delivered")}
              className="w-full py-3 text-sm font-bold text-white bg-[#16A34A] rounded-[10px] hover:bg-[#15803D] transition-all cursor-pointer border-none disabled:opacity-50">
              ✅ Mark as delivered
            </button>
          )}
          {st === "dispute" && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] p-3.5 text-[12px] text-[#DC2626] leading-relaxed">
              ⚠️ <strong>Dispute open.</strong> Contact the buyer to resolve, then update the status.
              Buyer: <strong>{order.buyerName || "—"}</strong>
            </div>
          )}
          {st === "delivered" && (
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[10px] p-3.5 text-[12px] text-[#16A34A] text-center font-semibold">
              ✅ Order completed
            </div>
          )}
          {st === "cancelled" && (
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-[10px] p-3.5 text-[12px] text-[#6B7280] text-center">
              Order was cancelled
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────
export default function SellerOrdersPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<SellerAccountProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Order | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = async () => {
    try {
      const [profileRes, ordersRes] = await Promise.all([
        fetch("/api/seller/me"),
        fetch("/api/seller/orders"),
      ]);
      const profileData = await profileRes.json();
      const ordersData = await ordersRes.json();

      if (!profileData.success || !profileData.data) {
        router.push("/seller/onboarding");
        return;
      }
      setSeller(profileData.data);
      if (ordersData.success) setOrders(ordersData.data);
    } catch {
      setToast({ msg: "❌ Failed to load orders", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Items belonging to this seller in a given order + their portion of the money
  const ownItemsFor = (order: Order): OrderItem[] => {
    if (!seller?.id) return order.items;
    const mine = order.items.filter((i) => i.sellerId === seller.id);
    return mine.length ? mine : order.items;
  };

  const portionFor = (order: Order) => {
    const items = ownItemsFor(order);
    const subtotal = items.reduce((a, i) => a + i.price * (i.qty || 1), 0);
    const shipping = items.reduce((a, i) => a + (i.shipping || 0), 0);
    return { items, subtotal, shipping, total: subtotal + shipping };
  };

  const rows = useMemo(() => {
    return orders.map((o) => ({ order: o, st: normStatus(o.status), ...portionFor(o) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, seller]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter !== "all" && r.st !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        const inItem = r.items.some((i) => i.title.toLowerCase().includes(q));
        const inBuyer = (r.order.buyerName || "").toLowerCase().includes(q);
        if (!inItem && !inBuyer) return false;
      }
      return true;
    });
  }, [rows, filter, search]);

  const counts = useMemo(() => ({
    all: rows.length,
    pending: rows.filter((r) => r.st === "pending").length,
    shipped: rows.filter((r) => r.st === "shipped").length,
    delivered: rows.filter((r) => r.st === "delivered").length,
    dispute: rows.filter((r) => r.st === "dispute").length,
    cancelled: rows.filter((r) => r.st === "cancelled").length,
  }), [rows]);

  const totalRevenue = rows.filter((r) => r.st !== "cancelled").reduce((a, r) => a + r.total, 0);
  const pendingRevenue = rows.filter((r) => r.st === "pending").reduce((a, r) => a + r.total, 0);

  const handleStatusChange = async (orderId: string, status: string) => {
    setBusyId(orderId);
    try {
      const res = await fetch("/api/seller/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
        setSelected(null);
        setToast({ msg: `✅ Order marked as ${STATUS_CONFIG[normStatus(status)]?.label || status}`, type: "success" });
      } else {
        setToast({ msg: `❌ ${data.error || "Update failed"}`, type: "error" });
      }
    } catch {
      setToast({ msg: "❌ Failed to update order", type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const TABS = [
    { key: "all", label: "All orders", count: counts.all },
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "shipped", label: "Shipped", count: counts.shipped },
    { key: "delivered", label: "Delivered", count: counts.delivered },
    { key: "dispute", label: "Disputes", count: counts.dispute },
    { key: "cancelled", label: "Cancelled", count: counts.cancelled },
  ];

  const selectedPortion = selected ? portionFor(selected) : null;

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 rounded-[10px] text-sm font-semibold shadow-lg border"
          style={{
            background: toast.type === "success" ? "#F0FDF4" : "#FEF2F2",
            borderColor: toast.type === "success" ? "#BBF7D0" : "#FECACA",
            color: toast.type === "success" ? "#16A34A" : "#DC2626",
          }}>
          {toast.msg}
        </div>
      )}

      {selected && selectedPortion && (
        <OrderDetailModal
          order={selected}
          ownItems={selectedPortion.items}
          ownTotal={{ subtotal: selectedPortion.subtotal, shipping: selectedPortion.shipping, total: selectedPortion.total }}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          busy={busyId === selected.id}
        />
      )}

      <SellerSidebar activeTab="orders" seller={seller} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="lg:pl-[260px] min-h-screen">
        <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] h-16 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden bg-transparent border-none text-xl cursor-pointer p-1">☰</button>
            <h1 className="text-lg font-extrabold text-[#111827]">Orders</h1>
          </div>
          <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-full px-3.5 py-1.5 text-[12px] font-bold text-[#16A34A]">
            💰 {naira(totalRevenue)} total revenue
          </div>
        </header>

        <div className="p-4 lg:p-6 max-w-[1200px]">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { key: "pending", label: "PENDING", count: counts.pending, color: "#D97706", sub: `${naira(pendingRevenue)} awaiting shipment` },
              { key: "shipped", label: "SHIPPED", count: counts.shipped, color: "#2563EB", sub: "In transit to buyers" },
              { key: "delivered", label: "DELIVERED", count: counts.delivered, color: "#16A34A", sub: "Completed orders" },
              { key: "dispute", label: "DISPUTES", count: counts.dispute, color: "#DC2626", sub: "Needs your attention" },
            ].map((s) => (
              <button key={s.key} onClick={() => setFilter(s.key)}
                className="text-left bg-white border-[1.5px] rounded-[14px] p-5 transition-all cursor-pointer"
                style={{ borderColor: filter === s.key ? s.color : "#E5E7EB" }}>
                <div className="text-[12px] text-[#6B7280] font-semibold mb-1">{s.label}</div>
                <div className="text-[26px] font-extrabold mb-0.5" style={{ color: s.color }}>{s.count}</div>
                <div className="text-[11px] text-[#6B7280]">{s.sub}</div>
              </button>
            ))}
          </div>

          {/* Filter tabs */}
          <div className="flex border-b-2 border-[#E5E7EB] mb-5 overflow-x-auto">
            {TABS.map((tab) => (
              <button key={tab.key} onClick={() => setFilter(tab.key)}
                className="flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-[2px] whitespace-nowrap cursor-pointer transition-all bg-transparent"
                style={{
                  color: filter === tab.key ? "#F97316" : "#6B7280",
                  borderBottomColor: filter === tab.key ? "#F97316" : "transparent",
                }}>
                {tab.label}
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: filter === tab.key ? "#F97316" : "#F9FAFB", color: filter === tab.key ? "#fff" : "#6B7280" }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative max-w-[400px] mb-4">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#9CA3AF]">🔍</span>
            <input
              type="text"
              placeholder="Search by item or buyer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border-[1.5px] border-[#E5E7EB] rounded-[10px] text-sm outline-none focus:border-[#F97316] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.1)] bg-white"
            />
          </div>

          {/* Table */}
          <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] overflow-hidden">
            <div className="hidden lg:grid grid-cols-[2fr_1fr_110px_110px_120px_130px] gap-4 px-4 py-2.5 bg-[#F9FAFB] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
              <div>Order & Item</div><div>Buyer</div><div>Total</div><div>Status</div><div>Date</div><div className="text-right">Action</div>
            </div>

            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 bg-[#F3F4F6] rounded animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-14 text-sm text-[#6B7280]">
                <div className="text-3xl mb-2">🛒</div>
                No orders match your filters
              </div>
            ) : (
              filtered.map((r) => {
                const first = r.items[0];
                return (
                  <div key={r.order.id}
                    className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_110px_110px_120px_130px] gap-2 lg:gap-4 px-4 py-3.5 items-center border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                    onClick={() => setSelected(r.order)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg flex items-center justify-center text-lg shrink-0 overflow-hidden">
                        {first?.image ? <img src={first.image} alt="" className="w-full h-full object-cover" /> : "📦"}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-[#111827] truncate">
                          {first?.title}{r.items.length > 1 ? ` +${r.items.length - 1} more` : ""}
                        </div>
                        <div className="text-[11px] text-[#6B7280]">{r.order.id}</div>
                      </div>
                    </div>
                    <div className="text-[13px] text-[#111827] truncate">{r.order.buyerName || "Buyer"}</div>
                    <div className="text-[13px] font-bold text-[#111827]">{naira(r.total)}</div>
                    <div><StatusPill status={r.st} /></div>
                    <div className="text-[12px] text-[#6B7280]">{formatDate(r.order.createdAt)}</div>
                    <div className="lg:text-right">
                      {r.st === "pending" && (
                        <button disabled={busyId === r.order.id}
                          onClick={(e) => { e.stopPropagation(); handleStatusChange(r.order.id, "shipped"); }}
                          className="px-3.5 py-1.5 text-[12px] font-bold text-white bg-[#F97316] rounded-lg hover:bg-[#EA6C0A] transition-all cursor-pointer border-none disabled:opacity-50">
                          Ship
                        </button>
                      )}
                      {r.st === "shipped" && (
                        <button disabled={busyId === r.order.id}
                          onClick={(e) => { e.stopPropagation(); handleStatusChange(r.order.id, "Delivered"); }}
                          className="px-3.5 py-1.5 text-[12px] font-bold text-white bg-[#16A34A] rounded-lg hover:bg-[#15803D] transition-all cursor-pointer border-none disabled:opacity-50">
                          Deliver
                        </button>
                      )}
                      {r.st === "dispute" && (
                        <span className="text-[12px] text-[#DC2626] font-semibold">⚠️ Open</span>
                      )}
                      {r.st === "delivered" && (
                        <span className="text-[12px] text-[#16A34A] font-semibold">Completed</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] px-2 py-2 z-[200] flex justify-around lg:hidden">
        {[
          { icon: "📊", href: "/seller/dashboard" },
          { icon: "📦", href: "/seller/listings" },
          { icon: "🛒", href: "/seller/orders" },
          { icon: "💰", href: "/seller/earnings" },
          { icon: "⚙️", href: "/seller/settings" },
        ].map((item, i) => (
          <Link key={i} href={item.href} className="p-2 text-xl text-[#9CA3AF] no-underline">{item.icon}</Link>
        ))}
      </nav>
      <div className="h-16 lg:hidden" />
    </div>
  );
}