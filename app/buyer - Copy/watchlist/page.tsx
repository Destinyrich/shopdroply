"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/* ─── Types ─────────────────────────────────────────────────────── */
interface WatchlistItem {
  id: string;
  userId: string;
  listingId: string;
  item: string;
  image: string;
  price: number;
  origPrice?: number;
  type: "fixed" | "auction";
  bids?: number;
  addedAt: string;
}

/* ─── Design tokens ─────────────────────────────────────────────── */
const C = {
  orange: "#F97316", orangeHov: "#EA6C0A", orangeLight: "#FFF7ED", orangeBdr: "#FED7AA",
  green: "#16A34A", greenLight: "#F0FDF4", greenBdr: "#BBF7D0",
  red: "#DC2626", redLight: "#FEF2F2", redBdr: "#FECACA",
  amber: "#D97706", amberLight: "#FFFBEB", amberBdr: "#FDE68A",
  blue: "#2563EB", blueLight: "#EFF6FF", blueBdr: "#BFDBFE",
  bg: "#F9FAFB", surface: "#FFFFFF", border: "#E5E7EB",
  text: "#111827", textMid: "#374151", textSub: "#6B7280", textLight: "#9CA3AF",
};

/* ─── Helpers ───────────────────────────────────────────────────── */
function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

function priceDropPercent(orig: number, current: number) {
  return Math.round(((orig - current) / orig) * 100);
}

/* ─── Toast ─────────────────────────────────────────────────────── */
function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-[fadeUp_0.3s_ease_both]">
      <div
        className={`px-5 py-3 rounded-[10px] text-sm font-semibold shadow-[0_4px_24px_rgba(0,0,0,0.12)] border ${
          type === "success"
            ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]"
            : "bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]"
        }`}
      >
        {msg}
      </div>
    </div>
  );
}

