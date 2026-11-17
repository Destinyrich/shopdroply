"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SellerSidebar from "@/components/seller/Sidebar";

/* ─── Types ─────────────────────────────────────────────────────── */
interface SellerProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  sellerTier?: string;
  sellerStatus?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
}

interface Order {
  id: string;
  buyerName?: string;
  items: { title: string; image: string; price: number }[];
  status: string;
  total: number;
  createdAt: string;
}

interface Listing {
  id: string;
  title: string;
  price: number;
  views?: number;
  watchers?: number;
  status: string;
  images: string[];
}

interface Activity {
  id: string;
  action: string;
  detail: string;
  time: string;
  icon: string;
  color: string;
}

interface Stats {
  totalSales: number;
  totalOrders: number;
  revenue30d: number;
  activeListings: number;
  pendingOrders: number;
  totalRevenue: number;
  totalViews: number;
  totalWatchers: number;
}

interface EarningsData {
  daily: { day: string; value: number }[];
  total: number;
}

/* ─── Design tokens ─────────────────────────────────────────────── */
const C = {
  orange: "#F97316", orangeLight: "#FFF7ED", orangeBdr: "#FED7AA",
  green: "#16A34A", greenLight: "#F0FDF4", greenBdr: "#BBF7D0",
  red: "#DC2626", redLight: "#FEF2F2", redBdr: "#FECACA",
  amber: "#D97706", amberLight: "#FFFBEB", amberBdr: "#FDE68A",
  blue: "#2563EB", blueLight: "#EFF6FF", blueBdr: "#BFDBFE",
  purple: "#7C3AED", purpleLight: "#F5F3FF",
  bg: "#F9FAFB", border: "#E5E7EB",
  text: "#111827", textMid: "#374151", textSub: "#6B7280", textLight: "#9CA3AF",
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  pending:   { label: "Pending",    color: C.amber,  bg: C.amberLight,  border: C.amberBdr,  icon: "⏳" },
  Processing:{ label: "Processing", color: C.amber,  bg: C.amberLight,  border: C.amberBdr,  icon: "⏳" },
  shipped:   { label: "Shipped",    color: C.blue,   bg: C.blueLight,   border: C.blueBdr,   icon: "🚚" },
  "In transit": { label: "In transit", color: C.blue, bg: C.blueLight, border: C.blueBdr, icon: "🚚" },
  Delivered: { label: "Delivered",  color: C.green,  bg: C.greenLight,  border: C.greenBdr,  icon: "✅" },
  "Confirm receipt": { label: "Confirm", color: C.green, bg: C.greenLight, border: C.greenBdr, icon: "✅" },
  dispute:   { label: "Dispute",    color: C.red,    bg: C.redLight,    border: C.redBdr,    icon: "⚠️" },
  cancelled: { label: "Cancelled",  color: C.textSub,bg: "#fff",        border: C.border,     icon: "❌" },
  Cancelled: { label: "Cancelled",  color: C.textSub,bg: "#fff",        border: C.border,     icon: "❌" },
};

