"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* ─── Types ─────────────────────────────────────────────────────── */
interface Order {
  id: string;
  items: { id: string; title: string; image: string; price: number; qty: number; seller: string; shipping: number; courier: string; condition: string }[];
  status: "Processing" | "In transit" | "Delivered" | "Confirm receipt" | "Cancelled";
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

interface Bid {
  id: string;
  listingId: string;
  item: string;
  image: string;
  myBid: number;
  currentBid: number;
  leading: boolean;
  endTime: string;
  totalBids: number;
  createdAt: string;
}

interface WatchlistItem {
  id: string;
  listingId: string;
  item: string;
  image: string;
  price: number;
  origPrice?: number;
  type: "fixed" | "auction";
  bids?: number;
  addedAt: string;
}

interface Notification {
  id: string;
  icon: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  createdAt: string;
}

interface BuyerStats {
  totalOrders: number;
  activeOrders: number;
  activeBids: number;
  leadingBids: number;
  watchlistCount: number;
  priceDrops: number;
  escrowTotal: number;
  escrowPending: number;
}

interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  avatar: string;
  joined: string;
  verified: boolean;
}

/* ─── Design tokens ─────────────────────────────────────────────── */
const C = {
  orange: "#F97316", orangeLight: "#FFF7ED", orangeBdr: "#FED7AA",
  green: "#16A34A", greenLight: "#F0FDF4", greenBdr: "#BBF7D0",
  red: "#DC2626", redLight: "#FEF2F2", redBdr: "#FECACA",
  amber: "#D97706", amberLight: "#FFFBEB", amberBdr: "#FDE68A",
  blue: "#2563EB", blueLight: "#EFF6FF", blueBdr: "#BFDBFE",
  purple: "#7C3AED", purpleLight: "#F5F3FF", purpleBdr: "#DDD6FE",
  bg: "#F9FAFB", surface: "#FFFFFF", border: "#E5E7EB",
  text: "#111827", textMid: "#374151", textSub: "#6B7280", textLight: "#9CA3AF",
};

const NAV_ITEMS = [
  { icon: "🏠", label: "Overview", key: "overview" },
  { icon: "📦", label: "My orders", key: "orders" },
  { icon: "⚡", label: "My bids", key: "bids" },
  { icon: "❤️", label: "Watchlist", key: "watchlist" },
  { icon: "🔔", label: "Notifications", key: "notifs", badge: 0 },
  { icon: "💬", label: "Messages", key: "messages", badge: 0 },
  { icon: "⚙️", label: "Settings", key: "settings" },
];

/* ─── Helpers ───────────────────────────────────────────────────── */
function useFetch<T>(url: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { credentials: "include" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Request failed");
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { refetch(); }, [refetch, ...deps]);

  return { data, loading, error, refetch };
}

