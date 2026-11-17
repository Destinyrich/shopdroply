"use client";

import { ProductSeller } from "@/types/product";
import Badge from "./Badge";

interface Props {
  seller: ProductSeller;
}

export default function SellerCard({ seller }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 flex flex-col gap-3">
      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sold by</div>

      <div className="flex gap-3 items-center">
        <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-xl md:text-2xl">
          {seller.avatar}
        </div>
        <div>
          <div className="text-[15px] font-bold text-gray-900">{seller.name}</div>
          <div className="flex gap-1.5 mt-1 flex-wrap">
            <Badge type={seller.badge} />
            <Badge type={seller.level} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Rating", value: `${seller.rating} ⭐` },
          { label: "Reviews", value: seller.reviews },
          { label: "Sales", value: seller.sales },
          { label: "Response", value: seller.responseTime },
        ].map((s) => (
          <div key={s.label} className="bg-gray-50 rounded-lg px-2.5 py-2">
            <div className="text-[10px] text-gray-400 mb-0.5">{s.label}</div>
            <div className="text-xs font-bold text-gray-900">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button className="flex-1 py-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50 transition-colors cursor-pointer">
          💬 Message
        </button>
        <button className="flex-1 py-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50 transition-colors cursor-pointer">
          🏪 View shop
        </button>
      </div>

      <div className="text-[11px] text-gray-400 text-center">
        📍 {seller.location} · Member since {seller.memberSince}
      </div>
    </div>
  );
}