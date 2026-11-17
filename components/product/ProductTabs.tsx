"use client";

import { useState } from "react";
import { Product, AuctionProduct } from "@/types/product";
import Stars from "./Stars";

interface Props {
  product: Product;
}

export default function ProductTabs({ product }: Props) {
  const tabs = [
    { key: "description", label: "Description" },
    { key: "specs", label: "Specifications" },
    { key: "shipping", label: "Shipping & returns" },
    { key: "reviews", label: `Reviews (${product.reviews.length})` },
    ...(product.type === "auction"
      ? [{ key: "bidhistory", label: `Bid history (${(product as AuctionProduct).bidHistory.length})` }]
      : []),
  ];

  const [tab, setTab] = useState("description");

  const avgRating =
    product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length || 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 md:px-5 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
              tab === t.key
                ? "text-orange-500 border-orange-500"
                : "text-gray-500 border-transparent hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div key={tab} className="p-4 md:p-6 animate-[fadeIn_0.3s_ease]">
        {tab === "description" && (
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {product.description}
          </div>
        )}

        {tab === "specs" && (
          <div className="grid grid-cols-1 md:grid-cols-2">
            {product.specs.map((s, i) => (
              <div
                key={s.key}
                className={`flex px-3.5 py-2.5 border-b border-gray-100 ${
                  i % 2 === 0 ? "bg-gray-50" : "bg-white"
                }`}
              >
                <span className="text-[13px] font-semibold text-gray-500 min-w-[130px] flex-shrink-0">
                  {s.key}
                </span>
                <span className="text-[13px] text-gray-900">{s.value}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "shipping" && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[15px] font-bold text-gray-900 mb-3">🚚 Delivery options</div>
              {product.shipping.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-3.5 py-3 bg-gray-50 rounded-lg mb-2 border border-gray-200"
                >
                  <div className="text-2xl">{i === 0 ? "📦" : i === 1 ? "⚡" : "🏆"}</div>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold text-gray-900">
                      {s.courier} — {s.label}
                    </div>
                    <div className="text-xs text-gray-500">Estimated: {s.time} after dispatch</div>
                  </div>
                  <div className="text-sm font-bold text-orange-500">
                    ₦{s.price.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3.5">
              <div className="text-[13px] font-bold text-blue-600 mb-1">
                📍 Delivery address required at checkout
              </div>
              <div className="text-[13px] text-blue-900/80 leading-relaxed">
                You&apos;ll enter your state, LGA, and landmark at checkout. Google Plus Code supported
                for precise delivery in areas without formal addresses.
              </div>
            </div>
            <div>
              <div className="text-[15px] font-bold text-gray-900 mb-2">↩️ Returns policy</div>
              <div className="text-[13px] text-gray-700 leading-relaxed">
                You have <strong>5 days</strong> after delivery confirmation to raise a dispute if the
                item is not as described. Shopdroply escrow will hold funds until the dispute is
                resolved. Items must be returned in original condition with all accessories.
              </div>
            </div>
          </div>
        )}

        {tab === "reviews" && (
          <div>
            <div className="flex flex-wrap gap-6 items-center mb-6">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-none">
                  {avgRating.toFixed(1)}
                </div>
                <Stars rating={avgRating} size={16} />
                <div className="text-xs text-gray-500 mt-1">{product.reviews.length} reviews</div>
              </div>
              <div className="flex-1 min-w-[180px]">
                {[5, 4, 3, 2, 1].map((n) => {
                  const count = product.reviews.filter((r) => Math.round(r.rating) === n).length;
                  const pct = product.reviews.length ? (count / product.reviews.length) * 100 : 0;
                  return (
                    <div key={n} className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-500 w-3">{n}</span>
                      <span className="text-xs">⭐</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8">{Math.round(pct)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {product.reviews.map((r, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex justify-between mb-2">
                    <div>
                      <div className="text-[13px] font-bold text-gray-900">{r.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Stars rating={r.rating} size={12} />
                        {r.verified && (
                          <span className="text-[10px] text-green-600 font-semibold">
                            ✅ Verified purchase
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-400">{r.date}</span>
                  </div>
                  <p className="text-[13px] text-gray-700 leading-relaxed">{r.body}</p>
                </div>
              ))}
            </div>
            <button className="mt-4 px-6 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50 transition-colors cursor-pointer">
              Load more reviews
            </button>
          </div>
        )}

        {tab === "bidhistory" && product.type === "auction" && (
          <div className="flex flex-col">
            <div className="flex gap-3 px-3 py-2 bg-gray-50 rounded-t-lg border-b border-gray-200">
              <span className="text-xs font-bold text-gray-500 flex-1">Bidder</span>
              <span className="text-xs font-bold text-gray-500 min-w-[120px]">Amount</span>
              <span className="text-xs font-bold text-gray-500 min-w-[80px]">Time</span>
            </div>
            {(product as AuctionProduct).bidHistory.map((bid, i) => (
              <div
                key={i}
                className={`flex gap-3 px-3 py-2.5 border-b border-gray-100 items-center ${
                  bid.leading ? "bg-green-50" : "bg-white"
                }`}
              >
                <div className="flex-1 flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                      bid.leading
                        ? "bg-green-100 border border-green-200"
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    {bid.leading ? "🥇" : "👤"}
                  </div>
                  <span className="text-[13px] font-semibold text-gray-900">{bid.user}</span>
                  {bid.leading && (
                    <span className="text-[10px] font-bold text-green-600 bg-green-100 border border-green-200 px-1.5 py-0.5 rounded-full">
                      Leading
                    </span>
                  )}
                </div>
                <span
                  className={`text-sm font-bold min-w-[120px] ${
                    bid.leading ? "text-green-600" : "text-gray-900"
                  }`}
                >
                  ₦{bid.amount.toLocaleString()}
                </span>
                <span className="text-xs text-gray-500 min-w-[80px]">{bid.time}</span>
              </div>
            ))}
            <div className="flex justify-between items-center px-3 py-2.5 bg-gray-50 rounded-b-lg">
              <span className="text-xs text-gray-500">
                Showing all {(product as AuctionProduct).bidHistory.length} bids
              </span>
              <span className="text-xs text-orange-500 font-semibold cursor-pointer">
                Bid now to join →
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}