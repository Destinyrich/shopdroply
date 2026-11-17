"use client";

import { useState } from "react";
import { FixedProduct } from "@/types/product";

interface Props {
  product: FixedProduct;
}

export default function BuyBox({ product }: Props) {
  const [qty, setQty] = useState(1);
  const [shipping, setShipping] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;
  const total = product.price * qty + product.shipping[shipping].price;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };
  const handleAddToCart = async () => {
    setAdding(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: product.id,
          title: product.title,
          image: product.images[0] || "",
          price: product.price,
          qty,
          seller: product.seller.name,
          shipping: product.shipping[shipping].price,
          courierId: shipping,
          condition: product.condition,
        }),
      });

      if (res.status === 401) {
        showToast("Please login first 🔒");
        setTimeout(() => (window.location.href = "/auth"), 1200);
        return;
      }

      if (!res.ok) throw new Error("Failed");
      showToast("Added to cart! 🛒");
    } catch {
      showToast("Could not add to cart ❌");
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    // Add to cart then go straight to cart/checkout
    await handleAddToCart();
    window.location.href = "/buyer/cart";
  };

  return (
    <>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold z-[999] animate-[fadeUp_0.3s_ease] flex items-center gap-2 whitespace-nowrap pointer-events-none">
          ✅ {toast}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
        {/* Price */}
        <div>
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span className="text-[28px] font-extrabold text-gray-900">
              ₦{product.price.toLocaleString()}
            </span>
            {product.originalPrice && (
              <span className="text-[15px] text-gray-400 line-through">
                ₦{product.originalPrice.toLocaleString()}
              </span>
            )}
            {discount > 0 && (
              <span className="text-[13px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                -{discount}% OFF
              </span>
            )}
          </div>
          {product.originalPrice && (
            <div className="text-xs text-gray-500 mt-1">
              You save ₦
              {(product.originalPrice - product.price).toLocaleString()}
            </div>
          )}
        </div>

        {/* Escrow */}
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 flex gap-2 items-start">
          <span className="text-base flex-shrink-0">🛡️</span>
          <div>
            <div className="text-xs font-bold text-green-800">
              Protected by Shopdroply Escrow
            </div>
            <div className="text-[11px] text-green-800/80 leading-relaxed mt-0.5">
              Your ₦{product.price.toLocaleString()} is held safely until you
              confirm delivery. No risk.
            </div>
          </div>
        </div>

        {/* Condition */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Condition:</span>
          <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md">
            {product.condition}
          </span>
          <span>·</span>
          <span>📍 {product.location}</span>
        </div>

        {/* Stock warning */}
        {product.stockCount <= 5 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs font-semibold text-amber-700 flex items-center gap-1.5">
            ⚠️ Only {product.stockCount} left in stock — order soon
          </div>
        )}

        {/* Quantity */}
        <div>
          <div className="text-[13px] font-semibold text-gray-700 mb-2">
            Quantity
          </div>
          <div className="flex items-center w-fit border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-9 h-9 bg-gray-50 border-none cursor-pointer text-base flex items-center justify-center text-gray-700 hover:bg-gray-100"
            >
              −
            </button>
            <div className="w-10 h-9 flex items-center justify-center text-sm font-bold text-gray-900 border-x border-gray-200">
              {qty}
            </div>
            <button
              onClick={() => setQty((q) => Math.min(product.stockCount, q + 1))}
              className="w-9 h-9 bg-gray-50 border-none cursor-pointer text-base flex items-center justify-center text-gray-700 hover:bg-gray-100"
            >
              +
            </button>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            {product.sold} sold · {product.stockCount} available
          </div>
        </div>

        {/* Shipping */}
        <div>
          <div className="text-[13px] font-semibold text-gray-700 mb-2">
            🚚 Shipping method
          </div>
          <div className="flex flex-col gap-1.5">
            {product.shipping.map((s, i) => (
              <label
                key={i}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                  shipping === i
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 bg-white hover:border-orange-300"
                }`}
              >
                <input
                  type="radio"
                  checked={shipping === i}
                  onChange={() => setShipping(i)}
                  className="accent-orange-500 flex-shrink-0"
                />
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-gray-900">
                    {s.courier}
                  </div>
                  <div className="text-[11px] text-gray-500">⏱ {s.time}</div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-bold text-gray-900">
                    ₦{s.price.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-gray-400">{s.label}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="bg-gray-50 rounded-lg px-3.5 py-3">
          <div className="flex justify-between text-[13px] text-gray-500 mb-1.5">
            <span>Item × {qty}</span>
            <span>₦{(product.price * qty).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[13px] text-gray-500 mb-2">
            <span>Shipping</span>
            <span>₦{product.shipping[shipping].price.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-base font-extrabold text-gray-900 border-t border-gray-200 pt-2">
            <span>Total</span>
            <span className="text-orange-500">₦{total.toLocaleString()}</span>
          </div>
        </div>

        {/* CTAs */}
        <div className="hidden md:flex flex-col gap-2.5">
          <button
            onClick={handleBuyNow}
            disabled={adding}
            className="w-full py-3.5 rounded-xl bg-orange-500 text-white font-bold text-[15px] hover:bg-orange-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/20 active:translate-y-0 transition-all cursor-pointer disabled:opacity-60"
          >
            {adding ? "Processing..." : "🛒 Buy now — pay securely"}
          </button>
          <button
            onClick={handleAddToCart}
            disabled={adding}
            className="w-full py-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50 transition-colors cursor-pointer disabled:opacity-60"
          >
            {adding ? "Adding..." : "+ Add to cart"}
          </button>
        </div>

        {/* Make offer */}
        <button className="bg-transparent border-none text-orange-500 font-semibold text-[13px] cursor-pointer underline hover:text-orange-600 text-center">
          💬 Make an offer to seller
        </button>

        {/* Safety */}
        <div className="flex gap-4 justify-center flex-wrap">
          {["🔒 Secure checkout", "↩️ Easy returns", "📞 Buyer support"].map(
            (l) => (
              <span key={l} className="text-[11px] text-gray-500">
                {l}
              </span>
            ),
          )}
        </div>
      </div>
    </>
  );
}
