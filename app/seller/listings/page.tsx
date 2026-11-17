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

interface Listing {
  id: string;
  title: string;
  description?: string;
  price: number;
  origPrice?: number;
  type: "fixed" | "auction";
  category: string;
  condition?: string;
  status: "active" | "sold" | "paused" | "draft";
  views?: number;
  watchers?: number;
  stock?: number;
  currentBid?: number;
  endTime?: string;
  createdAt: string;
  images: string[];
}

// ─── Config ────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  active: { label: "Active",   color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0", icon: "●" },
  paused: { label: "Paused",   color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "⏸" },
  sold:   { label: "Sold out", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", icon: "✓" },
  draft:  { label: "Draft",    color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB", icon: "📝" },
};

const CATEGORY_ICONS: Record<string, string> = {
  "Phones & Tablets": "📱", "Fashion": "👗", "Home & Living": "🏠",
  "Electronics": "💻", "Vehicles & Parts": "🚗", "Beauty & Health": "💄",
  "Books & Media": "📚", "Sports & Fitness": "⚽", "Gaming": "🎮", "Kitchen & Food": "🍳",
};

function timeAgo(iso?: string) {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d > 1 ? "s" : ""} ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} wk ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

const listingImage = (l: Listing) => l.images?.[0] || CATEGORY_ICONS[l.category] || "📦";
const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;

// ─── Status pill ───────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border"
      style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}>
      {sc.icon} {sc.label}
    </span>
  );
}

