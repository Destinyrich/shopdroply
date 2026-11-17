"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SellerSidebar from "@/components/seller/Sidebar";

interface SellerAccountProfile {
  id: string; name: string; email: string; sellerStatus?: string;
}

interface Offer {
  id: string; sellerId: string; listingId: string; item: string; image: string;
  listedPrice: number; offeredPrice: number; note?: string; buyerName: string;
  status: "pending" | "countered" | "accepted" | "declined"; counterPrice?: number;
  createdAt: string;
}

interface Bid {
  id: string; userId: string; listingId: string; item: string; image: string;
  myBid: number; currentBid: number; leading: boolean; endTime: string;
  totalBids: number; createdAt: string;
}

const OFFER_STATUS: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  pending:   { label: "Pending",  color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "⏳" },
  countered: { label: "Countered", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", icon: "↩️" },
  accepted:  { label: "Accepted", color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0", icon: "✅" },
  declined:  { label: "Declined", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: "❌" },
};

const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;

function timeAgo(iso?: string) {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

const maskBidder = (userId: string) => {
  const tail = userId.slice(-1).toUpperCase();
  return `B****${tail}`;
};

function StatusPill({ status }: { status: string }) {
  const sc = OFFER_STATUS[status] || OFFER_STATUS.pending;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap"
      style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}>
      {sc.icon} {sc.label}
    </span>
  );
}

