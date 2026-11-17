"use client";

import { Product, FixedProduct, AuctionProduct } from "@/types/product";

interface Props {
  product: Product;
}

export default function MobileStickyCTA({ product }: Props) {
  const isAuction = product.type === "auction";

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-[100] lg:hidden">
      <div className="flex gap-2">
        <button
          onClick={() => {
            // Wire up: POST /api/buyer/cart or /api/buyer/bids
            alert("Add to cart / Watchlist action");
          }}
          className="flex-1 py-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-orange-500 transition-colors cursor-pointer"
        >
          {isAuction ? "🔔 Watch" : "🛒 Cart"}
        </button>
        <button
          onClick={() => {
            // Wire up: checkout or bid modal
            alert("Primary CTA");
          }}
          className="flex-[2] py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-colors cursor-pointer"
        >
          {isAuction
            ? `⚡ Bid — ₦${(product as AuctionProduct).currentBid.toLocaleString()}`
            : `🛒 Buy — ₦${(product as FixedProduct).price.toLocaleString()}`}
        </button>
      </div>
    </div>
  );
}