function StatusTag({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; bdr: string }> = {
    "In transit": { color: C.blue, bg: C.blueLight, bdr: C.blueBdr },
    "Delivered": { color: C.green, bg: C.greenLight, bdr: C.greenBdr },
    "Confirm receipt": { color: C.orange, bg: C.orangeLight, bdr: C.orangeBdr },
    "Processing": { color: C.amber, bg: C.amberLight, bdr: C.amberBdr },
    "Cancelled": { color: C.red, bg: C.redLight, bdr: C.redBdr },
  };
  const s = map[status] || map["Processing"];
  return <span className="text-[11px] font-bold px-2.5 py-[3px] rounded-full border" style={{ background: s.bg, color: s.color, borderColor: s.bdr }}>{status}</span>;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return "Today";
  if (diff < 2 * 86400000) return "Yesterday";
  if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)} days ago`;
  return d.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}

function formatCurrency(n: number) {
  return `₦${n.toLocaleString()}`;
}

/* ─── Sidebar ───────────────────────────────────────────────────── */
function Sidebar({ active, setActive, user, notifCount }: { active: string; setActive: (k: string) => void; user: UserProfile; notifCount: number }) {
  return (
    <aside className="hidden lg:flex w-[240px] flex-col gap-1 shrink-0">
      <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-4 mb-2">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-full bg-[#F97316] flex items-center justify-center text-white font-extrabold text-sm shrink-0">
            {user.avatar}
          </div>
          <div>
            <div className="text-sm font-bold text-[#111827]">{user.name}</div>
            <div className="text-[11px] text-[#6B7280]">{user.email}</div>
          </div>
        </div>
        {user.verified && (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] px-2.5 py-1 rounded-full w-fit">
            ✅ Verified buyer
          </div>
        )}
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-2 flex-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => setActive(item.key)}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] text-sm font-medium w-full text-left transition-all cursor-pointer border-none bg-transparent
              ${active === item.key ? "bg-[#FFF7ED] text-[#F97316] font-bold" : "text-[#374151] hover:bg-[#F9FAFB] hover:text-[#F97316]"}`}
          >
            <span className="text-base">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {(item.key === "notifs" ? notifCount : (item.badge ?? 0)) > 0 && (
              <span className="bg-[#F97316] text-white text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center">
                {item.key === "notifs" ? notifCount : (item.badge ?? 0)}
              </span>
            )}
          </button>
        ))}
        <div className="border-t border-[#E5E7EB] mt-2 pt-2">
          <button className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] text-sm font-medium w-full text-left transition-all cursor-pointer border-none bg-transparent text-[#DC2626] hover:bg-[#FEF2F2]">
            <span className="text-base">🚪</span>
            <span>Log out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

function MobileNav({ active, setActive, notifCount }: { active: string; setActive: (k: string) => void; notifCount: number }) {
  const items = NAV_ITEMS.slice(0, 5);
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] z-40 pb-2 pt-1.5 flex">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => setActive(item.key)}
          className="flex-1 flex flex-col items-center gap-1 bg-transparent border-none cursor-pointer py-1 relative"
        >
          <span className="text-xl">{item.icon}</span>
          <span className={`text-[9px] font-semibold ${active === item.key ? "text-[#F97316]" : "text-[#6B7280]"}`}>{item.label}</span>
          {(item.key === "notifs" ? notifCount : (item.badge ?? 0)) > 0 && (
            <span className="absolute top-0 right-[calc(50%-16px)] bg-[#F97316] text-white text-[9px] font-bold rounded-full w-[15px] h-[15px] flex items-center justify-center">
              {item.key === "notifs" ? notifCount : (item.badge ?? 0)}
            </span>
          )}
          {active === item.key && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-sm bg-[#F97316]" />}
        </button>
      ))}
    </div>
  );
}