function CounterModal({ offer, onClose, onCounter, busy }: {
  offer: Offer; onClose: () => void; onCounter: (price: number) => void; busy: boolean;
}) {
  const [price, setPrice] = useState("");
  const error = price && (Number(price) <= 0 || Number(price) >= offer.listedPrice)
    ? `Counter must be between the offer (${naira(offer.offeredPrice)}) and list price` : "";

  return (
    <div className="fixed inset-0 bg-black/50 z-[500] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[20px] p-7 max-w-[420px] w-full" onClick={(e) => e.stopPropagation()}>
        <div className="text-[17px] font-extrabold text-[#111827] mb-1">↩️ Counter offer</div>
        <div className="text-[13px] text-[#6B7280] mb-5">{offer.item}</div>

        <div className="bg-[#F9FAFB] rounded-[10px] p-3.5 mb-5 flex flex-col gap-1.5 text-[13px]">
          <div className="flex justify-between"><span className="text-[#6B7280]">Listed price</span><span className="text-[#111827] font-semibold">{naira(offer.listedPrice)}</span></div>
          <div className="flex justify-between"><span className="text-[#6B7280]">Buyer's offer</span><span className="text-[#F97316] font-bold">{naira(offer.offeredPrice)}</span></div>
        </div>

        <div className="mb-5">
          <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Your counter price</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#374151]">₦</span>
            <input
              className="w-full pl-7 pr-3.5 py-2.5 border-[1.5px] rounded-[10px] text-sm outline-none bg-white"
              style={{ borderColor: error ? "#DC2626" : "#E5E7EB" }}
              placeholder="Enter amount…"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
            />
          </div>
          {error && <div className="text-xs text-[#DC2626] mt-1">⚠️ {error}</div>}
        </div>

        <div className="flex gap-2.5">
          <button onClick={onClose} disabled={busy}
            className="flex-1 py-2.5 text-sm font-semibold text-[#374151] border-[1.5px] border-[#E5E7EB] rounded-[10px] hover:border-[#F97316] hover:text-[#F97316] bg-white cursor-pointer disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={() => Number(price) > 0 && onCounter(Number(price))}
            disabled={busy || !price || !!error}
            className="flex-[2] py-2.5 text-sm font-bold text-white bg-[#F97316] rounded-[10px] hover:bg-[#EA6C0A] cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed">
            {busy ? "Sending…" : "Send counter"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SellerOffersPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<SellerAccountProfile | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [activeTab, setActiveTab] = useState<"offers" | "bids">("offers");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [counterTarget, setCounterTarget] = useState<Offer | null>(null);
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
      const [profileRes, offersRes] = await Promise.all([
        fetch("/api/seller/me"),
        fetch("/api/seller/offers"),
      ]);
      const profileData = await profileRes.json();
      const offersData = await offersRes.json();
      if (!profileData.success || !profileData.data) {
        router.push("/seller/onboarding");
        return;
      }
      setSeller(profileData.data);
      if (offersData.success && offersData.data) {
        setOffers(offersData.data.offers || []);
        setBids(offersData.data.bids || []);
      }
    } catch {
      setToast({ msg: "❌ Failed to load offers", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const updateOffer = async (id: string, status: string, counterPrice?: number) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/seller/offers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, ...(counterPrice ? { counterPrice } : {}) }),
      });
      const data = await res.json();
      if (data.success) {
        setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, ...data.data } : o)));
        setCounterTarget(null);
        const labels: Record<string, string> = { accepted: "Offer accepted", declined: "Offer declined", countered: "Counter offer sent" };
        setToast({ msg: `✅ ${labels[status] || "Offer updated"}`, type: "success" });
      } else {
        setToast({ msg: `❌ ${data.error || "Update failed"}`, type: "error" });
      }
    } catch {
      setToast({ msg: "❌ Failed to update offer", type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = offers.filter((o) => o.status === "pending").length;

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

      {counterTarget && (
        <CounterModal offer={counterTarget} busy={busyId === counterTarget.id}
          onClose={() => setCounterTarget(null)}
          onCounter={(price) => updateOffer(counterTarget.id, "countered", price)} />
      )}

      <SellerSidebar activeTab="offers" seller={seller} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="lg:pl-[260px] min-h-screen">
        <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] h-16 flex items-center gap-3 px-4 lg:px-6">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden bg-transparent border-none text-xl cursor-pointer p-1">☰</button>
          <h1 className="text-lg font-extrabold text-[#111827]">Offers & Bids</h1>
        </header>

        <div className="p-4 lg:p-6 max-w-[1000px]">
          {/* Tabs */}
          <div className="flex border-b-2 border-[#E5E7EB] mb-6">
            {([
              { key: "offers", label: "💬 Offers", count: pendingCount },
              { key: "bids", label: "🔨 Bids", count: bids.length },
            ] as const).map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 -mb-[2px] whitespace-nowrap cursor-pointer bg-transparent transition-all"
                style={{
                  color: activeTab === tab.key ? "#F97316" : "#6B7280",
                  borderBottomColor: activeTab === tab.key ? "#F97316" : "transparent",
                }}>
                {tab.label}
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: activeTab === tab.key ? "#F97316" : "#F9FAFB", color: activeTab === tab.key ? "#fff" : "#6B7280" }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 bg-white border border-[#E5E7EB] rounded-[14px] animate-pulse" />
              ))}
            </div>
          ) : activeTab === "offers" ? (
            <div className="flex flex-col gap-3">
              {offers.length === 0 ? (
                <div className="bg-white border border-[#E5E7EB] rounded-[14px] text-center py-16 text-sm text-[#6B7280]">
                  <div className="text-4xl mb-3">💬</div>
                  <div className="text-base font-bold text-[#111827] mb-1">No offers yet</div>
                  Buyer offers on your listings will appear here.
                </div>
              ) : (
                offers.map((offer) => {
                  const discount = Math.round((1 - offer.offeredPrice / offer.listedPrice) * 100);
                  return (
                    <div key={offer.id} className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-4 hover:border-[#F97316] transition-all">
                      <div className="flex gap-3.5 items-start flex-wrap">
                        <div className="w-[52px] h-[52px] rounded-[10px] bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                          {offer.image ? <img src={offer.image} alt="" className="w-full h-full object-cover" /> : "📦"}
                        </div>
                        <div className="flex-1 min-w-[220px]">
                          <div className="flex justify-between items-start gap-2 flex-wrap mb-1.5">
                            <div>
                              <div className="text-sm font-bold text-[#111827] mb-0.5">{offer.item}</div>
                              <div className="text-xs text-[#6B7280]">From {offer.buyerName} · {timeAgo(offer.createdAt)}</div>
                            </div>
                            <StatusPill status={offer.status} />
                          </div>

                          <div className="flex gap-3 items-baseline flex-wrap mb-2">
                            <span className="text-[11px] text-[#6B7280] line-through">{naira(offer.listedPrice)}</span>
                            <span className="text-xl font-extrabold text-[#F97316]">{naira(offer.offeredPrice)}</span>
                            <span className="text-[11px] font-bold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] px-2 py-0.5 rounded-[10px]">−{discount}%</span>
                            {offer.counterPrice ? (
                              <span className="text-xs text-[#2563EB] font-semibold">Your counter: {naira(offer.counterPrice)}</span>
                            ) : null}
                          </div>

                          {offer.note && (
                            <div className="bg-[#F9FAFB] rounded-lg px-3 py-2 mb-3 text-xs text-[#374151] italic">
                              &ldquo;{offer.note}&rdquo;
                            </div>
                          )}

                          {offer.status === "pending" && (
                            <div className="flex gap-2 flex-wrap">
                              <button disabled={busyId === offer.id} onClick={() => updateOffer(offer.id, "accepted")}
                                className="px-4 py-2 text-xs font-bold text-white bg-[#16A34A] rounded-lg hover:bg-[#15803D] transition-all cursor-pointer border-none disabled:opacity-50">
                                ✅ Accept
                              </button>
                              <button disabled={busyId === offer.id} onClick={() => setCounterTarget(offer)}
                                className="px-4 py-2 text-xs font-bold text-white bg-[#F97316] rounded-lg hover:bg-[#EA6C0A] transition-all cursor-pointer border-none disabled:opacity-50">
                                ↩️ Counter
                              </button>
                              <button disabled={busyId === offer.id} onClick={() => updateOffer(offer.id, "declined")}
                                className="px-4 py-2 text-xs font-semibold text-[#DC2626] bg-[#FEF2F2] border-[1.5px] border-[#FECACA] rounded-lg hover:bg-[#DC2626] hover:text-white transition-all cursor-pointer disabled:opacity-50">
                                ❌ Decline
                              </button>
                            </div>
                          )}
                          {offer.status === "accepted" && (
                            <div className="text-xs text-[#16A34A] font-semibold">
                              ✅ Offer accepted — the buyer has been notified to complete payment at the agreed price.
                            </div>
                          )}
                          {offer.status === "countered" && (
                            <div className="text-xs text-[#2563EB] font-semibold">
                              ↩️ Waiting for the buyer to respond to your counter.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {bids.length === 0 ? (
                <div className="bg-white border border-[#E5E7EB] rounded-[14px] text-center py-16 text-sm text-[#6B7280]">
                  <div className="text-4xl mb-3">🔨</div>
                  <div className="text-base font-bold text-[#111827] mb-1">No active bids</div>
                  Bids on your auction listings will appear here.
                </div>
              ) : (
                bids.map((bid) => (
                  <div key={bid.id} className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-4 hover:border-[#F97316] transition-all">
                    <div className="flex gap-3.5 items-center flex-wrap">
                      <div className="w-[52px] h-[52px] rounded-[10px] bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                        {bid.image ? <img src={bid.image} alt="" className="w-full h-full object-cover" /> : "📦"}
                      </div>
                      <div className="flex-1 min-w-[220px]">
                        <div className="text-sm font-bold text-[#111827] mb-0.5">{bid.item}</div>
                        <div className="text-xs text-[#6B7280] mb-2">{bid.totalBids} total bids · ends in {bid.endTime}</div>
                        <div className="flex gap-3 items-center flex-wrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#F5F3FF] border border-[#7C3AED] flex items-center justify-center text-[10px] font-extrabold text-[#7C3AED]">
                              {maskBidder(bid.userId)[0]}
                            </div>
                            <span className="text-[13px] font-semibold text-[#111827]">{maskBidder(bid.userId)}</span>
                          </div>
                          <span className="text-xl font-extrabold text-[#111827]">{naira(bid.myBid)}</span>
                          {bid.leading && (
                            <span className="text-[10px] font-bold text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] px-2 py-0.5 rounded-[10px]">🥇 Leading</span>
                          )}
                          <span className="text-[11px] text-[#6B7280]">{timeAgo(bid.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
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
