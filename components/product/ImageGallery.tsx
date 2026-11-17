"use client";

import { useState } from "react";

interface Props {
  images: string[];
  isAuction?: boolean;
}

export default function ImageGallery({ images, isAuction = false }: Props) {
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col-reverse md:flex-row gap-3">
      <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible scrollbar-hide">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`w-16 h-16 md:w-[72px] md:h-[72px] rounded-lg bg-gray-50 border-2 flex items-center justify-center text-2xl flex-shrink-0 cursor-pointer transition-colors ${
              active === i ? "border-orange-500" : "border-gray-200 hover:border-orange-500"
            }`}
          >
            {img}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-[260px] md:min-h-[380px] bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center text-[90px] md:text-[140px] relative overflow-hidden select-none">
        <span key={active} className="animate-[fadeIn_0.3s_ease]">
          {images[active]}
        </span>

        {isAuction && (
          <div className="absolute top-3 left-3 bg-orange-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE AUCTION
          </div>
        )}

        {images.length > 1 && (
          <>
            <button
              onClick={() => setActive((p) => (p - 1 + images.length) % images.length)}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 border border-gray-200 flex items-center justify-center text-sm cursor-pointer hover:border-orange-500 transition-colors"
            >
              ←
            </button>
            <button
              onClick={() => setActive((p) => (p + 1) % images.length)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 border border-gray-200 flex items-center justify-center text-sm cursor-pointer hover:border-orange-500 transition-colors"
            >
              →
            </button>
          </>
        )}

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                i === active ? "w-4 bg-orange-500" : "w-1.5 bg-black/25"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}