/* ─── Overview ──────────────────────────────────────────────────── */
function Overview({ setActive, stats, orders, bids, notifs, loading, user }: {
  setActive: (k: string) => void;
  stats: BuyerStats | null;
  orders: Order[] | null;
  bids: Bid[] | null;
  notifs: Notification[] | null;
  loading: boolean;
  user: UserProfile;
}) {
  if (loading) return <div className="text-center py-20 text-[#6B7280]">Loading dashboard...</div>;

  const statCards = stats ? [
    { icon: "📦", label: "Total orders", value: stats.totalOrders.toString(), sub: `${stats.activeOrders} active`, color: C.orange, bg: C.orangeLight, bdr: C.orangeBdr },
    { icon: "⚡", label: "Active bids", value: stats.activeBids.toString(), sub: `${stats.leadingBids} leading`, color: C.blue, bg: C.blueLight, bdr: C.blueBdr },
    { icon: "❤️", label: "Watchlist", value: stats.watchlistCount.toString(), sub: `${stats.priceDrops} price drops`, color: C.red, bg: C.redLight, bdr: C.redBdr },
    { icon: "🛡️", label: "In escrow", value: formatCurrency(stats.escrowTotal), sub: `${stats.escrowPending} pending release`, color: C.green, bg: C.greenLight, bdr: C.greenBdr },
  ] : [];

  const recentOrders = orders?.slice(0, 3) || [];
  const activeBids = bids?.slice(0, 3) || [];
  const recentNotifs = notifs?.slice(0, 3) || [];

  // Find order needing confirmation
  const confirmOrder = orders?.find((o) => o.status === "Confirm receipt");

  const firstName = user.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-[#111827] tracking-tight">Good morning, {firstName} 👋</h1>
          <p className="text-sm text-[#6B7280] mt-1">Here&apos;s what&apos;s happening with your account today.</p>
        </div>
        <Link href="/search" className="inline-flex items-center justify-center gap-1.5 bg-[#F97316] text-white rounded-[10px] px-5 py-2.5 text-sm font-bold hover:bg-[#EA6C0A] hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(249,115,22,0.28)] transition-all shrink-0 no-underline">
          🛍️ Continue shopping
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s, i) => (
          <div key={s.label} className="bg-white border border-[#E5E7EB] rounded-[14px] p-4 transition-all hover:shadow-[0_4px_18px_rgba(0,0,0,0.07)] hover:-translate-y-0.5" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-xl" style={{ background: s.bg, border: `1px solid ${s.bdr}` }}>{s.icon}</div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color, border: `1px solid ${s.bdr}` }}>{s.sub}</span>
            </div>
            <div className="text-[26px] font-extrabold text-[#111827] leading-none">{s.value}</div>
            <div className="text-xs text-[#6B7280] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {confirmOrder && (
        <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-xl p-3.5 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <span className="text-2xl shrink-0">🛡️</span>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-[#92400E]">Action needed — confirm delivery to release escrow</div>
            <div className="text-xs text-[#A16207] mt-0.5">
              {confirmOrder.id} ({confirmOrder.items[0]?.title}) was delivered. Confirm receipt to release {formatCurrency(confirmOrder.total)} to seller or raise a dispute.
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <ConfirmButton orderId={confirmOrder.id} />
            <button className="bg-white border border-[#E5E7EB] rounded-[10px] px-3.5 py-2 text-[13px] font-semibold text-[#374151] hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all cursor-pointer">Raise dispute</button>
          </div>
        </div>
      )}

      <div>
        <div className="text-[15px] font-bold text-[#111827] mb-3">Quick actions</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[
            { icon: "📦", label: "Track order", key: "orders", color: C.blue, bg: C.blueLight },
            { icon: "⚡", label: "My active bids", key: "bids", color: C.orange, bg: C.orangeLight },
            { icon: "❤️", label: "My watchlist", key: "watchlist", color: C.red, bg: C.redLight },
            { icon: "💬", label: "Messages", key: "messages", color: C.purple, bg: C.purpleLight },
          ].map((a) => (
            <button key={a.key} onClick={() => setActive(a.key)} className="bg-white border border-[#E5E7EB] rounded-xl p-4 text-center cursor-pointer transition-all hover:-translate-y-0.5 hover:border-[#F97316]">
              <div className="text-[26px] mb-2">{a.icon}</div>
              <div className="text-xs font-bold" style={{ color: a.color }}>{a.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden">
          <div className="px-4 py-3.5 border-b border-[#E5E7EB] flex items-center justify-between">
            <span className="text-sm font-bold text-[#111827]">📦 Recent orders</span>
            <button onClick={() => setActive("orders")} className="text-xs text-[#F97316] font-semibold bg-transparent border-none cursor-pointer">View all →</button>
          </div>
          {recentOrders.map((order) => (
            <div key={order.id} className="px-4 py-3 border-b border-[#E5E7EB] flex gap-2.5 items-center cursor-pointer transition-colors hover:bg-[#FAFAFA] last:border-b-0">
              <div className="w-10 h-10 bg-white border border-[#E5E7EB] rounded-lg flex items-center justify-center text-xl shrink-0">{order.items[0]?.image || "📦"}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-[#111827] truncate">{order.items[0]?.title}</div>
                <div className="text-[11px] text-[#6B7280] mt-0.5">{order.id} · {formatDate(order.createdAt)}</div>
              </div>
              <StatusTag status={order.status} />
            </div>
          ))}
          {recentOrders.length === 0 && <div className="px-4 py-8 text-center text-sm text-[#6B7280]">No orders yet</div>}
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden">
          <div className="px-4 py-3.5 border-b border-[#E5E7EB] flex items-center justify-between">
            <span className="text-sm font-bold text-[#111827]">⚡ Active bids</span>
            <button onClick={() => setActive("bids")} className="text-xs text-[#F97316] font-semibold bg-transparent border-none cursor-pointer">View all →</button>
          </div>
          {activeBids.map((bid) => (
            <div key={bid.id} className="px-4 py-3 border-b border-[#E5E7EB] flex gap-2.5 items-center cursor-pointer transition-colors hover:bg-[#FAFAFA] last:border-b-0">
              <div className="w-10 h-10 bg-white border border-[#E5E7EB] rounded-lg flex items-center justify-center text-xl shrink-0">{bid.image}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-[#111827] truncate">{bid.item}</div>
                <div className="text-[11px] text-[#6B7280] mt-0.5">My bid: {formatCurrency(bid.myBid)} · ⏱ {bid.endTime}</div>
              </div>
              <span className={`text-[11px] font-bold px-2 py-[3px] rounded-full whitespace-nowrap border ${bid.leading ? "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]" : "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]"}`}>
                {bid.leading ? "🥇 Leading" : "❌ Outbid"}
              </span>
            </div>
          ))}
          {activeBids.length === 0 && <div className="px-4 py-8 text-center text-sm text-[#6B7280]">No active bids</div>}
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden">
        <div className="px-4 py-3.5 border-b border-[#E5E7EB] flex items-center justify-between">
          <span className="text-sm font-bold text-[#111827]">🔔 Notifications</span>
          <button onClick={() => setActive("notifs")} className="text-xs text-[#F97316] font-semibold bg-transparent border-none cursor-pointer">View all →</button>
        </div>
        {recentNotifs.map((n) => (
          <div key={n.id} className={`flex gap-3 px-3.5 py-3 cursor-pointer transition-colors hover:bg-[#F9FAFB] ${n.unread ? "bg-[#FFF7ED]" : ""}`}>
            <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center text-lg shrink-0 border ${n.unread ? "bg-[#FFF7ED] border-[#FED7AA]" : "bg-white border-[#E5E7EB]"}`}>{n.icon}</div>
            <div className="flex-1">
              <div className={`text-[13px] ${n.unread ? "font-bold" : "font-semibold"} text-[#111827]`}>{n.title}</div>
              <div className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">{n.body}</div>
              <div className="text-[11px] text-[#9CA3AF] mt-1">{n.time}</div>
            </div>
            {n.unread && <div className="w-2 h-2 rounded-full bg-[#F97316] shrink-0 mt-1.5" />}
          </div>
        ))}
        {recentNotifs.length === 0 && <div className="px-4 py-8 text-center text-sm text-[#6B7280]">No notifications</div>}
      </div>
    </div>
  );
}

function ConfirmButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/buyer/orders/${orderId}/confirm`, { method: "POST", credentials: "include" });
      const json = await res.json();
      if (json.success) {
        router.refresh();
      } else {
        alert(json.error || "Failed to confirm");
      }
    } catch {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleConfirm} disabled={loading} className="bg-[#F97316] text-white rounded-[10px] px-4 py-2 text-[13px] font-bold hover:bg-[#EA6C0A] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
      {loading ? "Confirming..." : "Confirm receipt"}
    </button>
  );
}

/* ─── Orders Tab ────────────────────────────────────────────────── */
function OrdersTab() {
  const { data: orders, loading, error, refetch } = useFetch<Order[]>("/api/buyer/orders");
  const [filter, setFilter] = useState("all");
  const statuses = ["all", "In transit", "Processing", "Delivered", "Confirm receipt"];
  const filtered = filter === "all" ? orders || [] : (orders || []).filter((o) => o.status === filter);

  if (loading) return <div className="text-center py-20 text-[#6B7280]">Loading orders...</div>;
  if (error) return <div className="text-center py-20 text-[#DC2626]">Error: {error} <button onClick={refetch} className="text-[#F97316] underline ml-2">Retry</button></div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <h2 className="text-lg font-extrabold text-[#111827]">My orders</h2>
        <div className="flex gap-1.5 flex-wrap">
          {statuses.map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${filter === s ? "bg-[#F97316] text-white border-[#F97316]" : "bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#F97316] hover:text-[#F97316]"}`}>
              {s === "all" ? "All orders" : s}
            </button>
          ))}
        </div>
      </div>

      {filtered.map((order) => (
        <div key={order.id} className="bg-white border border-[#E5E7EB] rounded-xl p-4 cursor-pointer transition-all hover:border-[#F97316] hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="flex gap-3.5 items-start flex-wrap">
            <div className="w-14 h-14 bg-white border border-[#E5E7EB] rounded-[10px] flex items-center justify-center text-[28px] shrink-0">{order.items[0]?.image || "📦"}</div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-sm font-bold text-[#111827]">{order.items[0]?.title}</span>
                <StatusTag status={order.status} />
              </div>
              <div className="text-xs text-[#6B7280] mb-1.5">{order.id} · Ordered {formatDate(order.createdAt)}</div>
              <div className="flex gap-4 flex-wrap">
                <span className="text-xs text-[#374151]">💳 {formatCurrency(order.total)}</span>
                <span className="text-xs text-[#374151]">🚚 {order.courier}</span>
                <span className="text-xs text-[#374151]">📅 ETA: {order.eta}</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap">
              {order.status === "Confirm receipt" && <ConfirmButton orderId={order.id} />}
              {order.status === "In transit" && <button className="bg-white border border-[#E5E7EB] rounded-[10px] px-3.5 py-2 text-[13px] font-semibold text-[#374151] hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all cursor-pointer">📍 Track order</button>}
              <button className="bg-white border border-[#E5E7EB] rounded-[10px] px-3.5 py-2 text-[13px] font-semibold text-[#374151] hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all cursor-pointer">View details</button>
            </div>
          </div>
          {(order.status === "In transit" || order.status === "Processing") && (
            <div className="mt-3 pt-3 border-t border-[#E5E7EB]">
              <div className="flex gap-0 mb-1.5">
                {["Order placed", "Seller packed", "Picked up", "In transit", "Delivered"].map((step, i) => {
                  const current = order.status === "Processing" ? 1 : order.status === "In transit" ? 3 : 4;
                  const done = i <= current;
                  return (
                    <div key={step} className="flex-1 flex flex-col items-center relative">
                      {i > 0 && <div className="absolute left-[-50%] right-[50%] top-[10px] h-0.5 transition-colors" style={{ background: done ? C.orange : C.border }} />}
                      <div className={`w-5 h-5 rounded-full z-[1] flex items-center justify-center text-[10px] border-2 ${done ? "bg-[#F97316] border-[#F97316] text-white" : "bg-white border-[#E5E7EB] text-[#9CA3AF]"}`}>{done ? "✓" : ""}</div>
                      <div className={`text-[9px] mt-1 text-center ${done ? "text-[#F97316] font-bold" : "text-[#9CA3AF]"}`}>{step}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}
      {filtered.length === 0 && <div className="text-center py-16 bg-white rounded-[14px] border border-[#E5E7EB]"><div className="text-4xl mb-3">📦</div><div className="text-base font-bold text-[#111827]">No orders found</div></div>}
    </div>
  );
}

/* ─── Bids Tab ──────────────────────────────────────────────────── */
function BidsTab() {
  const { data: bids, loading, error, refetch } = useFetch<Bid[]>("/api/buyer/bids");

  if (loading) return <div className="text-center py-20 text-[#6B7280]">Loading bids...</div>;
  if (error) return <div className="text-center py-20 text-[#DC2626]">Error: {error} <button onClick={refetch} className="text-[#F97316] underline ml-2">Retry</button></div>;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-extrabold text-[#111827]">My active bids</h2>
      {(bids || []).map((bid) => (
        <div key={bid.id} className="bg-white border rounded-xl p-4 cursor-pointer transition-all hover:shadow-[0_2px_12px_rgba(0,0,0,0.07)]" style={{ borderColor: bid.leading ? C.greenBdr : C.border }}>
          <div className="flex gap-3.5 items-center flex-wrap">
            <div className="w-[52px] h-[52px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[10px] flex items-center justify-center text-[26px] shrink-0">{bid.image}</div>
            <div className="flex-1 min-w-[180px]">
              <div className="text-sm font-bold text-[#111827] mb-1">{bid.item}</div>
              <div className="flex gap-3 flex-wrap">
                <span className="text-xs text-[#6B7280]">My bid: <strong className="text-[#111827]">{formatCurrency(bid.myBid)}</strong></span>
                <span className="text-xs text-[#6B7280]">Current: <strong style={{ color: bid.leading ? C.green : C.red }}>{formatCurrency(bid.currentBid)}</strong></span>
                <span className="text-xs text-[#6B7280]">{bid.totalBids} bids total</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`text-[11px] font-bold px-2.5 py-[3px] rounded-full border ${bid.leading ? "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]" : "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]"}`}>
                {bid.leading ? "🥇 You're leading" : "❌ You've been outbid"}
              </span>
              <div className="flex items-center gap-1 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-2.5 py-1">
                <span className="text-[11px] text-[#D97706]">⏱</span>
                <span className="text-xs font-bold text-[#D97706] font-mono">{bid.endTime}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            {!bid.leading && <button className="bg-[#F97316] text-white rounded-[10px] px-4 py-2 text-[13px] font-bold hover:bg-[#EA6C0A] transition-colors cursor-pointer">⚡ Raise bid</button>}
            <button className="bg-white border border-[#E5E7EB] rounded-[10px] px-3.5 py-2 text-[13px] font-semibold text-[#374151] hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all cursor-pointer">View auction</button>
            <button className="bg-white border border-[#E5E7EB] rounded-[10px] px-3.5 py-2 text-[13px] font-semibold text-[#374151] hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all cursor-pointer">Set auto-bid</button>
          </div>
        </div>
      ))}
      {(bids || []).length === 0 && <div className="text-center py-16 bg-white rounded-[14px] border border-[#E5E7EB]"><div className="text-4xl mb-3">⚡</div><div className="text-base font-bold text-[#111827]">No active bids</div></div>}
    </div>
  );
}

/* ─── Watchlist Tab ─────────────────────────────────────────────── */
function WatchlistTab() {
  const { data: items, loading, error, refetch } = useFetch<WatchlistItem[]>("/api/buyer/watchlist");
  const [removing, setRemoving] = useState<string | null>(null);

  const remove = async (listingId: string) => {
    setRemoving(listingId);
    try {
      const res = await fetch(`/api/buyer/watchlist?listingId=${listingId}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (json.success) refetch();
    } catch {
      alert("Failed to remove");
    } finally {
      setRemoving(null);
    }
  };

  if (loading) return <div className="text-center py-20 text-[#6B7280]">Loading watchlist...</div>;
  if (error) return <div className="text-center py-20 text-[#DC2626]">Error: {error} <button onClick={refetch} className="text-[#F97316] underline ml-2">Retry</button></div>;

  const list = items || [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-[#111827]">My watchlist</h2>
        <span className="text-[13px] text-[#6B7280]">{list.length} items</span>
      </div>
      {list.map((item) => {
        const disc = item.origPrice ? Math.round((1 - item.price / item.origPrice) * 100) : 0;
        return (
          <div key={item.id} className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex gap-3.5 items-center flex-wrap">
            <div className="w-[52px] h-[52px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[10px] flex items-center justify-center text-[26px] shrink-0">{item.image}</div>
            <div className="flex-1 min-w-[180px]">
              <div className="text-sm font-bold text-[#111827] mb-1">{item.item}</div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-base font-extrabold text-[#111827]">{formatCurrency(item.price)}</span>
                {item.origPrice && <span className="text-xs text-[#9CA3AF] line-through">{formatCurrency(item.origPrice)}</span>}
                {disc > 0 && <span className="text-[11px] font-bold text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] px-1.5 py-0.5 rounded">-{disc}% OFF</span>}
              </div>
              <div className="text-xs text-[#6B7280] mt-0.5">{item.type === "auction" ? `⚡ Auction · ${item.bids} bids` : "🏷 Fixed price"}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href={`/product/${item.listingId}`} className="inline-flex items-center justify-center bg-[#F97316] text-white rounded-[10px] px-4 py-2 text-[13px] font-bold hover:bg-[#EA6C0A] transition-colors no-underline">
                {item.type === "auction" ? "⚡ Bid now" : "🛒 Buy now"}
              </Link>
              <button onClick={() => remove(item.listingId)} disabled={removing === item.listingId} className="bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-[13px] font-semibold hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all cursor-pointer disabled:opacity-50">
                {removing === item.listingId ? "..." : "🗑"}
              </button>
            </div>
          </div>
        );
      })}
      {list.length === 0 && (
        <div className="text-center py-16 px-6 bg-white rounded-[14px] border border-[#E5E7EB]">
          <div className="text-5xl mb-3">🤍</div>
          <div className="text-base font-bold text-[#111827] mb-1.5">Your watchlist is empty</div>
          <div className="text-[13px] text-[#6B7280] mb-5">Save items you like to track prices and bid later</div>
          <Link href="/search" className="inline-flex items-center justify-center bg-[#F97316] text-white rounded-[10px] px-6 py-2.5 text-sm font-bold hover:bg-[#EA6C0A] transition-colors no-underline">Browse listings</Link>
        </div>
      )}
    </div>
  );
}

/* ─── Notifications Tab ─────────────────────────────────────────── */
function NotifsTab() {
  const { data: notifs, loading, error, refetch } = useFetch<Notification[]>("/api/buyer/notifications");

  const markAll = async () => {
    try {
      const res = await fetch("/api/buyer/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }), credentials: "include" });
      const json = await res.json();
      if (json.success) refetch();
    } catch {
      alert("Failed to mark all as read");
    }
  };

  const markOne = async (id: string) => {
    try {
      const res = await fetch("/api/buyer/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notifId: id }), credentials: "include" });
      const json = await res.json();
      if (json.success) refetch();
    } catch {
      alert("Failed to mark as read");
    }
  };

  if (loading) return <div className="text-center py-20 text-[#6B7280]">Loading notifications...</div>;
  if (error) return <div className="text-center py-20 text-[#DC2626]">Error: {error} <button onClick={refetch} className="text-[#F97316] underline ml-2">Retry</button></div>;

  const list = notifs || [];

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-[#111827]">Notifications</h2>
        <button onClick={markAll} className="text-xs text-[#F97316] font-semibold bg-transparent border-none cursor-pointer">Mark all as read</button>
      </div>
      <div className="bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden">
        {list.map((n, i) => (
          <div key={n.id} className={`flex gap-3 px-3.5 py-3 cursor-pointer transition-colors hover:bg-[#F9FAFB] ${n.unread ? "bg-[#FFF7ED]" : ""}`} style={{ borderBottom: i < list.length - 1 ? `1px solid ${C.border}` : "none" }} onClick={() => markOne(n.id)}>
            <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-lg shrink-0 border ${n.unread ? "bg-[#FFF7ED] border-[#FED7AA]" : "bg-white border-[#E5E7EB]"}`}>{n.icon}</div>
            <div className="flex-1">
              <div className={`text-[13px] ${n.unread ? "font-bold" : "font-semibold"} text-[#111827]`}>{n.title}</div>
              <div className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">{n.body}</div>
              <div className="text-[11px] text-[#9CA3AF] mt-1">{n.time}</div>
            </div>
            {n.unread && <div className="w-2 h-2 rounded-full bg-[#F97316] shrink-0 mt-1.5" />}
          </div>
        ))}
        {list.length === 0 && <div className="px-4 py-8 text-center text-sm text-[#6B7280]">No notifications</div>}
      </div>
    </div>
  );
}

/* ─── Placeholder ───────────────────────────────────────────────── */
function PlaceholderTab({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="text-center py-16 px-6 bg-white rounded-[14px] border border-[#E5E7EB]">
      <div className="text-[52px] mb-3">{icon}</div>
      <div className="text-lg font-bold text-[#111827]">{label}</div>
      <div className="text-[13px] text-[#6B7280] mt-1.5">This section is coming in the next screen build.</div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function BuyerDashboardPage() {
  const [active, setActive] = useState("overview");
  const { data: stats } = useFetch<BuyerStats>("/api/buyer/stats");
  const { data: orders } = useFetch<Order[]>("/api/buyer/orders");
  const { data: bids } = useFetch<Bid[]>("/api/buyer/bids");
  const { data: notifs } = useFetch<Notification[]>("/api/buyer/notifications");
  const { data: authUser } = useFetch<{ id: string; name: string; email: string; phone?: string; isVerified?: boolean; joined?: string }>("/api/auth/me");

  const user: UserProfile = authUser
    ? {
        name: authUser.name,
        email: authUser.email,
        phone: authUser.phone,
        avatar: authUser.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
        joined: authUser.joined
          ? new Date(authUser.joined).toLocaleDateString("en-NG", { month: "long", year: "numeric" })
          : "Recently",
        verified: authUser.isVerified ?? false,
      }
    : {
        name: "Guest",
        email: "",
        avatar: "??",
        joined: "",
        verified: false,
      };

  const notifCount = notifs?.filter((n) => n.unread).length || 0;

  const renderContent = () => {
    switch (active) {
      case "overview": return <Overview setActive={setActive} stats={stats} orders={orders} bids={bids} notifs={notifs} loading={!stats && !orders} user={user} />;
      case "orders": return <OrdersTab />;
      case "bids": return <BidsTab />;
      case "watchlist": return <WatchlistTab />;
      case "notifs": return <NotifsTab />;
      case "messages": return <PlaceholderTab icon="💬" label="Messages" />;
      case "settings": return <PlaceholderTab icon="⚙️" label="Account settings" />;
      default: return <Overview setActive={setActive} stats={stats} orders={orders} bids={bids} notifs={notifs} loading={!stats && !orders} user={user} />;
    }
  };

  return (
    <>
      <div className="max-w-[1280px] mx-auto px-4">
        <div className="flex gap-5 items-start">
          <Sidebar active={active} setActive={setActive} user={user} notifCount={notifCount} />
          <div className="flex-1 min-w-0 pb-20 lg:pb-0">
            <div key={active} className="animate-fadeIn">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
      <MobileNav active={active} setActive={setActive} notifCount={notifCount} />
    </>
  );
}