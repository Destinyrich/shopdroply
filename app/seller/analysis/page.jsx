"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SellerSidebar from "@/components/seller/Sidebar";

/* ─── Helpers ───────────────────────────────────────────────────── */
const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;

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

/* ─── Toast ─────────────────────────────────────────────────────── */
function Toast({ msg, type, onClose }) {
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
function StatCard({ label, value, change, changeType, icon, color, delay }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5 transition-all hover:border-[#F97316] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] animate-[fadeUp_0.35s_ease_both]"
      style={{ animationDelay: `${delay * 0.08}s` }}>
      <div className="flex justify-between items-start mb-3">
        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-lg" style={{ background: color + "15", color }}>
          {icon}
        </div>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
          changeType === "up" ? "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]" :
          changeType === "down" ? "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]" :
          "bg-[#F9FAFB] text-[#9CA3AF] border-[#E5E7EB]"
        }`}>
          {changeType === "up" ? "↑" : changeType === "down" ? "↓" : "→"} {change}
        </span>
      </div>
      <div className="text-2xl font-extrabold text-[#111827] mb-1">{value}</div>
      <div className="text-xs text-[#6B7280] font-medium">{label}</div>
    </div>
  );
}

/* ─── Revenue Chart (last 30 days) ──────────────────────────────── */
function RevenueChart({ data, total }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const chartTotal = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-5">
        <div>
          <div className="text-base font-bold text-[#111827]">Revenue — last 30 days</div>
          <div className="text-xs text-[#6B7280]">Net earnings per day (escrow released)</div>
        </div>
        <div className="text-xl font-extrabold text-[#F97316]">{naira(chartTotal || total)}</div>
      </div>
      <div className="flex items-end gap-[3px] h-[160px] px-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="w-full max-w-[22px] rounded-t-[4px] bg-[#F97316] transition-all hover:bg-[#EA6C0A]"
              style={{ height: `${Math.max((d.value / max) * 130, d.value > 0 ? 4 : 2)}px`, opacity: 0.55 + (d.value / max) * 0.45 }}
              title={`${d.label}: ${naira(d.value)}`} />
          </div>
        ))}
      </div>
      <div className="flex justify-between px-1 mt-2 text-[10px] font-semibold text-[#9CA3AF]">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center min-w-0">
            {(i % 5 === 0 || i === data.length - 1) ? d.label.split(" ")[0] : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Conversion Funnel ─────────────────────────────────────────── */
function ConversionFunnel({ stats, delivered }) {
  const steps = [
    { label: "Listing views", value: stats.totalViews, color: C.blue, icon: "👁" },
    { label: "Watchers", value: stats.totalWatchers, color: C.purple, icon: "❤️" },
    { label: "Orders placed", value: stats.totalOrders, color: C.orange, icon: "🛒" },
    { label: "Completed sales", value: delivered, color: C.green, icon: "✅" },
  ];
  const max = Math.max(steps[0].value, 1);

  const conv = (a, b) => (a > 0 ? ((b / a) * 100).toFixed(1) : "0.0");

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden">
      <div className="p-4 border-b border-[#E5E7EB]">
        <div className="text-base font-bold text-[#111827]">Conversion funnel</div>
        <div className="text-xs text-[#6B7280]">How shoppers move from browsing to buying</div>
      </div>
      <div className="p-4 flex flex-col gap-3">
        {steps.map((step, i) => (
          <div key={step.label}>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#111827]">
                <span>{step.icon}</span> {step.label}
              </div>
              <div className="text-[13px] font-extrabold text-[#111827]">{step.value.toLocaleString()}</div>
            </div>
            <div className="h-[26px] bg-[#F9FAFB] border border-[#F3F4F6] rounded-[8px] overflow-hidden">
              <div className="h-full rounded-[8px] transition-all duration-500"
                style={{ width: `${Math.max((step.value / max) * 100, step.value > 0 ? 3 : 0)}%`, background: step.color }} />
            </div>
            {i < steps.length - 1 && (
              <div className="text-[11px] text-[#9CA3AF] font-semibold mt-1 pl-1">
                ↓ {conv(step.value, steps[i + 1].value)}% convert
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Order Status Breakdown ────────────────────────────────────── */
const STATUS_GROUPS = [
  { key: "pending", label: "Pending", color: C.amber, bg: C.amberLight, border: C.amberBdr, match: ["pending", "Processing"] },
  { key: "shipped", label: "Shipped / In transit", color: C.blue, bg: C.blueLight, border: C.blueBdr, match: ["shipped", "In transit"] },
  { key: "delivered", label: "Delivered", color: C.green, bg: C.greenLight, border: C.greenBdr, match: ["Delivered", "Confirm receipt"] },
  { key: "dispute", label: "Disputes", color: C.red, bg: C.redLight, border: C.redBdr, match: ["dispute"] },
  { key: "cancelled", label: "Cancelled", color: C.textSub, bg: "#fff", border: C.border, match: ["cancelled", "Cancelled"] },
];

function StatusBreakdown({ orders }) {
  const counts = useMemo(() => {
    return STATUS_GROUPS.map((g) => ({
      ...g,
      count: orders.filter((o) => g.match.includes(o.status)).length,
    }));
  }, [orders]);
  const total = Math.max(orders.length, 1);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden">
      <div className="p-4 border-b border-[#E5E7EB]">
        <div className="text-base font-bold text-[#111827]">Orders by status</div>
        <div className="text-xs text-[#6B7280]">{orders.length} orders in the last 30 days</div>
      </div>
      <div className="p-4 flex flex-col gap-3.5">
        {counts.map((g) => (
          <div key={g.key}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[12px] font-semibold text-[#374151]">{g.label}</span>
              <span className="text-[12px] font-bold" style={{ color: g.color }}>
                {g.count} <span className="text-[#9CA3AF] font-semibold">({Math.round((g.count / total) * 100)}%)</span>
              </span>
            </div>
            <div className="h-[10px] bg-[#F9FAFB] border border-[#F3F4F6] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(g.count / total) * 100}%`, background: g.color }} />
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <div className="text-center py-6 text-sm text-[#6B7280]">No orders in this period yet</div>
        )}
      </div>
    </div>
  );
}

