"use client";

import { useState } from "react";

/**
 * Shown for orders still "Pending payment".
 * Asks the server for a Paystack payment link for this checkout, then sends the buyer there.
 * (The server re-uses a recent open payment, so tapping twice never double-charges.)
 */
export default function PayNowButton({ checkoutId }: { checkoutId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/buyer/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Could not start payment");
        return;
      }
      window.location.href = json.data.authorizationUrl; // go to Paystack
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={pay}
        disabled={busy}
        className="bg-[#F97316] text-white rounded-lg px-3 py-1.5 text-[11px] font-bold hover:bg-[#EA6C0A] transition-all cursor-pointer disabled:opacity-60"
      >
        {busy ? "Opening…" : "💳 Pay now"}
      </button>
      {error && <span className="text-[11px] text-[#DC2626]">{error}</span>}
    </div>
  );
}