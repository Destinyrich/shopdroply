"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/Sidebar";

/* ─── Types ─────────────────────────────────────────────────────── */
interface AdminStats {
  totalUsers: number;
  totalSellers: number;
  pendingKyc: number;
  totalListings: number;
  activeListings: number;
  totalOrders: number;
  pendingOrders: number;
  disputedOrders: number;
  gmv30d: number;
  escrowHeld: number;
  commissionRevenue: number;
  revenueDaily: { label: string; value: number }[];
  commissionDaily: { label: string; value: number }[];
  ordersByStatus: { status: string; count: number }[];
  newUsersDaily: { label: string; value: number }[];
  recentOrders: {
    id: string;
    buyerName?: string;
    items: { title: string; image: string; price: number }[];
    status: string;
    total: number;
    createdAt: string;
  }[];
  pendingKycUsers: {
    userId: string;
    name: string;
    email: string;
    tier: string;
    submittedAt?: string;
  }[];
}

/* ─── Helpers ───────────────────────────────────────────────────── */
const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;

const C = {
  orange: "#F97316", green: "#16A34A", red: "#DC2626",
  amber: "#D97706", blue: "#2563EB", purple: "#7C3AED",
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: C.amber },
  Processing: { label: "Processing", color: C.amber },
  shipped: { label: "Shipped", color: C.blue },
  "In transit": { label: "In transit", color: C.blue },
  Delivered: { label: "Delivered", color: C.green },
  "Confirm receipt": { label: "Confirm receipt", color: C.green },
  dispute: { label: "Dispute", color: C.red },
  cancelled: { label: "Cancelled", color: "#6B7280" },
  Cancelled: { label: "Cancelled", color: "#6B7280" },
};

/* ─── Toast ─────────────────────────────────────────────────────── */
function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] animate-[fadeUp_0.3s_ease_both]">
      <div className={`px-5 py-3 rounded-[10px] text-sm font-semibold shadow-lg border ${
        type === "success" ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]" : "bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]"
      }`}>
        {msg}
      </div>
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────────── */
function StatCard({ label, value, sub, icon, color, delay, href }: {
  label: string; value: string; sub: string; icon: string; color: string; delay: number; href?: string;
}) {
  const inner = (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5 h-full transition-all hover:border-[#F97316] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] animate-[fadeUp_0.35s_ease_both]"
      style={{ animationDelay: `${delay * 0.07}s` }}>
      <div className="flex justify-between items-start mb-3">
        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-lg" style={{ background: color + "15", color }}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-extrabold text-[#111827] mb-1">{value}</div>
      <div className="text-xs text-[#6B7280] font-medium">{label}</div>
      {sub && <div className="text-[11px] font-semibold mt-1" style={{ color }}>{sub}</div>}
    </div>
  );
  return href ? <Link href={href} className="no-underline block h-full">{inner}</Link> : inner;
}

/* ─── GMV / Commission chart ────────────────────────────────────── */
function RevenueChart({ revenue, commission }: { revenue: { label: string; value: number }[]; commission: { label: string; value: number }[] }) {
  const max = Math.max(...revenue.map((d) => d.value), ...commission.map((d) => d.value), 1);
  const revTotal = revenue.reduce((s, d) => s + d.value, 0);
  const comTotal = commission.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-5">
        <div>
          <div className="text-base font-bold text-[#111827]">Marketplace volume — last 30 days</div>
          <div className="text-xs text-[#6B7280]">Gross merchandise value vs platform commission</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold text-[#F97316]">{naira(revTotal)}</div>
          <div className="text-[11px] font-semibold text-[#16A34A]">{naira(comTotal)} commission</div>
        </div>
      </div>
      <div className="flex items-end gap-[3px] h-[150px] px-1">
        {revenue.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-[2px] min-w-0 h-full justify-end">
            <div className="flex gap-[2px] items-end h-[125px]">
              <div className="w-full max-w-[10px] rounded-t-[3px] bg-[#F97316] transition-all"
                style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 3 : 1)}%`, opacity: 0.7 }}
                title={`GMV ${d.label}: ${naira(d.value)}`} />
              <div className="w-full max-w-[10px] rounded-t-[3px] bg-[#16A34A] transition-all"
                style={{ height: `${Math.max(((commission[i]?.value || 0) / max) * 100, commission[i]?.value > 0 ? 3 : 1)}%`, opacity: 0.8 }}
                title={`Commission ${d.label}: ${naira(commission[i]?.value || 0)}`} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between px-1 mt-2 text-[10px] font-semibold text-[#9CA3AF]">
        {revenue.map((d, i) => (
          <span key={i} className="flex-1 text-center min-w-0">
            {i % 5 === 0 || i === revenue.length - 1 ? d.label.split(" ")[0] : ""}
          </span>
        ))}
      </div>
      <div className="flex gap-4 mt-3 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#F97316]" />
          <span className="text-[11px] text-[#6B7280]">GMV</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#16A34A]" />
          <span className="text-[11px] text-[#6B7280]">Commission</span>
        </div>
      </div>
    </div>
  );
}

/* ─── New users mini chart ──────────────────────────────────────── */
function NewUsersChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5">
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="text-sm font-bold text-[#111827]">New signups</div>
          <div className="text-xs text-[#6B7280]">Last 7 days</div>
        </div>
        <div className="text-lg font-extrabold text-[#2563EB]">{total}</div>
      </div>
      <div className="flex items-end gap-2 h-[110px] px-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
            <div className="w-full max-w-[28px] rounded-t-md bg-[#2563EB] transition-all"
              style={{ height: `${Math.max((d.value / max) * 85, d.value > 0 ? 4 : 2)}px`, opacity: 0.6 + (d.value / max) * 0.4 }}
              title={`${d.label}: ${d.value} users`} />
            <div className="text-[10px] text-[#6B7280] font-semibold">{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Orders by status ──────────────────────────────────────────── */
function OrdersByStatus({ data }: { data: { status: string; count: number }[] }) {
  const total = Math.max(data.reduce((s, d) => s + d.count, 0), 1);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5">
      <div className="mb-4">
        <div className="text-sm font-bold text-[#111827]">Orders by status</div>
        <div className="text-xs text-[#6B7280]">All time</div>
      </div>
      <div className="flex flex-col gap-3">
        {data.map((d) => {
          const meta = STATUS_META[d.status] || { label: d.status, color: "#6B7280" };
          return (
            <div key={d.status}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[12px] font-semibold text-[#374151]">{meta.label}</span>
                <span className="text-[12px] font-bold" style={{ color: meta.color }}>
                  {d.count} <span className="text-[#9CA3AF] font-semibold">({Math.round((d.count / total) * 100)}%)</span>
                </span>
              </div>
              <div className="h-[10px] bg-[#F9FAFB] border border-[#F3F4F6] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(d.count / total) * 100}%`, background: meta.color }} />
              </div>
            </div>
          );
        })}
        {data.length === 0 && (
          <div className="text-center py-6 text-sm text-[#6B7280]">No orders yet</div>
        )}
      </div>
    </div>
  );
}