/* ─── Watchlist Card ────────────────────────────────────────────── */
function WatchlistCard({
  item,
  onRemove,
  onAddToCart,
  removing,
}: {
  item: WatchlistItem;
  onRemove: (listingId: string) => void;
  onAddToCart: (item: WatchlistItem) => void;
  removing: boolean;
}) {
  const origPrice = item.origPrice;
  const hasDrop = origPrice !== undefined && origPrice > item.price;
  const dropPct = hasDrop ? priceDropPercent(origPrice, item.price) : 0;
  const isAuction = item.type === "auction";

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden transition-all hover:border-[#F97316] hover:shadow-[0_2px_12px_rgba(0,0,0,0.05)] group flex flex-col">
      {/* Image */}
      <Link href={`/product/${item.listingId}`} className="block relative bg-[#F9FAFB] aspect-square flex items-center justify-center text-5xl no-underline">
        {item.image || "📦"}
        {hasDrop && (
          <div className="absolute top-2.5 left-2.5 bg-[#DC2626] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
            −{dropPct}%
          </div>
        )}
        {isAuction && (
          <div className="absolute top-2.5 right-2.5 bg-[#F97316] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
            🔥 Auction
          </div>
        )}
      </Link>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <Link
          href={`/product/${item.listingId}`}
          className="text-sm font-semibold text-[#111827] hover:text-[#F97316] transition-colors no-underline line-clamp-2 mb-1 leading-snug"
        >
          {item.item}
        </Link>

        <div className="flex items-end gap-2 mb-2">
          <span className="text-base font-extrabold text-[#111827]">₦{item.price.toLocaleString()}</span>
          {hasDrop && (
            <span className="text-[11px] text-[#9CA3AF] line-through mb-0.5">
              ₦{item.origPrice!.toLocaleString()}
            </span>
          )}
        </div>

        {isAuction && item.bids !== undefined && (
          <div className="text-[11px] text-[#6B7280] mb-2">
            {item.bids} bid{item.bids !== 1 ? "s" : ""} · Ends soon
          </div>
        )}

        <div className="text-[11px] text-[#9CA3AF] mb-3">Added {formatDate(item.addedAt)}</div>

        <div className="mt-auto flex flex-col gap-2">
          <button
            onClick={() => onAddToCart(item)}
            className="w-full bg-[#F97316] text-white rounded-[10px] py-2.5 text-[13px] font-bold hover:bg-[#EA6C0A] hover:-translate-y-px hover:shadow-[0_4px_18px_rgba(249,115,22,0.3)] transition-all cursor-pointer"
          >
            🛒 Add to cart
          </button>
          <button
            onClick={() => onRemove(item.listingId)}
            disabled={removing}
            className="w-full bg-white border border-[#E5E7EB] text-[#374151] rounded-[10px] py-2 text-[12px] font-semibold hover:border-[#DC2626] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-all cursor-pointer disabled:opacity-50"
          >
            {removing ? "Removing..." : "🗑 Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Empty State ───────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="text-center py-20 px-6 bg-white rounded-[14px] border border-[#E5E7EB]">
      <div className="text-[52px] mb-3">❤️</div>
      <div className="text-lg font-bold text-[#111827] mb-1.5">Your watchlist is empty</div>
      <div className="text-sm text-[#6B7280] mb-5 max-w-[320px] mx-auto">
        Save items you love while browsing. They'll show up here so you can buy them later.
      </div>
      <Link
        href="/search"
        className="inline-flex items-center justify-center bg-[#F97316] text-white rounded-[10px] px-6 py-2.5 text-sm font-bold hover:bg-[#EA6C0A] transition-colors no-underline"
      >
        🛍️ Browse marketplace
      </Link>
    </div>
  );
}

/* ─── Skeleton Card ─────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden animate-pulse">
      <div className="aspect-square bg-[#E5E7EB]" />
      <div className="p-4 space-y-2">
        <div className="h-3.5 w-3/4 bg-[#E5E7EB] rounded" />
        <div className="h-4 w-1/2 bg-[#E5E7EB] rounded" />
        <div className="h-8 w-full bg-[#E5E7EB] rounded-[10px] mt-2" />
        <div className="h-7 w-full bg-[#E5E7EB] rounded-[10px]" />
      </div>
    </div>
  );
}

/* ─── Main Export ───────────────────────────────────────────────── */
export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "fixed" | "auction">("all");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    try {
      const res = await fetch("/api/buyer/watchlist");
      const json = await res.json();
      if (json.success) {
        setItems(json.data);
      }
    } catch (err) {
      console.error("Failed to load watchlist", err);
      setToast({ msg: "❌ Failed to load watchlist", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (listingId: string) => {
    const prev = items;
    setRemovingId(listingId);
    setItems((prev) => prev.filter((i) => i.listingId !== listingId));

    try {
      const res = await fetch(`/api/buyer/watchlist?listingId=${listingId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setToast({ msg: "✅ Removed from watchlist", type: "success" });
      } else {
        throw new Error();
      }
    } catch {
      setItems(prev);
      setToast({ msg: "❌ Failed to remove. Try again.", type: "error" });
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = async (item: WatchlistItem) => {
    try {
      const res = await fetch("/api/buyer/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: item.listingId,
          qty: 1,
        }),
      });
      if (res.ok) {
        setToast({ msg: "🛒 Added to cart!", type: "success" });
      } else {
        throw new Error();
      }
    } catch {
      setToast({ msg: "❌ Failed to add to cart", type: "error" });
    }
  };

  const filtered = items.filter((i) => {
    const matchesSearch =
      search === "" || i.item.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || i.type === filter;
    return matchesSearch && matchesFilter;
  });

  const dropCount = items.filter((i) => i.origPrice && i.origPrice > i.price).length;

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-[1080px] mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-[22px] font-extrabold text-[#111827]">My Watchlist</h1>
              <p className="text-[13px] text-[#6B7280] mt-0.5">
                {items.length} item{items.length !== 1 ? "s" : ""} saved
                {dropCount > 0 && (
                  <span className="ml-2 text-[#16A34A] font-semibold">
                    · {dropCount} price drop{dropCount > 1 ? "s" : ""} 🎉
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <input
                  className="w-full sm:w-[260px] bg-white border border-[#E5E7EB] rounded-[10px] pl-9 pr-3 py-2 text-[13px] text-[#111827] outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] transition-all placeholder:text-[#9CA3AF]"
                  placeholder="Search saved items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-sm">🔍</span>
              </div>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 mt-4 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { key: "all", label: "All", count: items.length },
              { key: "fixed", label: "Fixed price", count: items.filter((i) => i.type === "fixed").length },
              { key: "auction", label: "Auctions", count: items.filter((i) => i.type === "auction").length },
            ].map((tab) => {
              const active = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as typeof filter)}
                  className={`px-3.5 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                    active
                      ? "bg-[#F97316] text-white border-[#F97316]"
                      : "bg-white text-[#374151] border-[#E5E7EB] hover:border-[#F97316] hover:text-[#F97316]"
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full ${active ? "bg-white/20" : "bg-[#F3F4F6] text-[#6B7280]"}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1080px] mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((item) => (
              <WatchlistCard
                key={item.id}
                item={item}
                onRemove={handleRemove}
                onAddToCart={handleAddToCart}
                removing={removingId === item.listingId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}