/* ─── Top Listings ──────────────────────────────────────────────── */
function TopListings({ listings }) {
  const top = useMemo(
    () => [...listings].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5),
    [listings]
  );

  const maxViews = Math.max(...top.map((l) => l.views || 0), 1);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB]">
        <div>
          <div className="text-base font-bold text-[#111827]">Top performing listings</div>
          <div className="text-xs text-[#6B7280]">Ranked by views</div>
        </div>
        <Link href="/seller/listings" className="text-xs font-bold text-[#F97316] no-underline hover:underline">View all →</Link>
      </div>
      {top.length === 0 ? (
        <div className="text-center py-10 text-sm text-[#6B7280]">
          <div className="text-3xl mb-2">📦</div>No listings yet — create your first one!
        </div>
      ) : (
        <div className="flex flex-col">
          {top.map((item, i) => (
            <Link key={item.id} href={`/seller/listings/${item.id}`}
              className="flex items-center gap-3 px-4 py-3 border-b border-[#F3F4F6] last:border-b-0 hover:bg-[#F9FAFB] transition-colors no-underline animate-[fadeUp_0.3s_ease_both]"
              style={{ animationDelay: `${i * 0.06}s` }}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${
                i === 0 ? "bg-[#F97316] text-white" : i === 1 ? "bg-[#FDBA74] text-white" : i === 2 ? "bg-[#FED7AA] text-[#9A3412]" : "bg-[#F3F4F6] text-[#6B7280]"
              }`}>
                {i + 1}
              </div>
              <div className="w-10 h-10 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg flex items-center justify-center text-xl shrink-0">
                {item.images?.[0] || "📦"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[#111827] truncate">{item.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 max-w-[120px] h-[6px] bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div className="h-full bg-[#F97316] rounded-full" style={{ width: `${((item.views || 0) / maxViews) * 100}%` }} />
                  </div>
                  <span className="text-[11px] text-[#6B7280] font-semibold">👁 {item.views || 0} · ❤️ {item.watchers || 0}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[13px] font-bold text-[#111827]">{naira(item.price)}</div>
                <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                  item.status === "active" ? "text-[#16A34A] bg-[#F0FDF4] border-[#BBF7D0]" :
                  item.status === "sold" ? "text-[#2563EB] bg-[#EFF6FF] border-[#BFDBFE]" :
                  "text-[#6B7280] bg-[#F9FAFB] border-[#E5E7EB]"
                }`}>
                  ● {item.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Month-over-month card ─────────────────────────────────────── */
function MonthComparison({ earnings }) {
  const monthStats = useMemo(() => {
    const now = new Date();
    const startThis = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startLast = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const sum = (from, to) =>
      earnings
        .filter((e) => e.netAmount >= 0)
        .filter((e) => { const t = new Date(e.createdAt).getTime(); return t >= from && t < to; })
        .reduce((s, e) => s + e.netAmount, 0);
    const thisMonth = sum(startThis, Date.now() + 1);
    const lastMonth = sum(startLast, startThis);
    const change = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;
    return { thisMonth, lastMonth, change };
  }, [earnings]);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5">
      <div className="text-sm font-bold text-[#111827] mb-2.5">This month</div>
      <div className="text-[26px] font-extrabold text-[#111827] mb-1">{naira(monthStats.thisMonth)}</div>
      <div className="text-xs font-semibold mb-4" style={{ color: monthStats.change >= 0 ? "#16A34A" : "#DC2626" }}>
        {monthStats.change >= 0 ? "↑" : "↓"} {Math.abs(monthStats.change).toFixed(1)}% vs last month ({naira(monthStats.lastMonth)})
      </div>
      <div className="border-t border-[#E5E7EB] pt-3 flex flex-col gap-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-[#6B7280]">Last month</span>
          <span className="text-[#374151] font-semibold">{naira(monthStats.lastMonth)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[#6B7280]">Growth</span>
          <span className="font-bold" style={{ color: monthStats.change >= 0 ? "#16A34A" : "#DC2626" }}>
            {monthStats.change >= 0 ? "+" : ""}{monthStats.change.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Peak day card ─────────────────────────────────────────────── */
function PeakDayCard({ earnings }) {
  const peak = useMemo(() => {
    const dayTotals = {};
    let total = 0;
    earnings.filter((e) => e.netAmount >= 0).forEach((e) => {
      const day = new Date(e.createdAt).toLocaleDateString("en-NG", { weekday: "long" });
      dayTotals[day] = (dayTotals[day] || 0) + e.netAmount;
      total += e.netAmount;
    });
    const entries = Object.entries(dayTotals).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return null;
    const [name, value] = entries[0];
    return { name, value, share: total > 0 ? ((value / total) * 100).toFixed(0) : "0" };
  }, [earnings]);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5">
      <div className="text-sm font-bold text-[#111827] mb-2.5">Peak sales day</div>
      {peak ? (
        <>
          <div className="text-[26px] font-extrabold text-[#F97316] mb-1">{peak.name}s</div>
          <div className="text-xs text-[#6B7280]">
            {naira(peak.value)} earned — about {peak.share}% of your total revenue
          </div>
        </>
      ) : (
        <div className="text-xs text-[#6B7280]">Not enough sales data yet</div>
      )}
    </div>
  );
}

/* ─── Insights ──────────────────────────────────────────────────── */
function Insights({ stats, listings, delivered, orders }) {
  const insights = useMemo(() => {
    const out = [];
    const top = [...listings].sort((a, b) => (b.views || 0) - (a.views || 0))[0];

    if (top && (top.views || 0) >= 20 && (top.watchers || 0) <= 2) {
      out.push({
        icon: "🎯", tone: "orange",
        title: `"${top.title.length > 30 ? top.title.slice(0, 30) + "…" : top.title}" is getting views`,
        body: `${top.views} views but only ${top.watchers} watchers. Consider sharper photos, a clearer title, or a small price adjustment.`,
      });
    }
    if (stats.pendingOrders > 2) {
      out.push({
        icon: "🚚", tone: "blue",
        title: `${stats.pendingOrders} orders waiting to ship`,
        body: "Shipping quickly builds buyer trust and speeds up escrow release. Head to Orders to dispatch them.",
      });
    }
    const conversion = stats.totalViews > 0 ? (stats.totalOrders / stats.totalViews) * 100 : 0;
    if (stats.totalViews > 50 && conversion < 2) {
      out.push({
        icon: "📈", tone: "green",
        title: `Conversion is ${conversion.toFixed(1)}%`,
        body: "Views are strong but sales lag. Detailed descriptions, 4+ photos, and competitive pricing typically lift conversion to 3–5%.",
      });
    }
    if (delivered > 0 && orders.length > 0 && delivered / orders.length >= 0.8) {
      out.push({
        icon: "🏆", tone: "green",
        title: "Excellent fulfilment rate",
        body: `${Math.round((delivered / orders.length) * 100)}% of your orders complete successfully. Keep it up — this drives repeat buyers.`,
      });
    }
    if (out.length === 0) {
      out.push({
        icon: "💡", tone: "orange",
        title: "Building your data",
        body: "As sales and views come in, Shopdroply will surface personalised insights here to help you grow.",
      });
    }
    return out.slice(0, 3);
  }, [stats, listings, delivered, orders]);

  const toneStyles = {
    orange: "border-[#FED7AA] bg-[#FFF7ED]",
    blue: "border-[#BFDBFE] bg-[#EFF6FF]",
    green: "border-[#BBF7D0] bg-[#F0FDF4]",
  };

  return (
    <div className="flex flex-col gap-3">
      {insights.map((ins, i) => (
        <div key={i} className={`border rounded-[12px] p-4 animate-[fadeUp_0.3s_ease_both] ${toneStyles[ins.tone]}`}
          style={{ animationDelay: `${i * 0.06}s` }}>
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">{ins.icon}</span>
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-[#111827] mb-0.5">{ins.title}</div>
              <div className="text-xs text-[#6B7280] leading-relaxed">{ins.body}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Skeleton Loader ───────────────────────────────────────────── */
function SkeletonAnalytics() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-8 w-56 bg-[#E5E7EB] rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-white border border-[#E5E7EB] rounded-[14px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <div className="h-72 bg-white border border-[#E5E7EB] rounded-[14px]" />
        <div className="h-72 bg-white border border-[#E5E7EB] rounded-[14px]" />
      </div>
    </div>
  );
}

/* ─── Main Export ───────────────────────────────────────────────── */
export default function SellerAnalyticsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("analytics");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [seller, setSeller] = useState(null);
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [listings, setListings] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
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

      // Load all analytics data in parallel
      const [statsRes, ordersRes, listingsRes, earningsRes] = await Promise.all([
        fetch("/api/seller/stats"),
        fetch("/api/seller/orders?limit=50"),
        fetch("/api/seller/listings"),
        fetch("/api/seller/earnings"),
      ]);

      const [statsData, ordersData, listingsData, earningsData] = await Promise.all([
        statsRes.json(),
        ordersRes.json(),
        listingsRes.json(),
        earningsRes.json(),
      ]);

      if (statsData.success) setStats(statsData.data);
      if (ordersData.success) setOrders(ordersData.data);
      if (listingsData.success) setListings(listingsData.data);
      if (earningsData.success) {
        // Supports both shapes: a bare array or { earnings, chart, availableBalance }
        const d = earningsData.data;
        setEarnings(Array.isArray(d) ? d : d.earnings || []);
      }
    } catch (err) {
      console.error("Failed to load analytics", err);
      setToast({ msg: "❌ Failed to load analytics data", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  /* ── Computed data ── */
  const dailyRevenue = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      days.push({
        label: d.toLocaleDateString("en-NG", { day: "numeric", month: "short" }),
        value: 0,
        date: d,
      });
    }
    earnings
      .filter((e) => e.netAmount >= 0)
      .forEach((e) => {
        const t = new Date(e.createdAt);
        const day = days.find((dd) => dd.date.toDateString() === t.toDateString());
        if (day) day.value += e.netAmount;
      });
    return days.map(({ label, value }) => ({ label, value }));
  }, [earnings]);

  const deliveredCount = useMemo(
    () => orders.filter((o) => o.status === "Delivered" || o.status === "Confirm receipt").length,
    [orders]
  );

  const hasActivity = stats && (stats.totalViews > 0 || stats.totalOrders > 0 || earnings.length > 0);

  const statCards = stats
    ? [
        { label: "Total revenue", value: naira(stats.totalRevenue || 0), change: "+8.5%", changeType: "up", icon: "💰", color: C.orange },
        { label: "Total orders", value: stats.totalOrders.toString(), change: "+12%", changeType: "up", icon: "🛒", color: C.blue },
        {
          label: "Avg order value",
          value: naira(stats.totalOrders > 0 ? Math.round((stats.totalRevenue || 0) / stats.totalOrders) : 0),
          change: "vs 30d", changeType: "neutral", icon: "🧾", color: C.purple,
        },
        { label: "Listing views", value: stats.totalViews.toLocaleString(), change: "+18%", changeType: "up", icon: "👁", color: C.green },
      ]
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] lg:pl-[260px]">
        <SkeletonAnalytics />
      </div>
    );
  }

  if (!seller) return null;

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <SellerSidebar activeTab={activeTab} seller={seller} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="lg:pl-[260px] min-h-screen">
        <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] h-16 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden bg-transparent border-none text-xl cursor-pointer p-1">☰</button>
            <h1 className="text-lg font-extrabold text-[#111827]">Analytics</h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#6B7280] bg-[#F9FAFB] border border-[#E5E7EB] px-2.5 py-0.5 rounded-full font-bold">
              📅 Last 30 days
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
              Store performance 📈
            </div>
            <div className="text-[13px] text-[#6B7280] mt-0.5">
              Track how your store is performing and where to focus next.
            </div>
          </div>

          {!hasActivity ? (
            <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-10 text-center animate-[fadeUp_0.35s_ease_both]">
              <div className="text-4xl mb-3">📊</div>
              <div className="text-lg font-extrabold text-[#111827] mb-1">No analytics data yet</div>
              <div className="text-sm text-[#6B7280] max-w-md mx-auto leading-relaxed">
                Once your listings get views and your first orders come in, your revenue charts,
                conversion funnel, and personalised insights will appear here.
              </div>
              <Link href="/seller/listings/new" className="inline-block mt-5 bg-[#F97316] text-white rounded-[10px] px-6 py-2.5 text-sm font-bold hover:bg-[#EA6C0A] transition-all no-underline">
                Create your first listing
              </Link>
            </div>
          ) : (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                {statCards.map((s, i) => (
                  <StatCard key={i} {...s} delay={i} />
                ))}
              </div>

              {/* Revenue chart + side cards */}
              <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mb-5">
                <RevenueChart data={dailyRevenue} total={stats?.revenue30d || 0} />
                <div className="flex flex-col gap-4">
                  <MonthComparison earnings={earnings} />
                  <PeakDayCard earnings={earnings} />
                </div>
              </div>

              {/* Funnel + status breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
                {stats && <ConversionFunnel stats={stats} delivered={deliveredCount} />}
                <StatusBreakdown orders={orders} />
              </div>

              {/* Top listings + insights */}
              <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mb-5">
                <TopListings listings={listings} />
                {stats && <Insights stats={stats} listings={listings} delivered={deliveredCount} orders={orders} />}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
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
}u