/* ─── Recent orders ─────────────────────────────────────────────── */
function RecentOrders({ orders }: { orders: AdminStats["recentOrders"] }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB]">
        <div>
          <div className="text-base font-bold text-[#111827]">Recent orders</div>
          <div className="text-xs text-[#6B7280]">Latest marketplace activity</div>
        </div>
        <Link href="/admin/orders" className="text-xs font-bold text-[#F97316] no-underline hover:underline">View all →</Link>
      </div>
      {orders.length === 0 ? (
        <div className="text-center py-10 text-sm text-[#6B7280]">No orders yet</div>
      ) : (
        <div className="flex flex-col">
          {orders.slice(0, 5).map((order, i) => {
            const meta = STATUS_META[order.status] || STATUS_META.pending;
            const item = order.items?.[0];
            return (
              <div key={order.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-[#F3F4F6] last:border-b-0 hover:bg-[#F9FAFB] transition-colors animate-[fadeUp_0.3s_ease_both]"
                style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="w-10 h-10 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg flex items-center justify-center text-xl shrink-0">
                  {item?.image || "📦"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-[#111827] truncate">{item?.title || "Unknown item"}</div>
                  <div className="text-[11px] text-[#9CA3AF]">{order.id} · {order.buyerName || "Buyer"}</div>
                </div>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0"
                  style={{ color: meta.color, background: meta.color + "12", border: `1px solid ${meta.color}30` }}>
                  {meta.label}
                </span>
                <div className="text-[13px] font-bold text-[#111827] shrink-0 w-24 text-right">{naira(order.total)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Pending KYC queue ─────────────────────────────────────────── */
function KycQueue({ users }: { users: AdminStats["pendingKycUsers"] }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB]">
        <div>
          <div className="text-base font-bold text-[#111827]">Seller KYC queue</div>
          <div className="text-xs text-[#6B7280]">{users.length} awaiting review</div>
        </div>
        <Link href="/admin/kyc" className="text-xs font-bold text-[#F97316] no-underline hover:underline">Review all →</Link>
      </div>
      {users.length === 0 ? (
        <div className="text-center py-10 text-sm text-[#6B7280]">🎉 Queue is clear — no pending verifications</div>
      ) : (
        <div className="flex flex-col">
          {users.slice(0, 4).map((u, i) => (
            <div key={u.userId}
              className="flex items-center gap-3 px-4 py-3 border-b border-[#F3F4F6] last:border-b-0 animate-[fadeUp_0.3s_ease_both]"
              style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="w-9 h-9 rounded-full bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center text-sm shrink-0">
                🪪
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[#111827] truncate">{u.name}</div>
                <div className="text-[11px] text-[#6B7280] truncate">{u.email}</div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA] capitalize shrink-0">
                {u.tier}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Skeleton ──────────────────────────────────────────────────── */
function SkeletonDashboard() {
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
export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/dashboard");
      const data = await res.json();

      if (res.status === 401) {
        router.push("/auth");
        return;
      }
      if (res.status === 403) {
        setToast({ msg: "❌ Admin access required", type: "error" });
        router.push("/");
        return;
      }
      if (data.success) {
        setStats(data.data);
      } else {
        setToast({ msg: `❌ ${data.error || "Failed to load dashboard"}`, type: "error" });
      }
    } catch {
      setToast({ msg: "❌ Failed to load dashboard", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const statCards = useMemo(() => stats ? [
    { label: "Total users", value: stats.totalUsers.toLocaleString(), sub: `${stats.totalSellers} sellers`, icon: "👥", color: C.blue, href: "/admin/users" },
    { label: "GMV (30 days)", value: naira(stats.gmv30d), sub: `${stats.totalOrders} orders all-time`, icon: "🛒", color: C.orange, href: "/admin/orders" },
    { label: "Escrow held", value: naira(stats.escrowHeld), sub: "Funds in trust", icon: "🛡️", color: C.purple, href: "/admin/escrow" },
    { label: "Commission revenue", value: naira(stats.commissionRevenue), sub: "Platform earnings", icon: "💰", color: C.green, href: "/admin/fees" },
  ] : [], [stats]);

  const secondaryStats = useMemo(() => stats ? [
    { label: "Active listings", value: stats.activeListings.toLocaleString(), icon: "📦", color: C.blue, href: "/admin/listings" },
    { label: "Pending orders", value: stats.pendingOrders.toString(), icon: "⏳", color: C.amber, href: "/admin/orders" },
    { label: "Open disputes", value: stats.disputedOrders.toString(), icon: "⚠️", color: C.red, href: "/admin/disputes" },
    { label: "Pending KYC", value: stats.pendingKyc.toString(), icon: "🪪", color: C.purple, href: "/admin/kyc" },
  ] : [], [stats]);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <AdminSidebar activeTab={activeTab} admin={{ id: "", email: "", name: "Super Admin", role: "admin" }} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="lg:pl-[260px] min-h-screen">
        <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] h-16 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden bg-transparent border-none text-xl cursor-pointer p-1">☰</button>
            <h1 className="text-lg font-extrabold text-[#111827]">Admin dashboard</h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] px-2.5 py-0.5 rounded-full font-bold">
              🟢 Platform live
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/reports" className="bg-white border border-[#E5E7EB] text-[#374151] rounded-[10px] px-4 py-2 text-[13px] font-semibold hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all no-underline">
              📥 Export report
            </Link>
          </div>
        </header>

        {loading ? (
          <SkeletonDashboard />
        ) : !stats ? null : (
          <div className="p-4 lg:p-6 max-w-[1200px]">
            <div className="mb-6 animate-[fadeUp_0.35s_ease_both]">
              <div className="text-xl lg:text-[22px] font-extrabold text-[#111827]">
                Marketplace overview 🚀
              </div>
              <div className="text-[13px] text-[#6B7280] mt-0.5">
                Here&apos;s what&apos;s happening across Shopdroply today.
              </div>
            </div>

            {/* Primary stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              {statCards.map((s, i) => (
                <StatCard key={i} {...s} delay={i} />
              ))}
            </div>

            {/* Secondary stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {secondaryStats.map((s, i) => (
                <StatCard key={i} {...s} sub="" delay={i + 4} />
              ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mb-5">
              <RevenueChart revenue={stats.revenueDaily} commission={stats.commissionDaily} />
              <NewUsersChart data={stats.newUsersDaily} />
            </div>

            {/* Tables row */}
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mb-5">
              <RecentOrders orders={stats.recentOrders} />
              <KycQueue users={stats.pendingKycUsers} />
            </div>

            {/* Status breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
              <OrdersByStatus data={stats.ordersByStatus} />
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[12px] p-4 flex items-center gap-3 h-fit">
                <span className="text-xl">💡</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-[#2563EB]">Admin tip</div>
                  <div className="text-xs text-[#1e40af] leading-relaxed">
                    Sellers with the <strong>verified badge</strong> (NIN + BVN) sell 2.3x more than unverified ones.
                    Keep the KYC queue clear to build marketplace trust.
                  </div>
                </div>
                <Link href="/admin/kyc" className="hidden sm:block bg-white border border-[#E5E7EB] text-[#374151] rounded-[10px] px-4 py-2 text-xs font-semibold hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all no-underline shrink-0">
                  Review KYC
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}