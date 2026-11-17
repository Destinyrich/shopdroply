"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCountdownFromDate } from "@/hooks/useCountdown";

/* ─── Types ─────────────────────────────────────────────────────── */
interface Bid {
  id: string;
  userId: string;
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

/* ─── Countdown Badge ───────────────────────────────────────────── */
function CountdownBadge({ endTime }: { endTime: string }) {
  const { display, isUrgent, isEnded } = useCountdownFromDate(endTime);

  if (isEnded) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#F3F4F6] text-[#9CA3AF] border border-[#E5E7EB]">
        ⏰ Ended
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border"
      style={{
        background: isUrgent ? C.redLight : C.amberLight,
        color: isUrgent ? C.red : C.amber,
        borderColor: isUrgent ? C.redBdr : C.amberBdr,
      }}
    >
      ⏳ {display}
    </span>
  );
}

/* ─── Bid Card ──────────────────────────────────────────────────── */
function BidCard({
  bid,
  onBid,
  bidding,
}: {
  bid: Bid;
  onBid: (bid: Bid, amount: number) => void;
  bidding: boolean;
}) {
  const { isEnded } = useCountdownFromDate(bid.endTime);
  const [quickAmount, setQuickAmount] = useState<number | "">("");
  const [showInput, setShowInput] = useState(false);

  const isLeading = bid.leading && !isEnded;
  const isOutbid = !bid.leading && !isEnded;
  const diff = bid.currentBid - bid.myBid;

  const statusMeta = isEnded
    ? { label: "Ended", color: "#9CA3AF", bg: "#F3F4F6", border: "#E5E7EB", icon: "🏁" }
    : isLeading
    ? { label: "You're winning!", color: C.green, bg: C.greenLight, border: C.greenBdr, icon: "🏆" }
    : { label: "You've been outbid", color: C.red, bg: C.redLight, border: C.redBdr, icon: "😬" };

  const minNextBid = bid.currentBid + Math.ceil(bid.currentBid * 0.05);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden transition-all hover:border-[#F97316] hover:shadow-[0_2px_12px_rgba(0,0,0,0.05)] flex flex-col">
      {/* Image */}
      <Link href={`/product/${bid.listingId}`} className="block relative bg-[#F9FAFB] aspect-[4/3] flex items-center justify-center text-5xl no-underline">
        {bid.image || "📦"}
        <div className="absolute top-2.5 right-2.5">
          <CountdownBadge endTime={bid.endTime} />
        </div>
      </Link>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <Link
          href={`/product/${bid.listingId}`}
          className="text-sm font-semibold text-[#111827] hover:text-[#F97316] transition-colors no-underline line-clamp-2 mb-2 leading-snug"
        >
          {bid.item}
        </Link>

        {/* Status */}
        <div
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-bold border self-start mb-3"
          style={{ color: statusMeta.color, background: statusMeta.bg, borderColor: statusMeta.border }}
        >
          {statusMeta.icon} {statusMeta.label}
        </div>

        {/* Bid info */}
        <div className="flex flex-col gap-1.5 mb-3">
          <div className="flex justify-between text-[13px]">
            <span className="text-[#6B7280]">Your bid</span>
            <span className="font-bold text-[#111827]">₦{bid.myBid.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-[#6B7280]">Current bid</span>
            <span className="font-bold text-[#111827]">₦{bid.currentBid.toLocaleString()}</span>
          </div>
          {isOutbid && (
            <div className="flex justify-between text-[13px]">
              <span className="text-[#DC2626]">Difference</span>
              <span className="font-bold text-[#DC2626]">+₦{diff.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-[11px] text-[#9CA3AF]">
            <span>Total bids</span>
            <span>{bid.totalBids.toLocaleString()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto flex flex-col gap-2">
          {!isEnded && (
            <>
              {showInput ? (
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="flex-1 min-w-0 px-3 py-2 border border-[#E5E7EB] rounded-[10px] text-sm text-[#111827] outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] placeholder:text-[#9CA3AF]"
                    placeholder={`Min ₦${minNextBid.toLocaleString()}`}
                    value={quickAmount}
                    onChange={(e) => setQuickAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    min={minNextBid}
                    disabled={bidding}
                  />
                  <button
                    onClick={() => {
                      if (typeof quickAmount === "number" && quickAmount >= minNextBid) {
                        onBid(bid, quickAmount);
                        setShowInput(false);
                        setQuickAmount("");
                      }
                    }}
                    disabled={bidding || typeof quickAmount !== "number" || quickAmount < minNextBid}
                    className="bg-[#F97316] text-white rounded-[10px] px-4 py-2 text-[13px] font-bold hover:bg-[#EA6C0A] transition-all cursor-pointer disabled:bg-[#D1D5DB] disabled:cursor-not-allowed"
                  >
                    {bidding ? "..." : "Bid"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setShowInput(true);
                    setQuickAmount(minNextBid);
                  }}
                  className="w-full bg-[#F97316] text-white rounded-[10px] py-2.5 text-[13px] font-bold hover:bg-[#EA6C0A] hover:-translate-y-px hover:shadow-[0_4px_18px_rgba(249,115,22,0.3)] transition-all cursor-pointer"
                >
                  {isOutbid ? "🔥 Place higher bid" : "⬆️ Increase bid"}
                </button>
              )}
            </>
          )}
          <Link
            href={`/product/${bid.listingId}`}
            className="w-full text-center bg-white border border-[#E5E7EB] text-[#374151] rounded-[10px] py-2 text-[12px] font-semibold hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all no-underline"
          >
            View listing →
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Empty State ───────────────────────────────────────────────── */
function EmptyState({ filter }: { filter: string }) {
  const msgs: Record<string, { icon: string; title: string; body: string }> = {
    all: { icon: "⚡", title: "No active bids", body: "When you place a bid on an auction, it will show up here." },
    leading: { icon: "🏆", title: "Not winning anything yet", body: "Place a bid and lead the pack!" },
    outbid: { icon: "😬", title: "No outbids", body: "You're either winning or haven't bid yet." },
    ended: { icon: "🏁", title: "No ended auctions", body: "Auctions you've bid on will show here when they end." },
  };
  const m = msgs[filter] || msgs.all;

  return (
    <div className="text-center py-20 px-6 bg-white rounded-[14px] border border-[#E5E7EB]">
      <div className="text-[52px] mb-3">{m.icon}</div>
      <div className="text-lg font-bold text-[#111827] mb-1.5">{m.title}</div>
      <div className="text-sm text-[#6B7280] mb-5 max-w-[320px] mx-auto">{m.body}</div>
      <Link
        href="/search"
        className="inline-flex items-center justify-center bg-[#F97316] text-white rounded-[10px] px-6 py-2.5 text-sm font-bold hover:bg-[#EA6C0A] transition-colors no-underline"
      >
        🔥 Browse auctions
      </Link>
    </div>
  );
}

/* ─── Skeleton Card ─────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-[#E5E7EB]" />
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
export default function BidsPage() {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "leading" | "outbid" | "ended">("all");
  const [search, setSearch] = useState("");
  const [biddingId, setBiddingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchBids();
  }, []);

  const fetchBids = async () => {
    try {
      const res = await fetch("/api/buyer/bids");
      const json = await res.json();
      if (json.success) {
        setBids(json.data);
      }
    } catch (err) {
      console.error("Failed to load bids", err);
      setToast({ msg: "❌ Failed to load bids", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBid = async (bid: Bid, amount: number) => {
    setBiddingId(bid.id);
    try {
      const res = await fetch("/api/buyer/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: bid.listingId,
          item: bid.item,
          image: bid.image,
          amount,
          endTime: bid.endTime,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setBids((prev) =>
          prev.map((b) =>
            b.id === bid.id
              ? { ...b, myBid: amount, currentBid: amount, leading: true }
              : b
          )
        );
        setToast({ msg: `⚡ Bid of ₦${amount.toLocaleString()} placed!`, type: "success" });
      } else {
        throw new Error();
      }
    } catch {
      setToast({ msg: "❌ Failed to place bid. Try again.", type: "error" });
    } finally {
      setBiddingId(null);
    }
  };

  const now = Date.now();
  const filtered = bids.filter((b) => {
    const ended = new Date(b.endTime).getTime() < now;
    const matchesSearch = search === "" || b.item.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "leading" && b.leading && !ended) ||
      (filter === "outbid" && !b.leading && !ended) ||
      (filter === "ended" && ended);
    return matchesSearch && matchesFilter;
  });

  const leadingCount = bids.filter((b) => b.leading && new Date(b.endTime).getTime() > now).length;
  const outbidCount = bids.filter((b) => !b.leading && new Date(b.endTime).getTime() > now).length;
  const endedCount = bids.filter((b) => new Date(b.endTime).getTime() <= now).length;

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-[1080px] mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-[22px] font-extrabold text-[#111827]">My Bids</h1>
              <p className="text-[13px] text-[#6B7280] mt-0.5">
                {bids.length} active bid{bids.length !== 1 ? "s" : ""}
                {leadingCount > 0 && (
                  <span className="ml-2 text-[#16A34A] font-semibold">
                    · {leadingCount} winning 🏆
                  </span>
                )}
                {outbidCount > 0 && (
                  <span className="ml-2 text-[#DC2626] font-semibold">
                    · {outbidCount} outbid 😬
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <input
                  className="w-full sm:w-[260px] bg-white border border-[#E5E7EB] rounded-[10px] pl-9 pr-3 py-2 text-[13px] text-[#111827] outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] transition-all placeholder:text-[#9CA3AF]"
                  placeholder="Search auctions..."
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
              { key: "all", label: "All", count: bids.length },
              { key: "leading", label: "Winning", count: leadingCount },
              { key: "outbid", label: "Outbid", count: outbidCount },
              { key: "ended", label: "Ended", count: endedCount },
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
          <EmptyState filter={filter} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((bid) => (
              <BidCard
                key={bid.id}
                bid={bid}
                onBid={handlePlaceBid}
                bidding={biddingId === bid.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}