/* ─── Toast ─────────────────────────────────────────────────────── */
function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-[fadeUp_0.3s_ease_both]">
      <div className={`px-5 py-3 rounded-[10px] text-sm font-semibold shadow-[0_4px_24px_rgba(0,0,0,0.12)] border ${
        type === "success" ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]" : "bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]"
      }`}>
        {msg}
      </div>
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────────── */
function StatCard({ label, value, change, changeType, icon, color, delay }: {
  label: string; value: string; change: string; changeType: "up" | "warning" | "neutral";
  icon: string; color: string; delay: number;
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5 transition-all hover:border-[#F97316] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] animate-[fadeUp_0.35s_ease_both]"
      style={{ animationDelay: `${delay * 0.08}s` }}>
      <div className="flex justify-between items-start mb-3">
        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-lg" style={{ background: color + "15", color }}>
          {icon}
        </div>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
          changeType === "up" ? "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]" :
          changeType === "warning" ? "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]" :
          "bg-[#F9FAFB] text-[#9CA3AF] border-[#E5E7EB]"
        }`}>
          {changeType === "up" ? "↑" : changeType === "warning" ? "⚠" : "→"} {change}
        </span>
      </div>
      <div className="text-2xl font-extrabold text-[#111827] mb-1">{value}</div>
      <div className="text-xs text-[#6B7280] font-medium">{label}</div>
    </div>
  );
}

/* ─── Orders Table ──────────────────────────────────────────────── */
function OrdersTable({ orders }: { orders: Order[] }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-[#E5E7EB]">
        <div>
          <div className="text-base font-bold text-[#111827]">Recent orders</div>
          <div className="text-xs text-[#6B7280]">{orders.filter((o) => o.status === "pending" || o.status === "Processing").length} orders awaiting action</div>
        </div>
        <div className="flex gap-1.5">
          {["all", "pending", "shipped", "Delivered"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer capitalize ${
                filter === f ? "bg-[#FFF7ED] text-[#F97316] border-[#F97316]" : "bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#F97316] hover:text-[#F97316]"
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_120px] gap-4 px-4 py-2.5 bg-[#F9FAFB] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
        <div>Order & Item</div><div>Buyer</div><div>Price</div><div>Status</div><div className="text-right">Action</div>
      </div>

      {filtered.map((order, i) => {
        const meta = STATUS_META[order.status] || STATUS_META.pending;
        const item = order.items[0];
        return (
          <div key={order.id}
            className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_120px] gap-2 sm:gap-4 px-4 py-3.5 items-center border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors animate-[fadeUp_0.3s_ease_both]"
            style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg flex items-center justify-center text-xl shrink-0">
                {item?.image || "📦"}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-[#111827] truncate">{item?.title || "Unknown item"}</div>
                <div className="text-[11px] text-[#9CA3AF]">{order.id}</div>
              </div>
            </div>
            <div className="text-[13px] text-[#374151]">{order.buyerName || "Buyer"}</div>
            <div className="text-[13px] font-bold text-[#111827]">₦{order.total.toLocaleString()}</div>
            <div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border"
                style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}>
                {meta.icon} {meta.label}
              </span>
            </div>
            <div className="text-right">
              {order.status === "pending" || order.status === "Processing" ? (
                <button className="bg-[#F97316] text-white rounded-lg px-3 py-1.5 text-[11px] font-bold hover:bg-[#EA6C0A] transition-all cursor-pointer">
                  Ship now
                </button>
              ) : (
                <span className="text-[11px] text-[#9CA3AF]">{new Date(order.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>
              )}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="text-center py-10 text-sm text-[#6B7280]">No orders in this status</div>
      )}

      <div className="p-3 border-t border-[#E5E7EB] text-center">
        <Link href="/seller/orders" className="inline-flex items-center justify-center bg-white border border-[#E5E7EB] text-[#374151] rounded-[10px] px-5 py-2 text-[13px] font-semibold hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all no-underline">
          View all orders →
        </Link>
      </div>
    </div>
  );
}

/* ─── Listings Preview ──────────────────────────────────────────── */
function ListingsPreview({ listings }: { listings: Listing[] }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB]">
        <div>
          <div className="text-base font-bold text-[#111827]">Active listings</div>
          <div className="text-xs text-[#6B7280]">{listings.length} items currently live</div>
        </div>
        <Link href="/seller/listings/new" className="bg-white border border-[#E5E7EB] text-[#374151] rounded-[10px] px-3 py-1.5 text-[12px] font-semibold hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all no-underline">
          + Add new
        </Link>
      </div>

      <div className="flex flex-col">
        {listings.slice(0, 4).map((item, i) => (
          <Link key={item.id} href={`/product/${item.id}`}
            className="flex items-center gap-3 px-4 py-3 border-b border-[#E5E7EB] last:border-b-0 hover:bg-[#F9FAFB] transition-colors no-underline animate-[fadeUp_0.3s_ease_both]"
            style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="w-12 h-12 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[10px] flex items-center justify-center text-2xl shrink-0">
              {item.images[0] || "📦"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-[#111827] truncate">{item.title}</div>
              <div className="text-[11px] text-[#6B7280]">👁 {item.views || 0} views · ❤️ {item.watchers || 0} watchers</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-bold text-[#111827]">₦{item.price.toLocaleString()}</div>
              <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                item.status === "active" ? "text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0]" :
                item.status === "sold" ? "text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE]" :
                "text-[#6B7280] bg-[#F9FAFB] border border-[#E5E7EB]"
              }`}>
                ● {item.status}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="p-3 border-t border-[#E5E7EB] text-center">
        <Link href="/seller/listings" className="inline-flex items-center justify-center bg-white border border-[#E5E7EB] text-[#374151] rounded-[10px] px-5 py-2 text-[13px] font-semibold hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all no-underline">
          Manage all listings →
        </Link>
      </div>
    </div>
  );
}

