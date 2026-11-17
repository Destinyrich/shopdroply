"use client";

import { useState } from "react";
import { AuctionProduct } from "@/types/product";
import useCountdown from "@/hooks/useCountdown";

interface Props {
  product: AuctionProduct;
}

export default function BidBox({ product }: Props) {
  const timer = useCountdown(product.endTime);
  const [bidAmount, setBidAmount] = useState("");
  const [autoBidMax, setAutoBidMax] = useState("");
  const [autoBidOn, setAutoBidOn] = useState(false);
  const [bidError, setBidError] = useState("");
  const [bidSuccess, setBidSuccess] = useState(false);
  const [currentBid, setCurrentBid] = useState(product.currentBid);
  const [totalBids, setTotalBids] = useState(product.totalBids);
  const [toast, setToast] = useState<string | null>(null);

  const minBid = currentBid + 50000;
  const urgent = timer ? timer.startsWith("00:") && (parseInt(timer.split(":")[1] || "0") < 60) : false;
  const critical = timer ? timer.startsWith("00:0") : false;

  const quickBids = [
    { label: `+₦50K`, val: currentBid + 50000 },
    { label: `+₦100K`, val: currentBid + 100000 },
    { label: `+₦200K`, val: currentBid + 200000 },
    { label: `+₦500K`, val: currentBid + 500000 },
  ];

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2900);
  };

  const handleBid = () => {
    const amt = Number(String(bidAmount).replace(/,/g, ""));
    if (!amt || amt < minBid) {
      setBidError(`Minimum bid is ₦${minBid.toLocaleString()}`);
      return;
    }
    setBidError("");
    setBidSuccess(true);
    setCurrentBid(amt);
    setTotalBids((b) => b + 1);
    setTimeout(() => setBidSuccess(false), 2000);
    setBidAmount("");
    showToast(`Bid of ₦${amt.toLocaleString()} placed!`);
  };

  return (
    <>
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold z-[999] animate-[fadeUp_0.3s_ease] flex items-center gap-2 whitespace-nowrap pointer-events-none">
          ⚡ {toast}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
        {/* Current bid */}
        <div>
          <div className="text-xs text-gray-500 mb-1 font-semibold">CURRENT BID</div>
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span className="text-[30px] font-extrabold text-gray-900">
              ₦{currentBid.toLocaleString()}
            </span>
            <span className="text-[13px] text-gray-500">{totalBids} bids</span>
          </div>
          {!product.reserveMet && (
            <div className="text-xs text-amber-600 font-semibold mt-1">⚠️ Reserve price not yet met</div>
          )}
          <div className="text-xs text-gray-500 mt-0.5">
            Started at ₦{product.startPrice.toLocaleString()}
          </div>
        </div>

        {/* Countdown */}
        {timer && (
          <div
            className={`rounded-xl px-4 py-3.5 border ${
              critical
                ? "bg-red-50 border-red-300"
                : urgent
                ? "bg-red-50 border-red-200"
                : "bg-amber-50 border-amber-200"
            }`}
          >
            <div
              className={`text-[11px] font-bold mb-2.5 flex items-center gap-1.5 tracking-wide ${
                critical ? "text-red-600" : urgent ? "text-red-500" : "text-amber-600"
              }`}
            >
              {critical ? "🚨 ENDING VERY SOON" : urgent ? "⚡ ENDING SOON" : "⏱ AUCTION ENDS IN"}
            </div>
            <div className="flex gap-2 items-center">
              {timer.split(":").map((unit, i, arr) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="text-center">
                    <div
                      className={`bg-white border rounded-lg px-2.5 py-1 min-w-[48px] shadow-sm ${
                        critical || urgent ? "border-red-200" : "border-amber-200"
                      }`}
                    >
                      <span className="text-2xl font-extrabold text-gray-900 font-mono tabular-nums">
                        {unit}
                      </span>
                    </div>
                    <div
                      className={`text-[10px] font-semibold mt-1 ${
                        critical ? "text-red-600" : urgent ? "text-red-500" : "text-gray-500"
                      }`}
                    >
                      {i === 0 ? "Hours" : i === 1 ? "Minutes" : "Seconds"}
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <span
                      className={`text-xl font-extrabold mb-4 ${
                        critical || urgent ? "text-red-500" : "text-gray-600"
                      }`}
                    >
                      :
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Escrow */}
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 flex gap-2 items-start">
          <span className="text-base flex-shrink-0">🛡️</span>
          <div>
            <div className="text-xs font-bold text-green-800">Escrow protected auction</div>
            <div className="text-[11px] text-green-800/80 leading-relaxed mt-0.5">
              If you win, payment goes into escrow. Released to seller only after you confirm
              delivery.
            </div>
          </div>
        </div>

        {/* Quick bids */}
        <div>
          <div className="text-[13px] font-semibold text-gray-700 mb-2">Quick bid</div>
          <div className="flex gap-2 flex-wrap">
            {quickBids.map((q) => (
              <button
                key={q.label}
                onClick={() => setBidAmount(q.val.toLocaleString())}
                className="flex-1 min-w-[70px] py-2 px-3 rounded-lg border border-gray-200 bg-white text-[13px] font-semibold text-gray-700 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50 transition-colors cursor-pointer"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom bid */}
        <div>
          <div className="text-[13px] font-semibold text-gray-700 mb-1.5">Or enter your bid</div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">
              ₦
            </span>
            <input
              placeholder={`Min. ₦${minBid.toLocaleString()}`}
              value={bidAmount}
              onChange={(e) => {
                setBidAmount(e.target.value);
                setBidError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleBid()}
              className={`w-full pl-7 pr-3 py-2.5 border rounded-lg text-sm outline-none transition-all ${
                bidError
                  ? "border-red-500 focus:ring-2 focus:ring-red-500/10"
                  : "border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10"
              }`}
            />
          </div>
          {bidError && (
            <div className="text-xs text-red-600 mt-1 flex items-center gap-1">⚠ {bidError}</div>
          )}
          {bidSuccess && (
            <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
              ✅ Bid placed successfully!
            </div>
          )}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex flex-col gap-2.5">
          <button
            onClick={handleBid}
            className="w-full py-3.5 rounded-xl bg-orange-500 text-white font-bold text-[15px] hover:bg-orange-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/20 active:translate-y-0 transition-all cursor-pointer"
          >
            ⚡ Place bid — ₦
            {bidAmount
              ? Number(String(bidAmount).replace(/,/g, "")).toLocaleString()
              : minBid.toLocaleString()}
          </button>
          {product.buyNowPrice && (
            <button
              onClick={() => showToast("Redirecting to checkout...")}
              className="w-full py-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50 transition-colors cursor-pointer"
            >
              🛒 Buy now — ₦{product.buyNowPrice.toLocaleString()}
            </button>
          )}
        </div>

        {/* Auto-bid */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-0">
            <div>
              <div className="text-[13px] font-bold text-blue-600">🤖 Auto-bid</div>
              <div className="text-[11px] text-blue-800/70 mt-0.5">
                System bids for you up to your max
              </div>
            </div>
            <button
              onClick={() => setAutoBidOn(!autoBidOn)}
              className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${
                autoBidOn ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <div
                className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${
                  autoBidOn ? "left-[22px]" : "left-[3px]"
                }`}
              />
            </button>
          </div>
          {autoBidOn && (
            <div className="mt-3 animate-[fadeUp_0.3s_ease]">
              <div className="text-xs text-blue-800 font-semibold mb-1.5">Maximum bid amount</div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">
                  ₦
                </span>
                <input
                  placeholder="e.g. 16,000,000"
                  value={autoBidMax}
                  onChange={(e) => setAutoBidMax(e.target.value)}
                  className="w-full pl-6 pr-3 py-2 border border-blue-200 rounded-lg text-[13px] outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="text-[11px] text-blue-800/70 mt-1.5 leading-relaxed">
                We&apos;ll bid the minimum needed to keep you winning, up to your max. You&apos;ll be
                notified if outbid.
              </div>
              <button className="w-full mt-2.5 py-2.5 rounded-lg bg-orange-500 text-white font-bold text-[13px] hover:bg-orange-600 transition-colors cursor-pointer">
                Activate auto-bid
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-4 pt-1">
          <span className="text-xs text-gray-500">👁 {product.views} views</span>
          <span className="text-xs text-gray-500">❤️ {product.watchers} watching</span>
          <span className="text-xs text-gray-500">🔨 {totalBids} bids</span>
        </div>

        {/* Safety */}
        <div className="flex gap-3 justify-center flex-wrap">
          {["🔒 Secure bidding", "↩️ Easy returns", "📞 Buyer support"].map((l) => (
            <span key={l} className="text-[11px] text-gray-500">
              {l}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}