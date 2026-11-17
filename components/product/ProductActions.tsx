"use client";

import { useState } from "react";
import { Product } from "@/types/product";

interface Props {
  product: Product;
}

export default function ProductActions({ product }: Props) {
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const handleSave = () => {
    setSaved((s) => !s);
    showToast(!saved ? "❤️ Saved to watchlist" : "🤍 Removed from watchlist");
    // Wire up: POST /api/buyer/watchlist
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("📤 Link copied to clipboard");
    } catch {
      showToast("Unable to copy link");
    }
  };

  return (
    <>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold z-[999] flex items-center gap-2 whitespace-nowrap pointer-events-none animate-[fadeUp_0.3s_ease]">
          {toast}
        </div>
      )}

      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={handleSave}
          className="px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50 transition-colors cursor-pointer"
        >
          {saved ? "❤️ Saved" : "🤍 Save"}
        </button>
        <button
          onClick={handleShare}
          className="px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50 transition-colors cursor-pointer"
        >
          📤 Share
        </button>
      </div>
    </>
  );
}