// ─── Grid card ─────────────────────────────────────────────────────
function ListingCard({ listing, busy, onStatus, onDelete }: {
  listing: Listing; busy: boolean;
  onStatus: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const isAuction = listing.type === "auction";
  return (
    <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] overflow-hidden hover:border-[#F97316] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all">
      <div className="aspect-[4/3] bg-[#F9FAFB] flex items-center justify-center text-[52px] relative border-b border-[#E5E7EB]">
        {listingImage(listing)}
        <span className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-[10px] border"
          style={isAuction
            ? { color: "#7C3AED", background: "#F5F3FF", borderColor: "#DDD6FE" }
            : { color: "#F97316", background: "#FFF7ED", borderColor: "#FED7AA" }}>
          {isAuction ? "🔨 Auction" : "🏷️ Fixed"}
        </span>
        {listing.status === "paused" && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-[13px] font-bold text-[#D97706] bg-[#FFFBEB] border border-[#FDE68A] px-4 py-1.5 rounded-full">⏸ Paused</span>
          </div>
        )}
      </div>
      <div className="p-3.5">
        <div className="text-[13px] font-semibold text-[#111827] truncate mb-1.5">{listing.title}</div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-[17px] font-extrabold text-[#111827]">{naira(listing.price)}</span>
          {isAuction && listing.currentBid ? (
            <span className="text-[11px] text-[#6B7280]">Bid: {naira(listing.currentBid)}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <StatusPill status={listing.status} />
          <span className="text-[11px] text-[#6B7280]">Stock: {listing.stock ?? 1}</span>
        </div>
        <div className="flex gap-3 text-[11px] text-[#6B7280] mb-3">
          <span>👁 {listing.views || 0}</span>
          <span>❤️ {listing.watchers || 0}</span>
          <span>{timeAgo(listing.createdAt)}</span>
        </div>
        <div className="flex gap-1.5">
          <Link href={`/seller/listings/${listing.id}`}
            className="flex-1 text-center px-2 py-2 text-[12px] font-semibold text-[#374151] border-[1.5px] border-[#E5E7EB] rounded-[10px] hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all no-underline">
            ✏️ Edit
          </Link>
          {listing.status === "active" && (
            <button disabled={busy} onClick={() => onStatus(listing.id, "paused")}
              className="flex-1 px-2 py-2 text-[12px] font-semibold text-[#DC2626] bg-[#FEF2F2] border-[1.5px] border-[#FECACA] rounded-[10px] hover:bg-[#DC2626] hover:text-white transition-all cursor-pointer disabled:opacity-50">
              ⏸ Pause
            </button>
          )}
          {listing.status === "paused" && (
            <button disabled={busy} onClick={() => onStatus(listing.id, "active")}
              className="flex-1 px-2 py-2 text-[12px] font-bold text-white bg-[#F97316] border-none rounded-[10px] hover:bg-[#EA6C0A] transition-all cursor-pointer disabled:opacity-50">
              ▶ Resume
            </button>
          )}
          {(listing.status === "sold" || listing.status === "draft") && (
            <button disabled={busy} onClick={() => onStatus(listing.id, "active")}
              className="flex-1 px-2 py-2 text-[12px] font-semibold text-[#374151] border-[1.5px] border-[#E5E7EB] rounded-[10px] hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all cursor-pointer disabled:opacity-50">
              🔄 Relist
            </button>
          )}
          <button disabled={busy} onClick={() => onDelete(listing.id)} title="Delete"
            className="px-2.5 py-2 text-[12px] text-[#DC2626] bg-[#FEF2F2] border-[1.5px] border-[#FECACA] rounded-[10px] hover:bg-[#DC2626] hover:text-white transition-all cursor-pointer disabled:opacity-50">
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────
export default function SellerListingsPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<SellerAccountProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
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
      const [profileRes, listingsRes] = await Promise.all([
        fetch("/api/seller/me"),
        fetch("/api/seller/listings"),
      ]);
      const profileData = await profileRes.json();
      const listingsData = await listingsRes.json();

      if (!profileData.success || !profileData.data) {
        router.push("/seller/onboarding");
        return;
      }
      setSeller(profileData.data);
      if (listingsData.success) setListings(listingsData.data);
    } catch {
      setToast({ msg: "❌ Failed to load listings", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (filter !== "all" && l.status !== filter) return false;
      if (search && !l.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [listings, filter, search]);

  const counts = useMemo(() => ({
    all: listings.length,
    active: listings.filter((l) => l.status === "active").length,
    paused: listings.filter((l) => l.status === "paused").length,
    sold: listings.filter((l) => l.status === "sold").length,
    draft: listings.filter((l) => l.status === "draft").length,
  }), [listings]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/seller/listings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus as Listing["status"] } : l)));
        setToast({ msg: `✅ Listing ${newStatus === "active" ? "activated" : newStatus}`, type: "success" });
      } else {
        setToast({ msg: `❌ ${data.error || "Update failed"}`, type: "error" });
      }
    } catch {
      setToast({ msg: "❌ Failed to update listing", type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this listing permanently?")) return;
    setBusyId(id);
    try {
      const res = await fetch("/api/seller/listings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setListings((prev) => prev.filter((l) => l.id !== id));
        setToast({ msg: "✅ Listing deleted", type: "success" });
      } else {
        setToast({ msg: `❌ ${data.error || "Delete failed"}`, type: "error" });
      }
    } catch {
      setToast({ msg: "❌ Failed to delete listing", type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const statCards = [
    { key: "all", label: "All listings", count: counts.all, color: "#1A1A1A" },
    { key: "active", label: "Active", count: counts.active, color: "#16A34A" },
    { key: "paused", label: "Paused", count: counts.paused, color: "#D97706" },
    { key: "sold", label: "Sold out", count: counts.sold, color: "#2563EB" },
    { key: "draft", label: "Drafts", count: counts.draft, color: "#6B7280" },
  ];

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

      <SellerSidebar activeTab="listings" seller={seller} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="lg:pl-[260px] min-h-screen">
        <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] h-16 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden bg-transparent border-none text-xl cursor-pointer p-1">☰</button>
            <h1 className="text-lg font-extrabold text-[#111827]">My Listings</h1>
          </div>
          <Link href="/seller/listings/new"
            className="bg-[#F97316] text-white rounded-[10px] px-4 py-2 text-[13px] font-bold hover:bg-[#EA6C0A] transition-all no-underline">
            + Create listing
          </Link>
        </header>

        <div className="p-4 lg:p-6 max-w-[1200px]">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {statCards.map((s) => (
              <button key={s.key} onClick={() => setFilter(s.key)}
                className="text-left rounded-[12px] p-3.5 border-[1.5px] bg-white transition-all cursor-pointer"
                style={{ borderColor: filter === s.key ? s.color : "#E5E7EB" }}>
                <div className="text-[22px] font-extrabold mb-0.5" style={{ color: s.color }}>{s.count}</div>
                <div className="text-[12px] text-[#6B7280] font-medium">{s.label}</div>
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="relative flex-1 min-w-[200px] max-w-[360px]">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#9CA3AF]">🔍</span>
              <input
                type="text"
                placeholder="Search listings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border-[1.5px] border-[#E5E7EB] rounded-[10px] text-sm outline-none focus:border-[#F97316] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.1)] bg-white"
              />
            </div>
            <div className="flex gap-2 ml-auto">
              <button onClick={() => setViewMode("grid")}
                className={`px-3.5 py-2 rounded-[8px] text-[13px] font-semibold border-[1.5px] cursor-pointer transition-all ${
                  viewMode === "grid" ? "border-[#F97316] bg-[#FFF7ED] text-[#F97316]" : "border-[#E5E7EB] bg-white text-[#6B7280]"}`}>
                ⊞ Grid
              </button>
              <button onClick={() => setViewMode("table")}
                className={`px-3.5 py-2 rounded-[8px] text-[13px] font-semibold border-[1.5px] cursor-pointer transition-all ${
                  viewMode === "table" ? "border-[#F97316] bg-[#FFF7ED] text-[#F97316]" : "border-[#E5E7EB] bg-white text-[#6B7280]"}`}>
                ☰ List
              </button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 bg-[#F3F4F6] rounded animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-[14px] text-center py-16">
              <div className="text-4xl mb-3">📦</div>
              <div className="text-base font-bold text-[#111827]">No listings found</div>
              <div className="text-sm text-[#6B7280] mt-1">Try adjusting your filters or create a new listing</div>
              <Link href="/seller/listings/new"
                className="inline-block mt-4 bg-[#F97316] text-white rounded-[10px] px-5 py-2.5 text-sm font-bold hover:bg-[#EA6C0A] transition-all no-underline">
                + Create listing
              </Link>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((l) => (
                <ListingCard key={l.id} listing={l} busy={busyId === l.id}
                  onStatus={handleStatusChange} onDelete={handleDelete} />
              ))}
            </div>
          ) : (
            <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] overflow-hidden">
              <div className="hidden md:grid grid-cols-[2fr_110px_80px_100px_150px] gap-4 px-4 py-2.5 bg-[#F9FAFB] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                <div>Product</div><div>Price</div><div>Views</div><div>Status</div><div className="text-right">Actions</div>
              </div>
              {filtered.map((l) => {
                const isAuction = l.type === "auction";
                return (
                  <div key={l.id}
                    className="grid grid-cols-1 md:grid-cols-[2fr_110px_80px_100px_150px] gap-2 md:gap-4 px-4 py-3.5 items-center border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg flex items-center justify-center text-xl shrink-0">
                        {listingImage(l)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-[#111827] truncate">{l.title}</div>
                        <div className="text-[11px] text-[#6B7280] flex gap-2">
                          <span>{isAuction ? "🔨 Auction" : "🏷️ Fixed"}</span>
                          <span>Stock: {l.stock ?? 1}</span>
                          <span>{timeAgo(l.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-[13px] font-bold text-[#111827]">
                      {naira(l.price)}
                      {isAuction && l.currentBid ? (
                        <div className="text-[10px] font-medium text-[#6B7280]">Bid: {naira(l.currentBid)}</div>
                      ) : null}
                    </div>
                    <div className="text-[12px] text-[#6B7280]">👁 {l.views || 0}</div>
                    <div><StatusPill status={l.status} /></div>
                    <div className="flex md:justify-end gap-1.5 flex-wrap">
                      <Link href={`/seller/listings/${l.id}`}
                        className="px-2.5 py-1.5 text-[11px] font-semibold text-[#374151] border-[1.5px] border-[#E5E7EB] rounded-lg hover:border-[#F97316] hover:text-[#F97316] transition-all no-underline">
                        Edit
                      </Link>
                      {l.status === "active" && (
                        <button disabled={busyId === l.id} onClick={() => handleStatusChange(l.id, "paused")}
                          className="px-2.5 py-1.5 text-[11px] font-semibold text-[#D97706] border-[1.5px] border-[#FDE68A] bg-[#FFFBEB] rounded-lg hover:bg-[#FDE68A] transition-all cursor-pointer disabled:opacity-50">
                          Pause
                        </button>
                      )}
                      {l.status === "paused" && (
                        <button disabled={busyId === l.id} onClick={() => handleStatusChange(l.id, "active")}
                          className="px-2.5 py-1.5 text-[11px] font-semibold text-[#16A34A] border-[1.5px] border-[#BBF7D0] bg-[#F0FDF4] rounded-lg hover:bg-[#BBF7D0] transition-all cursor-pointer disabled:opacity-50">
                          Resume
                        </button>
                      )}
                      {(l.status === "sold" || l.status === "draft") && (
                        <button disabled={busyId === l.id} onClick={() => handleStatusChange(l.id, "active")}
                          className="px-2.5 py-1.5 text-[11px] font-semibold text-[#374151] border-[1.5px] border-[#E5E7EB] rounded-lg hover:border-[#F97316] hover:text-[#F97316] transition-all cursor-pointer disabled:opacity-50">
                          Relist
                        </button>
                      )}
                      <button disabled={busyId === l.id} onClick={() => handleDelete(l.id)} title="Delete"
                        className="px-2.5 py-1.5 text-[11px] text-[#DC2626] border-[1.5px] border-[#FECACA] bg-[#FEF2F2] rounded-lg hover:bg-[#DC2626] hover:text-white transition-all cursor-pointer disabled:opacity-50">
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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