/* ─── Activity Feed ─────────────────────────────────────────────── */
function ActivityFeed({ activities }: { activities: Activity[] }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden">
      <div className="p-4 border-b border-[#E5E7EB]">
        <div className="text-base font-bold text-[#111827]">Recent activity</div>
        <div className="text-xs text-[#6B7280]">Last 24 hours</div>
      </div>
      <div className="py-1">
        {activities.map((activity, i) => (
          <div key={activity.id}
            className="flex items-start gap-3 px-4 py-3 border-b border-[#E5E7EB] last:border-b-0 animate-[fadeUp_0.3s_ease_both]"
            style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5"
              style={{ background: activity.color + "15", color: activity.color }}>
              {activity.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-[#111827]">{activity.action}</div>
              <div className="text-xs text-[#6B7280] mt-0.5">{activity.detail}</div>
            </div>
            <div className="text-[11px] text-[#9CA3AF] shrink-0 whitespace-nowrap">{activity.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Quick Actions ─────────────────────────────────────────────── */
function QuickActions() {
  const actions = [
    { icon: "📦", label: "Create listing", desc: "Add a new product", color: C.orange, href: "/seller/listings/new" },
    { icon: "🚚", label: "Ship orders", desc: "7 pending", color: C.blue, href: "/seller/orders" },
    { icon: "💬", label: "Review offers", desc: "3 new offers", color: C.green, href: "/seller/offers" },
    { icon: "💰", label: "Withdraw funds", desc: "₦0 available", color: C.purple, href: "/seller/earnings" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {actions.map((action, i) => (
        <Link key={i} href={action.href}
          className="bg-white border border-[#E5E7EB] rounded-[14px] p-4 text-center transition-all hover:border-[#F97316] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] no-underline animate-[fadeUp_0.3s_ease_both]"
          style={{ animationDelay: `${i * 0.06}s` }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mx-auto mb-2.5"
            style={{ background: action.color + "12", color: action.color }}>
            {action.icon}
          </div>
          <div className="text-[13px] font-bold text-[#111827]">{action.label}</div>
          <div className="text-[11px] text-[#6B7280] mt-0.5">{action.desc}</div>
        </Link>
      ))}
    </div>
  );
}

/* ─── Earnings Chart ────────────────────────────────────────────── */
function EarningsChart({ data, total }: { data: { day: string; value: number }[]; total: number }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5">
      <div className="flex justify-between items-center mb-5">
        <div>
          <div className="text-base font-bold text-[#111827]">Revenue this week</div>
          <div className="text-xs text-[#6B7280]">Last 7 days</div>
        </div>
        <div className="text-xl font-extrabold text-[#F97316]">₦{total.toLocaleString()}</div>
      </div>
      <div className="flex items-end gap-2 h-[140px] px-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full max-w-[40px] bg-[#F97316] rounded-t-md transition-all"
              style={{ height: `${(d.value / max) * 120}px`, opacity: 0.7 + (d.value / max) * 0.3 }} />
            <div className="text-[11px] text-[#6B7280] font-semibold">{d.day}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Skeleton Loader ───────────────────────────────────────────── */
function SkeletonDashboard() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-8 w-48 bg-[#E5E7EB] rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-white border border-[#E5E7EB] rounded-[14px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <div className="h-64 bg-white border border-[#E5E7EB] rounded-[14px]" />
        <div className="h-64 bg-white border border-[#E5E7EB] rounded-[14px]" />
      </div>
    </div>
  );
}

/* ─── Main Export ───────────────────────────────────────────────── */
export default function SellerDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [earnings, setEarnings] = useState<{ daily: { day: string; value: number }[]; total: number }>({ daily: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      // Check seller profile first
      const profileRes = await fetch("/api/seller/me");
      const profileData = await profileRes.json();

      if (!profileData.success || !profileData.data) {
        router.push("/seller/onboarding");
        return;
      }
      setSeller(profileData.data);

      // Gate: don't load dashboard data until admin has approved this seller
      if (profileData.data.sellerStatus !== "approved") {
        setLoading(false);
        return;
      }

      // Load all dashboard data in parallel
      const [statsRes, ordersRes, listingsRes, activitiesRes, earningsRes] = await Promise.all([
        fetch("/api/seller/stats"),
        fetch("/api/seller/orders?limit=5"),
        fetch("/api/seller/listings"),
        fetch("/api/seller/activities?limit=5"),
        fetch("/api/seller/earnings"),
      ]);

      const [statsData, ordersData, listingsData, activitiesData, earningsData] = await Promise.all([
        statsRes.json(),
        ordersRes.json(),
        listingsRes.json(),
        activitiesRes.json(),
        earningsRes.json(),
      ]);

      if (statsData.success) setStats(statsData.data);
      if (ordersData.success) setOrders(ordersData.data);
      if (listingsData.success) setListings(listingsData.data);
      if (activitiesData.success) setActivities(activitiesData.data);
      if (earningsData.success) {
        setEarnings({
          daily: earningsData.data.chart?.daily || [],
          total: earningsData.data.chart?.total || 0,
        });
      }
    } catch (err) {
      console.error("Failed to load dashboard", err);
      setToast({ msg: "❌ Failed to load dashboard data", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] lg:pl-[260px]">
        <SkeletonDashboard />
      </div>
    );
  }

  if (!seller) return null;

  if (seller.sellerStatus !== "approved") {
    const isRejected = seller.sellerStatus === "rejected";
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] bg-white border border-[#E5E7EB] rounded-[16px] p-8 text-center shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
          <div className="w-14 h-14 mx-auto rounded-[14px] bg-[#F9FAFB] flex items-center justify-center text-2xl mb-4">
            {isRejected ? "❌" : "⏳"}
          </div>
          <h1 className="text-lg font-extrabold text-[#111827] mb-2">
            {isRejected ? "Verification declined" : "Application under review"}
          </h1>
          <p className="text-[13px] text-[#6B7280] leading-relaxed mb-6">
            {isRejected
              ? "Your seller verification was declined. Check your notifications for the reason, then update your details and re-apply."
              : "Thanks for submitting your seller details. An admin is reviewing your application — this usually doesn't take long. You'll get a notification the moment it's approved."}
          </p>
          <Link
            href={isRejected ? "/seller/onboarding" : "/buyer/dashboard"}
            className="inline-block px-5 py-2.5 rounded-[10px] text-sm font-bold text-white bg-[#F97316] hover:bg-[#EA6C0A] transition-all no-underline"
          >
            {isRejected ? "Update & re-apply" : "Back to your account"}
          </Link>
        </div>
      </div>
    );
  }

  const pendingOrdersChangeType = stats && stats.pendingOrders > 5 ? "warning" as const : "up" as const;

  const statCards = stats ? [
    { label: "Total sales", value: stats.totalSales.toString(), change: "+12%", changeType: "up" as const, icon: "💰", color: C.green },
    { label: "Revenue (30 days)", value: `₦${stats.revenue30d.toLocaleString()}`, change: "+8.5%", changeType: "up" as const, icon: "📈", color: C.orange },
    { label: "Active listings", value: stats.activeListings.toString(), change: "+3", changeType: "up" as const, icon: "📦", color: C.blue },
    { label: "Pending orders", value: stats.pendingOrders.toString(), change: stats.pendingOrders > 5 ? "2 urgent" : "On track", changeType: pendingOrdersChangeType, icon: "⏳", color: C.amber },
  ] : [];

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <SellerSidebar activeTab={activeTab} seller={seller} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="lg:pl-[260px] min-h-screen">
        <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] h-16 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden bg-transparent border-none text-xl cursor-pointer p-1">☰</button>
            <h1 className="text-lg font-extrabold text-[#111827]">Dashboard</h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] px-2.5 py-0.5 rounded-full font-bold">
              🟢 Store active
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/seller/listings/new" className="bg-[#F97316] text-white rounded-[10px] px-4 py-2 text-[13px] font-bold hover:bg-[#EA6C0A] transition-all no-underline">
              + Create listing
            </Link>
          </div>
        </header>

        <div className="p-4 lg:p-6 max-w-[1200px]">
          <div className="mb-6 animate-[fadeUp_0.35s_ease_both]">
            <div className="text-xl lg:text-[22px] font-extrabold text-[#111827]">
              Good morning, {seller.name?.split(" ")[0] || "Seller"}! 👋
            </div>
            <div className="text-[13px] text-[#6B7280] mt-0.5">
              Here&apos;s what&apos;s happening with your store today.
            </div>
          </div>

          <div className="mb-5">
            <QuickActions />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {statCards.map((s, i) => (
              <StatCard key={i} {...s} delay={i} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mb-5">
            <div className="flex flex-col gap-4">
              <OrdersTable orders={orders} />
              <EarningsChart data={earnings.daily} total={earnings.total} />
            </div>
            <div className="flex flex-col gap-4">
              <ListingsPreview listings={listings} />
              <ActivityFeed activities={activities} />
            </div>
          </div>

          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[12px] p-4 flex items-center gap-3 animate-[fadeUp_0.35s_ease_both]">
            <span className="text-xl">💡</span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-[#2563EB]">Tip: Boost your sales</div>
              <div className="text-xs text-[#1e40af] leading-relaxed">
                Listings with professional photos get <strong>3x more views</strong>. Add 4+ clear images to your top products.
              </div>
            </div>
            <button className="hidden sm:block bg-white border border-[#E5E7EB] text-[#374151] rounded-[10px] px-4 py-2 text-xs font-semibold hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all cursor-pointer shrink-0">
              Learn more
            </button>
          </div>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] px-2 py-2 z-[200] flex justify-around lg:hidden">
        {[
          { id: "dashboard", icon: "📊", href: "/seller/dashboard" },
          { id: "listings", icon: "📦", href: "/seller/listings" },
          { id: "orders", icon: "🛒", href: "/seller/orders" },
          { id: "earnings", icon: "💰", href: "/seller/earnings" },
          { id: "settings", icon: "⚙️", href: "/seller/settings" },
        ].map((item) => (
          <Link key={item.id} href={item.href}
            className={`p-2 text-xl transition-colors no-underline ${activeTab === item.id ? "text-[#F97316]" : "text-[#9CA3AF]"}`}
            onClick={() => setActiveTab(item.id)}>
            {item.icon}
          </Link>
        ))}
      </nav>
      <div className="h-16 lg:hidden" />
    </div>
  );
}
