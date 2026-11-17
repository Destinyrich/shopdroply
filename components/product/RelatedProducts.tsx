"use client";

import { RelatedProduct } from "@/types/product";
import Link from "next/link";
import { slugify } from "@/lib/utils";

interface Props {
  items: RelatedProduct[];
}

export default function RelatedProducts({ items }: Props) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-extrabold text-gray-900 mb-4">You might also like</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((item) => {
          const slug = slugify(item.title);

          return (
            <Link
              key={item.id}
              href={`/product/${item.id}-${slug}`}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-orange-500"
            >
              <div className="h-24 md:h-28 bg-gray-50 flex items-center justify-center text-4xl border-b border-gray-100 relative">
                {item.image}
                <div
                  className={`absolute top-1.5 left-1.5 text-[9px] font-bold px-1 py-0.5 rounded ${
                    item.type === "auction"
                      ? "bg-yellow-400 text-black"
                      : "bg-green-600 text-white"
                  }`}
                >
                  {item.type === "auction" ? `⚡ ${item.bids} bids` : "🏷 BUY"}
                </div>
              </div>
              <div className="p-2.5">
                <div className="text-[11px] font-semibold text-gray-900 leading-snug line-clamp-2 mb-1">
                  {item.title}
                </div>
                <div className="text-sm font-extrabold text-gray-900">
                  ₦{item.price.toLocaleString()}
                </div>
                <div className="text-[10px] text-amber-600 mt-0.5">⭐ {item.rating}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}