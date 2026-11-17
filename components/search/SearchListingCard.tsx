"use client";

import { SearchListing } from "@/types/search";
import { useState } from "react";
import useCountdown from "@/hooks/useCountdown";
import Link from "next/link";
import { slugify } from "@/lib/utils";


interface Props {
  item: SearchListing;
  view: "grid" | "list";
}

export default function SearchListingCard({ item, view }: Props) {
  const [saved, setSaved] = useState(false);
  const countdown = item.type === "auction" && item.endTime ? useCountdown(item.endTime) : null;
  const urgent = countdown ? countdown.startsWith("00:") : false;
  const discount = item.originalPrice ? Math.round((1 - item.price / item.originalPrice) * 100) : 0;

  const isVerified = item.badge === "Verified" || item.badge === "CAC verified";
  const slug = slugify(item.title);


  if (view === "list") {
    return (
      <Link
        href={`/product/${item.id}-${slug}`}
        className="group flex bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-orange-500 mb-2.5"
      >
        {/* Image */}
        <div className="w-[140px] min-h-[130px] bg-gray-50 flex items-center justify-center text-5xl flex-shrink-0 relative border-r border-gray-100">
          {item.image}
          <div
            className={`absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded ${
              item.type === "auction" ? "bg-yellow-400 text-black" : "bg-green-600 text-white"
            }`}
          >
            {item.type === "auction" ? "⚡ AUCTION" : "🏷 BUY NOW"}
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 p-3.5 flex flex-col gap-1.5">
          <div className="flex justify-between items-start gap-3">
            <div>
              <div className="text-[11px] text-gray-400 mb-0.5">
                📍 {item.location} · {item.condition}
              </div>
              <div className="text-sm font-bold text-gray-900 leading-snug mb-1">
                {item.title}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSaved(!saved);
              }}
              className="bg-transparent border-none text-lg cursor-pointer flex-shrink-0"
            >
              {saved ? "❤️" : "🤍"}
            </button>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-lg font-extrabold text-gray-900">
              ₦{item.price.toLocaleString()}
            </span>
            {item.originalPrice && (
              <span className="text-xs text-gray-400 line-through">
                ₦{item.originalPrice.toLocaleString()}
              </span>
            )}
            {discount > 0 && (
              <span className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                -{discount}%
              </span>
            )}
          </div>

          {item.type === "auction" && countdown && (
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] ${
                  urgent
                    ? "bg-red-50 border-red-300 text-red-600"
                    : "bg-gray-50 border-gray-200 text-gray-500"
                }`}
              >
                ⏱ {countdown}
              </div>
              <span className="text-xs text-amber-600 font-semibold">{item.bids} bids</span>
            </div>
          )}

          <div className="flex items-center gap-3 mt-auto">
            <span className="text-[11px] text-gray-500">🚚 {item.shipping}</span>
            <span className="text-[11px] text-gray-500">·</span>
            <span className="text-[11px] text-gray-500">{item.seller}</span>
            <span className="text-[11px] text-amber-600">
              ⭐ {item.rating} ({item.reviews})
            </span>
            <div
              className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${
                isVerified
                  ? "bg-green-50 text-green-600 border-green-200"
                  : "bg-orange-50 text-orange-600 border-orange-200"
              }`}
            >
              {item.badge}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Grid view
  return (
    <Link
      href={`/product/${item.id}`}
      className="group flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-orange-500"
    >
      {/* Image */}
      <div className="h-40 bg-gray-50 flex items-center justify-center text-6xl relative border-b border-gray-100">
        {item.image}
        <div
          className={`absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded ${
            item.type === "auction" ? "bg-yellow-400 text-black" : "bg-green-600 text-white"
          }`}
        >
          {item.type === "auction" ? "⚡ AUCTION" : "🏷 BUY NOW"}
        </div>
        {discount > 0 && (
          <div className="absolute top-2 right-10 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
            -{discount}%
          </div>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSaved(!saved);
          }}
          className="absolute top-1.5 right-1.5 w-7 h-7 bg-white/90 border border-gray-200 rounded-full flex items-center justify-center text-sm cursor-pointer hover:border-orange-500"
        >
          {saved ? "❤️" : "🤍"}
        </button>
        {countdown && (
          <div
            className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md flex items-center gap-1 ${
              urgent ? "bg-red-600 animate-pulse" : "bg-black/70"
            }`}
          >
            <span className="text-[9px] text-white">⏱</span>
            <span className="text-[11px] font-bold text-white font-mono">{countdown}</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <div className="text-[10px] text-gray-400">
          📍 {item.location} · {item.condition}
        </div>
        <div className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2 flex-1">
          {item.title}
        </div>
        {item.type === "auction" && (
          <div className="text-[11px] text-amber-600 font-semibold">{item.bids} bids</div>
        )}
        <div className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-extrabold text-gray-900">
            ₦{item.price.toLocaleString()}
          </span>
          {item.originalPrice && (
            <span className="text-[11px] text-gray-400 line-through">
              ₦{item.originalPrice.toLocaleString()}
            </span>
          )}
        </div>
        <div className="text-[11px] text-gray-500">🚚 {item.shipping}</div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-0.5">
          <div>
            <div className="text-[10px] font-semibold text-gray-700 truncate max-w-[90px]">
              {item.seller}
            </div>
            <div className="text-[10px] text-amber-600">⭐ {item.rating} ({item.reviews})</div>
          </div>
          <div
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md border whitespace-nowrap ${
              isVerified
                ? "bg-green-50 text-green-600 border-green-200"
                : "bg-orange-50 text-orange-600 border-orange-200"
            }`}
          >
            {item.badge}
          </div>
        </div>
      </div>
    </Link>
  );
}