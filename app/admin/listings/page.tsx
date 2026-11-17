"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/Sidebar";

/* ─── Types ─────────────────────────────────────────────────────── */
interface AdminListingItem {
  id: string;
  title: string;
  description: string;
  price: number;
  type: "fixed" | "auction";
  category: string;
  condition: string;
  sellerId: string;
  sellerName: string;
  sellerBadge?: string;
  sellerRating?: number;
  sellerReviews?: number;
  location: string;
  shippingFee: number;
  shippingMethod: string;
  status: "active" | "sold" | "paused" | "draft" | "suspended";
  createdAt: string;
  endTime?: string;
  bids?: number;
  currentBid?: number;
  reservePrice?: number;
  views?: number;
  watchers?: number;
  stock?: number;
  origPrice?: number;
  acceptOffers?: boolean;
  handlingTime?: string;
  acceptReturns?: boolean;
  moderationReason?: string;
  moderatedAt?: string;
  // enriched by API
  sellerEmail?: string | null;
  sellerAccountStatus?: "active" | "suspended";
}

type Action = "suspend" | "activate" | "delete";

/* ─── Helpers ───────────────────────────────────────────────────── */
const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  active:    { label: "🟢 Active",    color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" },
  paused:    { label: "⏸️ Paused",    color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  sold:      { label: "✅ Sold",      color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
  draft:     { label: "📝 Draft",     color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB" },
  suspended: { label: "🚫 Suspended", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
};

const CATEGORY_ICONS: Record<string, string> = {
  "Phones & Tablets": "📱",
  "Fashion": "👗",
  "Home & Living": "🏠",
  "Electronics": "💻",
  "Vehicles & Parts": "🚗",
  "Beauty & Health": "💄",
  "Books & Media": "📚",
  "Sports & Fitness": "⚽",
  "Gaming": "🎮",
  "Kitchen & Food": "🍳",
};

const SUSPEND_REASONS = [
  "Prohibited item",
  "Counterfeit or fake",
  "Misleading description",
  "Price manipulation",
  "Stolen goods suspicion",
  "Other",
];

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—";

const fmtDateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "—";

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

/* ─── Info Cell ─────────────────────────────────────────────────── */
function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-[10px] p-3">
      <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide">{label}</div>
      <div className="font-semibold text-[#374151] text-[13px] mt-0.5">{children}</div>
    </div>
  );
}

/* ─── Listing Detail Modal ──────────────────────────────────────── */
function ListingModal({ item, onClose, onAction, acting }: {
  item: AdminListingItem;
  onClose: () => void;
  onAction: (id: string, action: Action, reason?: string) => Promise<boolean>;
  acting: boolean;
}) {
  const [reason, setReason] = useState("");
  const [reasonOther, setReasonOther] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const u = item;
  const status = STATUS_META[u.status];
  const suspended = u.status === "suspended";
  const finalReason = reason === "Other" ? reasonOther.trim() : reason;
  const canSuspend = finalReason.length > 3;
  const icon = CATEGORY_ICONS[u.category] || "📦";

  return (
    <div className="fixed inset-0 bg-black/50 z-[500] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[20px] max-w-[600px] w-full max-h-[90vh] overflow-y-auto animate-[scaleIn_0.3s_ease_both]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-[#E5E7EB]">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 rounded-[14px] bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center text-2xl shrink-0">
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-lg font-extrabold text-[#111827] ${suspended ? "line-through" : ""}`}>{u.title}</div>
              <div className="text-[12px] text-[#9CA3AF]">
                {u.category} · {u.condition} · Listed {fmtDate(u.createdAt)}
              </div>
            </div>
            <button onClick={onClose} className="bg-transparent border-none text-xl cursor-pointer text-[#9CA3AF] hover:text-[#111827]">✕</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold border" style={{ color: status.color, background: status.bg, borderColor: status.border }}>
              {status.label}
            </span>
            <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              u.type === "auction"
                ? "text-[#7C3AED] bg-[#F5F3FF] border-[#DDD6FE]"
                : "text-[#2563EB] bg-[#EFF6FF] border-[#BFDBFE]"
            }`}>
              {u.type === "auction" ? "🔨 Auction" : "🛒 Fixed price"}
            </span>
            {u.sellerAccountStatus === "suspended" && (
              <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA]">
                🔴 Seller account suspended
              </span>
            )}
          </div>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Pricing */}
          <div>
            <div className="text-[13px] font-bold text-[#111827] mb-2">Pricing</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {u.type === "auction" ? (
                <>
                  <Cell label="Current bid">{naira(u.currentBid || u.price)}</Cell>
                  <Cell label="Bids">{u.bids || 0}</Cell>
                  <Cell label="Reserve price">{u.reservePrice ? naira(u.reservePrice) : "—"}</Cell>
                </>
              ) : (
                <>
                  <Cell label="Price">
                    {u.origPrice && u.origPrice > u.price ? (
                      <>
                        <span className="line-through text-[#9CA3AF] font-normal text-[12px] mr-1.5">{naira(u.origPrice)}</span>
                        {naira(u.price)}
                      </>
                    ) : (
                      naira(u.price)
                    )}
                  </Cell>
                  {u.stock !== undefined && <Cell label="Stock">{u.stock}</Cell>}
                  <Cell label="Accepts offers">{u.acceptOffers ? "Yes" : "No"}</Cell>
                </>
              )}
            </div>
          </div>

          {/* Listing details */}
          <div>
            <div className="text-[13px] font-bold text-[#111827] mb-2">Listing details</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Cell label="Location">{u.location}</Cell>
              <Cell label="Shipping fee">{u.shippingFee === 0 ? "Free" : naira(u.shippingFee)}</Cell>
              <Cell label="Courier">{u.shippingMethod}</Cell>
              <Cell label="Views">👁 {u.views || 0}</Cell>
              <Cell label="Watchers">⭐ {u.watchers || 0}</Cell>
              <Cell label="Handling time">{u.handlingTime || "—"}</Cell>
              {u.type === "auction" && <Cell label="Ends">{fmtDateTime(u.endTime)}</Cell>}
              <Cell label="Returns accepted">{u.acceptReturns ? "Yes" : "No"}</Cell>
            </div>
          </div>

          {/* Seller */}
          <div>
            <div className="text-[13px] font-bold text-[#111827] mb-2">Seller</div>
            <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-[10px] p-3.5 flex flex-wrap items-center gap-x-6 gap-y-2">
              <div>
                <div className="text-[13px] font-bold text-[#111827]">{u.sellerName}</div>
                <div className="text-[11px] text-[#9CA3AF]">{u.sellerEmail || u.sellerId}</div>
              </div>
              {u.sellerBadge && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0]">
                  {u.sellerBadge}
                </span>
              )}
              {u.sellerRating !== undefined && (
                <span className="text-[12px] font-semibold text-[#374151]">
                  ★ {u.sellerRating.toFixed(1)} <span className="text-[#9CA3AF] font-normal">({u.sellerReviews || 0} reviews)</span>
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {u.description && (
            <div>
              <div className="text-[13px] font-bold text-[#111827] mb-2">Description</div>
              <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-[10px] p-3.5 text-[13px] text-[#374151] leading-relaxed whitespace-pre-line">
                {u.description}
              </div>
            </div>
          )}

          {/* Moderation */}
          {suspended ? (
            <div className="flex flex-col gap-3 border-t border-[#F3F4F6] pt-4">
              <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] p-3.5">
                <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide">Suspension reason</div>
                <div className="text-[13px] font-semibold text-[#DC2626] mt-0.5">{u.moderationReason || "Policy violation"}</div>
                <div className="text-[11px] text-[#9CA3AF] mt-1">Suspended {fmtDateTime(u.moderatedAt)}</div>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={acting}
                  onClick={() => onAction(u.id, "activate")}
                  className="flex-1 py-3 rounded-[10px] text-[13px] font-bold text-white bg-[#16A34A] hover:bg-[#15803D] transition-all cursor-pointer border-none disabled:opacity-50"
                >
                  ♻️ Reinstate listing
                </button>
                {!confirmingDelete ? (
                  <button
                    disabled={acting}
                    onClick={() => setConfirmingDelete(true)}
                    className="px-5 py-3 rounded-[10px] text-[13px] font-bold bg-[#FEF2F2] text-[#DC2626] border-[1.5px] border-[#FECACA] hover:bg-[#DC2626] hover:text-white transition-all cursor-pointer disabled:opacity-50"
                  >
                    🗑 Delete
                  </button>
                ) : (
                  <button
                    disabled={acting}
                    onClick={() => onAction(u.id, "delete")}
                    className="px-5 py-3 rounded-[10px] text-[13px] font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] transition-all cursor-pointer border-none disabled:opacity-50"
                  >
                    ⚠️ Confirm delete
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 border-t border-[#F3F4F6] pt-4">
              <div className="text-[13px] font-bold text-[#111827]">Suspend listing</div>
              <div className="flex flex-wrap gap-2">
                {SUSPEND_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setReason(r)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold border-[1.5px] cursor-pointer transition-all ${
                      reason === r
                        ? "bg-[#FEF2F2] text-[#DC2626] border-[#DC2626]"
                        : "bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#DC2626] hover:text-[#DC2626]"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {reason === "Other" && (
                <textarea
                  value={reasonOther}
                  onChange={(e) => setReasonOther(e.target.value)}
                  placeholder="Describe the violation…"
                  rows={2}
                  className="w-full px-3.5 py-2.5 border-[1.5px] border-[#E5E7EB] rounded-[10px] text-sm outline-none bg-white focus:border-[#F97316] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.1)] transition-all resize-vertical"
                />
              )}
              <div className="flex gap-2">
                <button
                  disabled={acting || !canSuspend}
                  onClick={() => onAction(u.id, "suspend", finalReason)}
                  className="flex-1 py-3 rounded-[10px] text-[13px] font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] transition-all cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  🚫 Suspend listing
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-3 rounded-[10px] text-[13px] font-semibold bg-white text-[#374151] border-[1.5px] border-[#E5E7EB] hover:border-[#F97316] hover:text-[#F97316] transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="text-[11px] text-[#9CA3AF] leading-relaxed">
                Suspended listings are instantly hidden from search and the public catalog. The seller is notified and cannot edit or relist until reinstated. For sold listings, moderation actions are disabled — handle via disputes instead.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Skeleton ──────────────────────────────────────────────────── */
function SkeletonListings() {
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
  { key: "all", label: "All listings" },
  { key: "active", label: "Active" },
  { key: "suspended", label: "Suspended" },
  { key: "draft", label: "Drafts" },
  { key: "sold", label: "Sold" },
];

export default function AdminListingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("listings");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [listings, setListings] = useState<AdminListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [modalItem, setModalItem] = useState<AdminListingItem | null>(null);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/listings");
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (res.status === 403) { router.push("/"); return; }
      const data = await res.json();
      if (data.success) setListings(data.data);
      else setToast({ msg: `❌ ${data.error || "Failed to load listings"}`, type: "error" });
    } catch {
      setToast({ msg: "❌ Failed to load listings", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  /* ── Filtering ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return listings.filter((l) => {
      if (tab !== "all" && l.status !== tab) return false;
      if (q &&
        !l.title.toLowerCase().includes(q) &&
        !l.sellerName.toLowerCase().includes(q) &&
        !l.category.toLowerCase().includes(q)
      ) return false;
      return true;
    });
  }, [listings, tab, search]);

  const counts = useMemo(() => ({
    all: listings.length,
    active: listings.filter((l) => l.status === "active").length,
    suspended: listings.filter((l) => l.status === "suspended").length,
    draft: listings.filter((l) => l.status === "draft").length,
    sold: listings.filter((l) => l.status === "sold").length,
  }), [listings]);

  /* ── Actions ── */
  const handleAction = async (id: string, action: Action, reason?: string): Promise<boolean> => {
    setActing(true);
    try {
      const res = await fetch(`/api/admin/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (data.success) {
        setToast({
          msg: { suspend: "🚫 Listing suspended", activate: "✅ Listing reinstated", delete: "🗑 Listing deleted" }[action],
          type: action === "activate" ? "success" : "error",
        });
        if (action === "delete") {
          setListings((prev) => prev.filter((l) => l.id !== id));
        } else {
          setListings((prev) =>
            prev.map((l) => {
              if (l.id !== id) return l;
              if (action === "suspend") {
                return {
                  ...l,
                  status: "suspended",
                  moderationReason: reason || "Policy violation — suspended by admin",
                  moderatedAt: new Date().toISOString(),
                };
              }
              return { ...l, status: "active", moderationReason: undefined, moderatedAt: undefined };
            })
          );
        }
        setModalItem((prev) => {
          if (!prev || prev.id !== id) return prev;
          if (action === "delete") return null;
          if (action === "suspend") {
            return { ...prev, status: "suspended", moderationReason: reason || "Policy violation — suspended by admin", moderatedAt: new Date().toISOString() };
          }
          return { ...prev, status: "active", moderationReason: undefined, moderatedAt: undefined };
        });
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
    { label: "Total listings", value: counts.all.toLocaleString(), icon: "📦", color: "#2563EB" },
    { label: "Active", value: counts.active.toLocaleString(), icon: "🟢", color: "#16A34A" },
    { label: "Suspended", value: counts.suspended.toLocaleString(), icon: "🚫", color: "#DC2626" },
    { label: "Sold", value: counts.sold.toLocaleString(), icon: "✅", color: "#F97316" },
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {modalItem && (
        <ListingModal item={modalItem} onClose={() => setModalItem(null)} onAction={handleAction} acting={acting} />
      )}

      <AdminSidebar activeTab={activeTab} admin={{ id: "", email: "", name: "Super Admin", role: "admin" }} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="lg:pl-[260px] min-h-screen">
        <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] h-16 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden bg-transparent border-none text-xl cursor-pointer p-1">☰</button>
            <h1 className="text-lg font-extrabold text-[#111827]">Listing moderation</h1>
            {counts.suspended > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-white bg-[#DC2626] px-2.5 py-0.5 rounded-full font-bold">
                {counts.suspended} suspended
              </span>
            )}
          </div>
          <button className="bg-white border border-[#E5E7EB] text-[#374151] rounded-[10px] px-4 py-2 text-[13px] font-semibold hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all cursor-pointer">
            📥 Export
          </button>
        </header>

        {loading ? (
          <SkeletonListings />
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
                  placeholder="Search title, seller, category…"
                  className="w-full pl-10 pr-3.5 py-2.5 border-[1.5px] border-[#E5E7EB] rounded-[10px] text-sm outline-none bg-white focus:border-[#F97316] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.1)] transition-all"
                />
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden">
              <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_1fr_70px_130px] gap-4 px-4 py-2.5 bg-[#F9FAFB] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                <div>Listing</div><div>Seller</div><div>Price</div><div>Status</div><div>Views</div><div className="text-right">Actions</div>
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-14 text-sm text-[#6B7280]">
                  <div className="text-3xl mb-2">📦</div>
                  {search || tab !== "all" ? "No listings match your filters" : "No listings yet"}
                </div>
              )}

              {filtered.map((l, i) => {
                const status = STATUS_META[l.status];
                const suspended = l.status === "suspended";
                const icon = CATEGORY_ICONS[l.category] || "📦";
                const canModerate = l.status === "active" || l.status === "paused";
                return (
                  <div key={l.id}
                    className="grid grid-cols-1 md:grid-cols-[2fr_1.2fr_1fr_1fr_70px_130px] gap-2 md:gap-4 px-4 py-3.5 items-center border-b border-[#F3F4F6] last:border-b-0 hover:bg-[#F9FAFB] transition-colors animate-[fadeUp_0.3s_ease_both]"
                    style={{ animationDelay: `${i * 0.03}s` }}>
                    {/* Listing cell */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[10px] bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center text-lg shrink-0">
                        {icon}
                      </div>
                      <div className="min-w-0">
                        <div className={`text-[13px] font-semibold truncate ${suspended ? "line-through text-[#9CA3AF]" : "text-[#111827]"}`}>
                          {l.title}
                        </div>
                        <div className="text-[11px] text-[#9CA3AF] truncate">
                          {l.category} · {l.condition}
                          {l.type === "auction" && " · 🔨"}
                        </div>
                      </div>
                    </div>

                    {/* Seller */}
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-[#374151] truncate">
                        {l.sellerAccountStatus === "suspended" && "🔴 "}
                        {l.sellerName}
                      </div>
                      <div className="text-[11px] text-[#9CA3AF] truncate">{l.location}</div>
                    </div>

                    {/* Price */}
                    <div className="text-[13px] font-bold text-[#111827]">
                      {l.type === "auction" ? naira(l.currentBid || l.price) : naira(l.price)}
                      {l.type === "auction" && (
                        <span className="block text-[10px] font-semibold text-[#7C3AED]">{l.bids || 0} bids</span>
                      )}
                    </div>

                    {/* Status */}
                    <div>
                      <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold border" style={{ color: status.color, background: status.bg, borderColor: status.border }}>
                        {status.label}
                      </span>
                      {suspended && l.moderationReason && (
                        <div className="text-[10px] text-[#9CA3AF] truncate max-w-[160px] mt-0.5" title={l.moderationReason}>
                          {l.moderationReason}
                        </div>
                      )}
                    </div>

                    {/* Views */}
                    <div className="text-[12px] font-semibold text-[#6B7280]">👁 {l.views || 0}</div>

                    {/* Actions */}
                    <div className="flex gap-2 md:justify-end items-center">
                      <button
                        onClick={() => setModalItem(l)}
                        className="bg-white border-[1.5px] border-[#E5E7EB] text-[#374151] rounded-[10px] px-3 py-1.5 text-[11px] font-bold hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all cursor-pointer"
                      >
                        👁 View
                      </button>
                      {canModerate && (
                        <button
                          onClick={() => handleAction(l.id, "suspend", "Policy violation — suspended by admin")}
                          disabled={acting}
                          title="Quick suspend"
                          className="bg-[#FEF2F2] text-[#DC2626] border-[1.5px] border-[#FECACA] rounded-[10px] px-3 py-1.5 text-[11px] font-bold hover:bg-[#DC2626] hover:text-white transition-all cursor-pointer disabled:opacity-50"
                        >
                          🚫
                        </button>
                      )}
                      {suspended && (
                        <button
                          onClick={() => handleAction(l.id, "activate")}
                          disabled={acting}
                          title="Reinstate"
                          className="bg-[#F0FDF4] text-[#16A34A] border-[1.5px] border-[#BBF7D0] rounded-[10px] px-3 py-1.5 text-[11px] font-bold hover:bg-[#16A34A] hover:text-white transition-all cursor-pointer disabled:opacity-50"
                        >
                          ♻️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 bg-[#FFF7ED] border border-[#FED7AA] rounded-[12px] p-4 text-[12px] text-[#92400E] leading-relaxed">
              ⚠️ <strong>Moderation policy:</strong> Suspended listings are hidden from search and the public catalog immediately, and the seller is notified. Use quick-suspend (🚫) for obvious violations, or open the detail view to attach a specific reason. Suspended sellers&apos; listings should also be reviewed — their account status appears next to the seller name.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}