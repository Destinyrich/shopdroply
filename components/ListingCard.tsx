"use client";
import Link from "next/link";
import { useState } from "react";
import useCountdown from "@/hooks/useCountdown";
import { formatCurrency, slugify } from "@/lib/utils";

type Listing = {
  id: string | number;
  type: "auction" | string;
  endTime?: string | number | Date;
  location: string;
  title: string;
  bids?: number;
  currentBid?: number;
  price: number;
  shippingFee: number;
  sellerName: string;
  sellerRating: number;
  sellerReviews: number;
  sellerBadge: string;
};

export default function ListingCard({ item }: { item: Listing }) {
  const [saved, setSaved] = useState(false);
  const timer = item.type === "auction" && item.endTime
    ? useCountdown(String(item.endTime))
    : null;

  const isAuction = item.type === "auction";
  const slug = slugify(item.title);

  return (
    <Link href={`/product/${item.id}-${slug}`} className="no-underline text-inherit">
      <div className="card-hover bg-white border-[1.5px] border-[#E5E7EB] rounded-xl overflow-hidden flex flex-col h-full">
        <div className="h-[170px] bg-[#F9FAFB] flex items-center justify-center text-6xl relative border-b border-[#E5E7EB]">
          <span>📦</span>
          <div className={`absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-[3px] rounded-md tracking-wider ${isAuction?"bg-[#FBBF24] text-black":"bg-[#16A34A] text-white"}`}>
            {isAuction?"⚡ AUCTION":"🏷 BUY NOW"}
          </div>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSaved(!saved); }} className="absolute top-2 right-2 w-[30px] h-[30px] rounded-full bg-white/90 border border-[#E5E7EB] text-sm flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
            {saved?"❤️":"🤍"}
          </button>
          {isAuction && timer && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-[3px] rounded-md flex items-center gap-1 bg-black/70">
              <span className="text-[10px] text-white">⏱</span>
              <span className="text-xs font-bold text-white font-mono">{timer}</span>
            </div>
          )}
        </div>
        <div className="p-3 flex flex-col gap-1.5 flex-1">
          <div className="text-[11px] text-[#9CA3AF]">📍 {item.location}</div>
          <div className="text-[13px] font-semibold text-[#1A1A1A] leading-snug line-clamp-2 flex-1">{item.title}</div>
          <div>
            {isAuction && item.bids !== undefined && (
              <div className="text-[11px] text-[#6B7280] mb-0.5">Current bid · <span className="text-[#D97706] font-bold">{item.bids} bids</span></div>
            )}
            <div className="text-[17px] font-extrabold text-[#1A1A1A]">
              {formatCurrency(isAuction && item.currentBid ? item.currentBid : item.price)}
            </div>
          </div>
          <div className="text-[11px] text-[#6B7280]">🚚 {item.shippingFee === 0 ? "Free shipping" : formatCurrency(item.shippingFee)}</div>
          <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB] mt-0.5">
            <div>
              <div className="text-[11px] font-semibold text-[#374151]">{item.sellerName}</div>
              <div className="text-[11px] text-[#D97706]">⭐ {item.sellerRating} ({item.sellerReviews})</div>
            </div>
            <div className={`text-[10px] font-semibold px-[7px] py-[2px] rounded-md ${item.sellerBadge==="Verified"||item.sellerBadge==="CAC verified"?"bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]":"bg-[#FFF7ED] text-[#F97316] border border-[#FED7AA]"}`}>
              {item.sellerBadge}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}