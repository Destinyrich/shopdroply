"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/Sidebar";

/* ─── Types ─────────────────────────────────────────────────────── */
interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  isVerified: boolean;
  role?: "buyer" | "seller" | "admin";
  sellerTier?: "individual" | "verified" | "business";
  sellerStatus?: "pending" | "approved" | "rejected";
  accountStatus?: "active" | "suspended";
  storeBanner?: string;
}

interface UserDetail {
  user: AdminUserItem & { nin?: string; bvn?: string; bankName?: string; accountNumber?: string };
  orders: { id: string; status: string; total: number; createdAt: string }[];
  orderCount: number;
  totalSpent: number;
  buyerStats: { totalOrders: number; escrowTotal: number } | null;
  sellerStats: { totalSales: number; totalRevenue: number; activeListings: number } | null;
}

type Action = "suspend" | "activate" | "approveKyc" | "rejectKyc";

/* ─── Helpers ───────────────────────────────────────────────────── */
const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;

const ROLE_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  buyer:  { label: "Buyer",  color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
  seller: { label: "Seller", color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" },
  admin:  { label: "Admin",  color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
};

const TIER_META: Record<string, { label: string; color: string }> = {
  individual: { label: "👤 Individual", color: "#6B7280" },
  verified:   { label: "✅ Verified",   color: "#16A34A" },
  business:   { label: "🏢 Business",   color: "#F97316" },
};

function userStatus(u: AdminUserItem): { label: string; color: string; bg: string; border: string } {
  if (u.accountStatus === "suspended")
    return { label: "🔴 Suspended", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" };
  if (u.role === "seller" || u.sellerStatus) {
    if (u.sellerStatus === "pending")
      return { label: "⏳ KYC pending", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" };
    if (u.sellerStatus === "rejected")
      return { label: "❌ KYC rejected", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" };
    return { label: "🟢 Verified seller", color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" };
  }
  return u.isVerified
    ? { label: "🟢 Active", color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" }
    : { label: "⚪ Unverified", color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB" };
}

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—";

const initials = (name: string) =>
  name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "??";

/* ─── Toast ─────────────────────────────────────────────────────── */
function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[400] animate-[fadeUp_0.3s_ease_both]">
      <div className={`px-5 py-3 rounded-[10px] text-sm font-semibold shadow-lg border ${
        type === "success" ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]" : "bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]"
      }`}>
        {msg}
      </div>
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────────── */
function StatCard({ label, value, icon, color, delay }: {
  label: string; value: string; icon: string; color: string; delay: number;
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5 transition-all hover:border-[#F97316] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] animate-[fadeUp_0.35s_ease_both]"
      style={{ animationDelay: `${delay * 0.07}s` }}>
      <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-lg mb-3" style={{ background: color + "15", color }}>
        {icon}
      </div>
      <div className="text-2xl font-extrabold text-[#111827] mb-1">{value}</div>
      <div className="text-xs text-[#6B7280] font-medium">{label}</div>
    </div>
  );
}

/* ─── User Detail Modal ─────────────────────────────────────────── */
function UserModal({ userId, onClose, onAction, acting }: {
  userId: string;
  onClose: () => void;
  onAction: (id: string, action: Action) => Promise<boolean>;
  acting: boolean;
}) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}`);
        const data = await res.json();
        if (data.success) setDetail(data.data);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const u = detail?.user;

  return (
    <div className="fixed inset-0 bg-black/50 z-[500] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[20px] max-w-[520px] w-full max-h-[90vh] overflow-y-auto animate-[scaleIn_0.3s_ease_both]" onClick={(e) => e.stopPropagation()}>
        {loading || !u ? (
          <div className="p-8 animate-pulse space-y-4">
            <div className="h-16 w-16 bg-[#E5E7EB] rounded-full" />
            <div className="h-6 w-48 bg-[#E5E7EB] rounded" />
            <div className="h-4 w-full bg-[#E5E7EB] rounded" />
            <div className="h-4 w-2/3 bg-[#E5E7EB] rounded" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-6 border-b border-[#E5E7EB] flex items-start gap-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-extrabold text-white shrink-0 ${
                u.accountStatus === "suspended" ? "bg-[#DC2626]" :
                u.role === "admin" ? "bg-[#7C3AED]" :
                u.role === "seller" ? "bg-[#16A34A]" : "bg-[#2563EB]"
              }`}>
                {initials(u.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-lg font-extrabold text-[#111827]">{u.name}</div>
                <div className="text-[13px] text-[#6B7280] truncate">{u.email}</div>
                <div className="text-[12px] text-[#9CA3AF]">{u.phone || "No phone"} · Joined {fmtDate(u.createdAt)}</div>
              </div>
              <button onClick={onClose} className="bg-transparent border-none text-xl cursor-pointer text-[#9CA3AF] hover:text-[#111827]">✕</button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const role = ROLE_META[u.role || "buyer"];
                  const status = userStatus(u);
                  return (
                    <>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold border" style={{ color: role.color, background: role.bg, borderColor: role.border }}>{role.label}</span>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold border" style={{ color: status.color, background: status.bg, borderColor: status.border }}>{status.label}</span>
                      {u.sellerTier && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold border border-[#E5E7EB] bg-[#F9FAFB]" style={{ color: TIER_META[u.sellerTier]?.color }}>
                          {TIER_META[u.sellerTier]?.label || u.sellerTier}
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* KYC info */}
              {(u.role === "seller" || u.sellerStatus) && (
                <div>
                  <div className="text-[13px] font-bold text-[#111827] mb-2">Verification details</div>
                  <div className="grid grid-cols-2 gap-2 text-[13px]">
                    <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-[10px] p-3">
                      <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide">NIN</div>
                      <div className="font-semibold text-[#374151]">{u.nin || "—"}</div>
                    </div>
                    <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-[10px] p-3">
                      <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide">BVN</div>
                      <div className="font-semibold text-[#374151]">{u.bvn || "—"}</div>
                    </div>
                    {u.bankName && (
                      <div className="col-span-2 bg-[#F9FAFB] border border-[#F3F4F6] rounded-[10px] p-3">
                        <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide">Payout bank</div>
                        <div className="font-semibold text-[#374151]">{u.bankName} · {u.accountNumber}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Activity stats */}
              <div>
                <div className="text-[13px] font-bold text-[#111827] mb-2">Activity</div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-[10px] p-3 text-center">
                    <div className="text-lg font-extrabold text-[#111827]">{detail.orderCount}</div>
                    <div className="text-[10px] font-semibold text-[#9CA3AF]">ORDERS</div>
                  </div>
                  <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-[10px] p-3 text-center">
                    <div className="text-lg font-extrabold text-[#111827]">{naira(detail.totalSpent)}</div>
                    <div className="text-[10px] font-semibold text-[#9CA3AF]">TOTAL SPENT</div>
                  </div>
                  <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-[10px] p-3 text-center">
                    <div className="text-lg font-extrabold text-[#111827]">
                      {detail.sellerStats ? detail.sellerStats.activeListings : "—"}
                    </div>
                    <div className="text-[10px] font-semibold text-[#9CA3AF]">LISTINGS</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {u.role !== "admin" && (
                <div className="flex flex-col gap-2 border-t border-[#F3F4F6] pt-4">
                  {u.sellerStatus === "pending" && (
                    <div className="flex gap-2">
                      <button
                        disabled={acting}
                        onClick={() => onAction(u.id, "approveKyc")}
                        className="flex-1 py-2.5 rounded-[10px] text-[13px] font-bold text-white bg-[#16A34A] hover:bg-[#15803D] transition-all cursor-pointer border-none disabled:opacity-50"
                      >
                        ✅ Approve KYC
                      </button>
                      <button
                        disabled={acting}
                        onClick={() => onAction(u.id, "rejectKyc")}
                        className="flex-1 py-2.5 rounded-[10px] text-[13px] font-bold bg-[#FEF2F2] text-[#DC2626] border-[1.5px] border-[#FECACA] hover:bg-[#DC2626] hover:text-white transition-all cursor-pointer disabled:opacity-50"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  )}
                  <button
                    disabled={acting}
                    onClick={() => onAction(u.id, u.accountStatus === "suspended" ? "activate" : "suspend")}
                    className={`w-full py-2.5 rounded-[10px] text-[13px] font-bold transition-all cursor-pointer border-[1.5px] disabled:opacity-50 ${
                      u.accountStatus === "suspended"
                        ? "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0] hover:bg-[#16A34A] hover:text-white"
                        : "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA] hover:bg-[#DC2626] hover:text-white"
                    }`}
                  >
                    {u.accountStatus === "suspended" ? "♻️ Reactivate account" : "🚫 Suspend account"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Skeleton ──────────────────────────────────────────────────── */
function SkeletonUsers() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-8 w-56 bg-[#E5E7EB] rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-white border border-[#E5E7EB] rounded-[14px]" />
        ))}
      </div>
      <div className="h-96 bg-white border border-[#E5E7EB] rounded-[14px]" />
    </div>
  );
}

/* ─── Main Export ───────────────────────────────────────────────── */
const TABS = [
  { key: "all", label: "All users" },
  { key: "buyer", label: "Buyers" },
  { key: "seller", label: "Sellers" },
  { key: "admin", label: "Admins" },
  { key: "suspended", label: "Suspended" },
];

export default function AdminUsersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("users");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [modalUserId, setModalUserId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (res.status === 403) { router.push("/"); return; }
      const data = await res.json();
      if (data.success) setUsers(data.data);
      else setToast({ msg: `❌ ${data.error || "Failed to load users"}`, type: "error" });
    } catch {
      setToast({ msg: "❌ Failed to load users", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  /* ── Filtering ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter((u) => {
      if (tab === "suspended" && u.accountStatus !== "suspended") return false;
      if (tab !== "all" && tab !== "suspended" && (u.role || "buyer") !== tab) return false;
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !(u.phone || "").includes(q)) return false;
      return true;
    });
  }, [users, tab, search]);

  const counts = useMemo(() => ({
    all: users.length,
    buyer: users.filter((u) => (u.role || "buyer") === "buyer").length,
    seller: users.filter((u) => (u.role || "buyer") === "seller" || !!u.sellerStatus).length,
    admin: users.filter((u) => u.role === "admin").length,
    suspended: users.filter((u) => u.accountStatus === "suspended").length,
  }), [users]);

  /* ── Actions ── */
  const handleAction = async (id: string, action: Action): Promise<boolean> => {
    setActing(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        setToast({
          msg: {
            suspend: "🚫 Account suspended",
            activate: "✅ Account reactivated",
            approveKyc: "🎉 Seller KYC approved",
            rejectKyc: "❌ Seller KYC rejected",
          }[action],
          type: action === "suspend" || action === "rejectKyc" ? "error" : "success",
        });
        setUsers((prev) => prev.map((u) => {
          if (u.id !== id) return u;
          const next = { ...u };
          if (action === "suspend") next.accountStatus = "suspended";
          if (action === "activate") next.accountStatus = "active";
          if (action === "approveKyc") next.sellerStatus = "approved";
          if (action === "rejectKyc") next.sellerStatus = "rejected";
          return next;
        }));
        setModalUserId(null);
        return true;
      }
      setToast({ msg: `❌ ${data.error || "Action failed"}`, type: "error" });
      return false;
    } catch {
      setToast({ msg: "❌ Action failed", type: "error" });
      return false;
    } finally {
      setActing(false);
    }
  };

  const statCards = [
    { label: "Total users", value: counts.all.toLocaleString(), icon: "👥", color: "#2563EB" },
    { label: "Buyers", value: counts.buyer.toLocaleString(), icon: "🛍️", color: "#16A34A" },
    { label: "Sellers", value: counts.seller.toLocaleString(), icon: "🏪", color: "#F97316" },
    { label: "Suspended", value: counts.suspended.toLocaleString(), icon: "🚫", color: "#DC2626" },
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {modalUserId && (
        <UserModal userId={modalUserId} onClose={() => setModalUserId(null)} onAction={handleAction} acting={acting} />
      )}

      <AdminSidebar activeTab={activeTab} admin={{ id: "", email: "", name: "Super Admin", role: "admin" }} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="lg:pl-[260px] min-h-screen">
        <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] h-16 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden bg-transparent border-none text-xl cursor-pointer p-1">☰</button>
            <h1 className="text-lg font-extrabold text-[#111827]">User management</h1>
          </div>
          <button className="bg-white border border-[#E5E7EB] text-[#374151] rounded-[10px] px-4 py-2 text-[13px] font-semibold hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all cursor-pointer">
            📥 Export
          </button>
        </header>

        {loading ? (
          <SkeletonUsers />
        ) : (
          <div className="p-4 lg:p-6 max-w-[1200px]">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {statCards.map((s, i) => (
                <StatCard key={i} {...s} delay={i} />
              ))}
            </div>

            {/* Tabs + search */}
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
              <div className="flex gap-0 border-b-2 border-[#E5E7EB] overflow-x-auto">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className="px-4 py-3 text-[13px] font-semibold border-b-2 -mb-[2px] whitespace-nowrap cursor-pointer bg-transparent transition-all"
                    style={{
                      color: tab === t.key ? "#F97316" : "#6B7280",
                      borderBottomColor: tab === t.key ? "#F97316" : "transparent",
                    }}
                  >
                    {t.label}
                    <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      tab === t.key ? "bg-[#F97316] text-white" : "bg-[#F9FAFB] text-[#6B7280] border border-[#E5E7EB]"
                    }`}>
                      {counts[t.key as keyof typeof counts]}
                    </span>
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-72">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#9CA3AF]">🔍</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, phone…"
                  className="w-full pl-10 pr-3.5 py-2.5 border-[1.5px] border-[#E5E7EB] rounded-[10px] text-sm outline-none bg-white focus:border-[#F97316] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.1)] transition-all"
                />
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden">
              <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_120px] gap-4 px-4 py-2.5 bg-[#F9FAFB] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                <div>User</div><div>Role</div><div>Tier</div><div>Status</div><div className="text-right">Actions</div>
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-14 text-sm text-[#6B7280]">
                  <div className="text-3xl mb-2">👥</div>
                  {search || tab !== "all" ? "No users match your filters" : "No users yet"}
                </div>
              )}

              {filtered.map((u, i) => {
                const role = ROLE_META[u.role || "buyer"];
                const status = userStatus(u);
                const suspended = u.accountStatus === "suspended";
                return (
                  <div key={u.id}
                    className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_120px] gap-2 md:gap-4 px-4 py-3.5 items-center border-b border-[#F3F4F6] last:border-b-0 hover:bg-[#F9FAFB] transition-colors animate-[fadeUp_0.3s_ease_both]"
                    style={{ animationDelay: `${i * 0.03}s` }}>
                    {/* User cell */}
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold text-white shrink-0 ${
                        suspended ? "bg-[#DC2626]" : u.role === "admin" ? "bg-[#7C3AED]" : u.role === "seller" ? "bg-[#16A34A]" : "bg-[#2563EB]"
                      }`}>
                        {initials(u.name)}
                      </div>
                      <div className="min-w-0">
                        <div className={`text-[13px] font-semibold truncate ${suspended ? "line-through text-[#9CA3AF]" : "text-[#111827]"}`}>
                          {u.name}
                        </div>
                        <div className="text-[11px] text-[#9CA3AF] truncate">{u.email}</div>
                        <div className="text-[10px] text-[#9CA3AF] md:hidden">{fmtDate(u.createdAt)}</div>
                      </div>
                    </div>

                    {/* Role */}
                    <div>
                      <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold border" style={{ color: role.color, background: role.bg, borderColor: role.border }}>
                        {role.label}
                      </span>
                      <div className="hidden md:block text-[10px] text-[#9CA3AF] mt-1">{fmtDate(u.createdAt)}</div>
                    </div>

                    {/* Tier */}
                    <div className="text-[12px] font-semibold" style={{ color: u.sellerTier ? TIER_META[u.sellerTier]?.color : "#9CA3AF" }}>
                      {u.sellerTier ? TIER_META[u.sellerTier]?.label : "—"}
                    </div>

                    {/* Status */}
                    <div>
                      <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold border" style={{ color: status.color, background: status.bg, borderColor: status.border }}>
                        {status.label}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 md:justify-end items-center">
                      <button
                        onClick={() => setModalUserId(u.id)}
                        className="bg-white border-[1.5px] border-[#E5E7EB] text-[#374151] rounded-[10px] px-3 py-1.5 text-[11px] font-bold hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all cursor-pointer"
                      >
                        👁 View
                      </button>
                      {u.role !== "admin" && (
                        <button
                          onClick={() => handleAction(u.id, suspended ? "activate" : "suspend")}
                          disabled={acting}
                          className={`rounded-[10px] px-3 py-1.5 text-[11px] font-bold transition-all cursor-pointer border-[1.5px] disabled:opacity-50 ${
                            suspended
                              ? "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0] hover:bg-[#16A34A] hover:text-white"
                              : "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA] hover:bg-[#DC2626] hover:text-white"
                          }`}
                        >
                          {suspended ? "♻️" : "🚫"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 bg-[#FFF7ED] border border-[#FED7AA] rounded-[12px] p-4 text-[12px] text-[#92400E] leading-relaxed">
              ⚠️ <strong>Note:</strong> Suspending a user blocks them at the API layer (optional snippet in the additions doc) and notifies them automatically.
              KYC approvals also trigger a notification with the verified-badge info. Admin accounts are protected from this screen.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}