"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/* ─── Types ─────────────────────────────────────────────────────── */
interface CartItemUI {
  id: string;
  listingId: string;
  title: string;
  img: string;
  price: number;
  qty: number;
  seller: string;
  shipping: number;
  courierId: number;
  condition: string;
}

interface CheckoutPayload {
  checkoutId: string;
  orders: { id: string }[];
  total: number;
  subtotal: number;
  shipping: number;
  discount: number;
}

/* ─── Design tokens ─────────────────────────────────────────────── */
const C = {
  orange: "#F97316", orangeHov: "#EA6C0A", orangeLight: "#FFF7ED", orangeBdr: "#FED7AA",
  green: "#16A34A", greenLight: "#F0FDF4", greenBdr: "#BBF7D0",
  red: "#DC2626", redLight: "#FEF2F2", redBdr: "#FECACA",
  amber: "#D97706", amberLight: "#FFFBEB", amberBdr: "#FDE68A",
  blue: "#2563EB", blueLight: "#EFF6FF", blueBdr: "#BFDBFE",
  bg: "#F9FAFB", surface: "#FFFFFF", border: "#E5E7EB",
  text: "#111827", textMid: "#374151", textSub: "#6B7280", textLight: "#9CA3AF",
};

const COURIERS = [
  { id: 0, name: "GIG Logistics", label: "Standard", price: 2500, time: "1–2 days" },
  { id: 1, name: "Fez Delivery", label: "Express", price: 4500, time: "Same day" },
  { id: 2, name: "DHL Nigeria", label: "Premium", price: 6000, time: "Next day" },
];

const STATES = ["Lagos", "Abuja (FCT)", "Kano", "Rivers", "Oyo", "Anambra", "Kaduna", "Delta", "Enugu", "Ogun", "Imo", "Kwara", "Borno", "Edo", "Cross River", "Other"];

const PAY_METHODS = [
  { id: "card", icon: "💳", label: "Debit / Credit card", sub: "Visa, Mastercard, Verve" },
  { id: "transfer", icon: "🏦", label: "Bank transfer", sub: "Instant NIP — all banks" },
  { id: "ussd", icon: "📲", label: "USSD", sub: "*737# • *966# • *770# • *822#" },
  { id: "opay", icon: "🟢", label: "OPay wallet", sub: "Pay with your OPay balance" },
  { id: "palmpay", icon: "🟣", label: "PalmPay wallet", sub: "Pay with your PalmPay balance" },
  { id: "bnpl", icon: "📅", label: "Buy now, pay later", sub: "Carbon • Klump • FairMoney" },
];

/* ─── Helpers ───────────────────────────────────────────────────── */
function FieldError({ msg }: { msg?: string }) {
  return msg ? <div className="text-xs text-[#DC2626] mt-1 flex items-center gap-1">⚠ {msg}</div> : null;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-base font-bold text-[#111827] mb-3.5">{children}</div>;
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[13px] font-semibold text-[#374151] mb-1 block">
      {children}{required && <span className="text-[#DC2626] ml-0.5">*</span>}
    </label>
  );
}

/* ─── Stepper ───────────────────────────────────────────────────── */
function Stepper({ step }: { step: number }) {
  const steps = [{ n: 1, label: "Cart" }, { n: 2, label: "Address" }, { n: 3, label: "Payment" }, { n: 4, label: "Review" }, { n: 5, label: "Done" }];
  return (
    <div className="flex items-center justify-center gap-0 mb-7">
      {steps.map((s, i) => {
        const done = s.n < step;
        const active = s.n === step;
        return (
          <div key={s.n} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 transition-all border-2"
                style={{
                  background: done ? C.green : active ? C.orange : "#fff",
                  borderColor: done ? C.green : active ? C.orange : C.border,
                  color: done || active ? "#fff" : C.textLight,
                }}
              >
                {done ? "✓" : s.n}
              </div>
              <span className={`hidden sm:block text-[11px] whitespace-nowrap ${active ? "text-[#F97316] font-bold" : done ? "text-[#16A34A] font-medium" : "text-[#9CA3AF] font-medium"}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="w-12 h-0.5 mb-4 mx-1 transition-colors" style={{ background: done ? C.green : C.border }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Order Summary ─────────────────────────────────────────────── */
function OrderSummary({
  cart,
  couponCode,
  setCouponCode,
  couponApplied,
  setCouponApplied,
}: {
  cart: CartItemUI[];
  couponCode: string;
  setCouponCode: (v: string) => void;
  couponApplied: boolean;
  setCouponApplied: (v: boolean) => void;
}) {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = cart.reduce((s, i) => s + i.shipping, 0);
  const discount = couponApplied ? Math.round(subtotal * 0.05) : 0;
  const total = subtotal + shipping - discount;

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5 sticky top-[130px] h-fit">
      <SectionTitle>🛒 Order summary</SectionTitle>
      <div className="flex flex-col gap-2.5 mb-4 pb-4 border-b border-[#E5E7EB]">
        {cart.map((item) => (
          <div key={item.id} className="flex gap-2.5 items-center">
            <div className="w-10 h-10 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg flex items-center justify-center text-xl shrink-0">{item.img}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[#111827] truncate">{item.title}</div>
              <div className="text-[11px] text-[#6B7280]">Qty: {item.qty}</div>
            </div>
            <div className="text-[13px] font-bold text-[#111827] shrink-0">₦{(item.price * item.qty).toLocaleString()}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mb-3">
        <input
          className="flex-1 min-w-0 bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-[13px] text-[#111827] outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] transition-all placeholder:text-[#9CA3AF]"
          placeholder="Coupon code"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
        />
        <button
          onClick={() => couponCode === "SDP5" && setCouponApplied(true)}
          className="bg-white border border-[#E5E7EB] rounded-[10px] px-3.5 py-2 text-[13px] font-semibold text-[#374151] hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all cursor-pointer shrink-0"
        >
          Apply
        </button>
      </div>
      {couponApplied && <div className="text-xs text-[#16A34A] mb-2">✅ 5% discount applied!</div>}
      <div className="text-[11px] text-[#9CA3AF] mb-3.5">Try: SDP5</div>
      {[
        { label: "Subtotal", val: `₦${subtotal.toLocaleString()}` },
        { label: "Shipping", val: `₦${shipping.toLocaleString()}` },
        { label: "Discount", val: discount > 0 ? `−₦${discount.toLocaleString()}` : "—", color: discount > 0 ? C.green : C.textLight },
      ].map((r) => (
        <div key={r.label} className="flex justify-between text-[13px] text-[#6B7280] mb-2">
          <span>{r.label}</span>
          <span className="font-medium" style={{ color: r.color || C.textMid }}>{r.val}</span>
        </div>
      ))}
      <div className="flex justify-between text-[17px] font-extrabold text-[#111827] py-3 border-t border-b border-[#E5E7EB] mb-3.5">
        <span>Total</span>
        <span className="text-[#F97316]">₦{total.toLocaleString()}</span>
      </div>
      <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[10px] p-2.5 flex gap-2 items-start">
        <span className="text-base shrink-0">🛡️</span>
        <div className="text-[11px] text-[#166534] leading-relaxed"><strong>Escrow protected.</strong> Funds held safely until you confirm delivery.</div>
      </div>
    </div>
  );
}

/* ─── Cart Screen ───────────────────────────────────────────────── */
function CartScreen({
  cart,
  onUpdateQty,
  onRemove,
  onCourierChange,
  onNext,
}: {
  cart: CartItemUI[];
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCourierChange: (id: string, courierId: number, shipping: number) => void;
  onNext: () => void;
}) {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = cart.reduce((s, i) => s + i.shipping, 0);

  return (
    <div className="flex flex-col gap-5 animate-[fadeUp_0.38s_ease_both]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="text-[22px] font-extrabold text-[#111827]">Your cart ({cart.length} items)</h1>
        <Link href="/search" className="inline-flex items-center justify-center gap-1.5 bg-white border border-[#E5E7EB] rounded-[10px] px-3.5 py-2 text-[13px] font-semibold text-[#374151] hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all no-underline shrink-0">
          🛍️ Continue shopping
        </Link>
      </div>

      {cart.length === 0 ? (
        <div className="text-center py-16 px-6 bg-white rounded-[14px] border border-[#E5E7EB]">
          <div className="text-[52px] mb-3">🛒</div>
          <div className="text-lg font-bold text-[#111827] mb-1.5">Your cart is empty</div>
          <Link href="/search" className="inline-flex items-center justify-center bg-[#F97316] text-white rounded-[10px] px-6 py-2.5 text-sm font-bold hover:bg-[#EA6C0A] transition-colors no-underline mt-3">Browse listings</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-start">
          <div className="flex flex-col gap-3">
            {cart.map((item) => (
              <div key={item.id} className="bg-white border border-[#E5E7EB] rounded-xl p-4 transition-all hover:border-[#F97316] hover:shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
                <div className="flex gap-3.5 items-start flex-col sm:flex-row">
                  <div className="w-full sm:w-[100px] h-[100px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[10px] flex items-center justify-center text-[44px] shrink-0">{item.img}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-[#111827] leading-tight mb-1">{item.title}</div>
                    <div className="text-xs text-[#6B7280] mb-2">Seller: {item.seller} · {item.condition}</div>
                    <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                      <span className="text-xs text-[#6B7280]">🚚 Shipping:</span>
                      <select
                        className="bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-1 text-xs text-[#111827] outline-none cursor-pointer appearance-none pr-7 bg-no-repeat bg-[position:right_8px_center]"
                        style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2714%27 height=%2714%27 viewBox=%270 0 24 24%27%3E%3Cpath fill=%27%236B7280%27 d=%27M7 10l5 5 5-5z%27/%3E%3C/svg%3E')" }}
                        value={item.courierId}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                          const cid = +e.target.value;
                          onCourierChange(item.id, cid, COURIERS[cid].price);
                        }}
                      >
                        {COURIERS.map((c) => <option key={c.id} value={c.id}>{c.name} — ₦{c.price.toLocaleString()} ({c.time})</option>)}
                      </select>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-0 border border-[#E5E7EB] rounded-lg overflow-hidden">
                        <button onClick={() => onUpdateQty(item.id, -1)} className="w-8 h-8 bg-[#F9FAFB] border-none cursor-pointer text-base text-[#374151] flex items-center justify-center hover:bg-[#F3F4F6] transition-colors">−</button>
                        <span className="w-9 h-8 flex items-center justify-center text-[13px] font-bold border-l border-r border-[#E5E7EB]">{item.qty}</span>
                        <button onClick={() => onUpdateQty(item.id, +1)} className="w-8 h-8 bg-[#F9FAFB] border-none cursor-pointer text-base text-[#374151] flex items-center justify-center hover:bg-[#F3F4F6] transition-colors">+</button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-base font-extrabold text-[#111827]">₦{(item.price * item.qty).toLocaleString()}</span>
                        <button onClick={() => onRemove(item.id)} className="bg-transparent border-none cursor-pointer text-lg text-[#9CA3AF] hover:text-[#DC2626] transition-colors">🗑</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex gap-4 px-4 py-3.5 bg-white rounded-xl border border-[#E5E7EB] flex-wrap">
              {["🛡️ Escrow on all items", "🔒 Safe payment", "↩️ Easy returns", "📞 24hr support"].map((t) => (
                <span key={t} className="text-xs text-[#6B7280] font-medium">{t}</span>
              ))}
            </div>
          </div>

          <div className="order-summary-col">
            <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5">
              <SectionTitle>Order summary</SectionTitle>
              {[
                { label: "Subtotal", val: `₦${subtotal.toLocaleString()}` },
                { label: "Shipping", val: `₦${shipping.toLocaleString()}` },
              ].map((r) => (
                <div key={r.label} className="flex justify-between text-[13px] text-[#6B7280] mb-2">
                  <span>{r.label}</span>
                  <span className="text-[#374151] font-medium">{r.val}</span>
                </div>
              ))}
              <div className="flex justify-between text-[17px] font-extrabold text-[#111827] pt-3 border-t border-[#E5E7EB] mb-4">
                <span>Estimated total</span>
                <span className="text-[#F97316]">₦{(subtotal + shipping).toLocaleString()}</span>
              </div>
              <button onClick={onNext} className="w-full bg-[#F97316] text-white rounded-[10px] py-3.5 text-[15px] font-bold hover:bg-[#EA6C0A] hover:-translate-y-px hover:shadow-[0_4px_18px_rgba(249,115,22,0.3)] transition-all cursor-pointer">
                Proceed to checkout →
              </button>
              <div className="text-center mt-2.5 text-[11px] text-[#9CA3AF]">🔒 All payments secured by Shopdroply Escrow</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Address Screen ────────────────────────────────────────────── */
function AddressScreen({
  address, setAddress, cart, coupon, setCoupon, couponApplied, setCouponApplied, onNext, onBack,
}: {
  address: Record<string, string | number>;
  setAddress: React.Dispatch<React.SetStateAction<Record<string, string | number>>>;
  cart: CartItemUI[];
  coupon: string;
  setCoupon: (v: string) => void;
  couponApplied: boolean;
  setCouponApplied: (v: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setAddress((p) => ({ ...p, [k]: v }));
  const validate = () => {
    const e: Record<string, string> = {};
    if (!address.firstName?.toString().trim()) e.firstName = "Required";
    if (!address.lastName?.toString().trim()) e.lastName = "Required";
    if (!address.phone?.toString().trim()) e.phone = "Required";
    if (!address.state) e.state = "Select a state";
    if (!address.lga?.toString().trim()) e.lga = "Required";
    if (!address.address?.toString().trim()) e.address = "Required";
    return e;
  };
  const handleNext = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onNext();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-start">
      <div className="flex flex-col gap-5 animate-[fadeUp_0.38s_ease_both]">
        <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5">
          <SectionTitle>📦 Delivery address</SectionTitle>
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label required>First name</Label>
                <input className={`w-full px-3.5 py-2.5 border rounded-[10px] text-sm text-[#111827] outline-none transition-all bg-white placeholder:text-[#9CA3AF] ${errors.firstName ? "border-[#DC2626]" : address.firstName ? "border-[#16A34A]" : "border-[#E5E7EB] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"}`} placeholder="Emeka" value={address.firstName || ""} onChange={(e) => set("firstName", e.target.value)} />
                <FieldError msg={errors.firstName} />
              </div>
              <div>
                <Label required>Last name</Label>
                <input className={`w-full px-3.5 py-2.5 border rounded-[10px] text-sm text-[#111827] outline-none transition-all bg-white placeholder:text-[#9CA3AF] ${errors.lastName ? "border-[#DC2626]" : address.lastName ? "border-[#16A34A]" : "border-[#E5E7EB] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"}`} placeholder="Okafor" value={address.lastName || ""} onChange={(e) => set("lastName", e.target.value)} />
                <FieldError msg={errors.lastName} />
              </div>
            </div>
            <div>
              <Label required>Phone number</Label>
              <div className="flex gap-0">
                <div className="px-3 py-2.5 border border-r-0 border-[#E5E7EB] rounded-l-[10px] text-[13px] text-[#374151] bg-[#F9FAFB] flex items-center gap-1 whitespace-nowrap">🇳🇬 +234</div>
                <input className={`w-full px-3.5 py-2.5 border rounded-r-[10px] text-sm text-[#111827] outline-none transition-all bg-white placeholder:text-[#9CA3AF] ${errors.phone ? "border-[#DC2626]" : "border-[#E5E7EB] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"}`} placeholder="803 000 0000" value={address.phone || ""} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <FieldError msg={errors.phone} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label required>State</Label>
                <select className={`w-full px-3.5 py-2.5 border rounded-[10px] text-sm text-[#111827] outline-none bg-white appearance-none cursor-pointer pr-8 bg-no-repeat bg-[position:right_12px_center] ${errors.state ? "border-[#DC2626]" : "border-[#E5E7EB] focus:border-[#F97316]"}`} style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2714%27 height=%2714%27 viewBox=%270 0 24 24%27%3E%3Cpath fill=%27%236B7280%27 d=%27M7 10l5 5 5-5z%27/%3E%3C/svg%3E')" }} value={address.state || ""} onChange={(e) => set("state", e.target.value)}>
                  <option value="">Select state</option>
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <FieldError msg={errors.state} />
              </div>
              <div>
                <Label required>LGA / Area</Label>
                <input className={`w-full px-3.5 py-2.5 border rounded-[10px] text-sm text-[#111827] outline-none transition-all bg-white placeholder:text-[#9CA3AF] ${errors.lga ? "border-[#DC2626]" : address.lga ? "border-[#16A34A]" : "border-[#E5E7EB] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"}`} placeholder="e.g. Ikeja" value={address.lga || ""} onChange={(e) => set("lga", e.target.value)} />
                <FieldError msg={errors.lga} />
              </div>
            </div>
            <div>
              <Label required>Street address / Landmark</Label>
              <input className={`w-full px-3.5 py-2.5 border rounded-[10px] text-sm text-[#111827] outline-none transition-all bg-white placeholder:text-[#9CA3AF] ${errors.address ? "border-[#DC2626]" : address.address ? "border-[#16A34A]" : "border-[#E5E7EB] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"}`} placeholder="e.g. 14 Allen Avenue, beside First Bank" value={address.address || ""} onChange={(e) => set("address", e.target.value)} />
              <FieldError msg={errors.address} />
              <div className="text-[11px] text-[#9CA3AF] mt-1">Tip: Include a nearby landmark for easier delivery</div>
            </div>
            <div>
              <Label>Google Plus Code (optional)</Label>
              <input className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-[10px] text-sm text-[#111827] outline-none transition-all bg-white placeholder:text-[#9CA3AF] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]" placeholder="e.g. 6GXX+FC Lagos" value={address.plusCode || ""} onChange={(e) => set("plusCode", e.target.value)} />
              <div className="text-[11px] text-[#9CA3AF] mt-1">Find your Plus Code at <span className="text-[#F97316] cursor-pointer">maps.google.com</span></div>
            </div>
            <div>
              <Label>Delivery note (optional)</Label>
              <textarea className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-[10px] text-sm text-[#111827] outline-none transition-all bg-white placeholder:text-[#9CA3AF] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] resize-y min-h-[72px]" placeholder="e.g. Call before delivery, gate code is 1234..." value={address.note || ""} onChange={(e) => set("note", e.target.value)} />
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5">
          <SectionTitle>🏪 Or pick up from a hub</SectionTitle>
          <div className="flex flex-col gap-2">
            {[
              { name: "GIG Logistics — Ikeja Hub", addr: "12 Adeniyi Jones, Ikeja, Lagos", price: "₦500 savings" },
              { name: "Fez Smart Locker — Victoria Island", addr: "1004 Estate, V/I, Lagos", price: "₦500 flat fee" },
              { name: "GIG Logistics — Lekki Hub", addr: "Admiralty Way, Lekki Phase 1, Lagos", price: "₦500 savings" },
            ].map((hub, i) => (
              <label key={i} className={`flex items-center gap-3 px-3.5 py-2.5 border rounded-[10px] cursor-pointer transition-all ${address.pickupHub === i ? "border-[#F97316] bg-[#FFF7ED]" : "border-[#E5E7EB] bg-white"}`}>
                <input type="radio" name="pickup" checked={address.pickupHub === i} onChange={() => set("pickupHub", i.toString())} className="accent-[#F97316] shrink-0" />
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-[#111827]">{hub.name}</div>
                  <div className="text-[11px] text-[#6B7280]">📍 {hub.addr}</div>
                </div>
                <span className="text-[11px] font-semibold text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] px-1.5 py-0.5 rounded-[10px]">{hub.price}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2.5">
          <button onClick={onBack} className="bg-white border border-[#E5E7EB] rounded-[10px] px-5 py-3 text-sm font-semibold text-[#374151] hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all cursor-pointer">
            ← Back to cart
          </button>
          <button onClick={handleNext} className="flex-1 bg-[#F97316] text-white rounded-[10px] py-3 text-[15px] font-bold hover:bg-[#EA6C0A] hover:-translate-y-px hover:shadow-[0_4px_18px_rgba(249,115,22,0.3)] transition-all cursor-pointer">
            Continue to payment →
          </button>
        </div>
      </div>
      <div className="order-summary-col">
        <OrderSummary cart={cart} couponCode={coupon} setCouponCode={setCoupon} couponApplied={couponApplied} setCouponApplied={setCouponApplied} />
      </div>
    </div>
  );
}

/* ─── Payment Screen ────────────────────────────────────────────── */
function PaymentScreen({
  payMethod, setPayMethod, cart, coupon, setCoupon, couponApplied, setCouponApplied, onNext, onBack,
}: {
  payMethod: string;
  setPayMethod: (v: string) => void;
  cart: CartItemUI[];
  coupon: string;
  setCoupon: (v: string) => void;
  couponApplied: boolean;
  setCouponApplied: (v: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [cardNum, setCardNum] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [checkout, setCheckout] = useState<{ checkoutId: string; orders: { id: string }[]; total: number } | null>(null);
  const [ussdBank, setUssdBank] = useState("*737#");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fmtCard = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const fmtExp = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };
  const handleNext = () => {
    if (!payMethod) { setErrors({ method: "Please select a payment method" }); return; }
    if (payMethod === "card" && (!cardNum || !cardExp || !cardCvv || !cardName)) { setErrors({ card: "Please fill in all card details" }); return; }
    setErrors({}); onNext();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-start">
      <div className="flex flex-col gap-5 animate-[fadeUp_0.38s_ease_both]">
        <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5">
          <SectionTitle>💳 Choose payment method</SectionTitle>
          {errors.method && <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3.5 py-2.5 text-[13px] text-[#DC2626] mb-3.5">{errors.method}</div>}
          {errors.card && <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3.5 py-2.5 text-[13px] text-[#DC2626] mb-3.5">{errors.card}</div>}
          <div className="flex flex-col gap-2.5">
            {PAY_METHODS.map((method) => (
              <div key={method.id}>
                <div className={`flex items-center gap-3 px-4 py-3.5 border rounded-xl cursor-pointer transition-all bg-white ${payMethod === method.id ? "border-[#F97316] bg-[#FFF7ED]" : "border-[#E5E7EB] hover:border-[#F97316]"}`} onClick={() => setPayMethod(method.id)}>
                  <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-xl shrink-0 transition-all border ${payMethod === method.id ? "bg-[#F97316] border-[#F97316]" : "bg-[#F9FAFB] border-[#E5E7EB]"}`}>{method.icon}</div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-[#111827]">{method.label}</div>
                    <div className="text-xs text-[#6B7280]">{method.sub}</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${payMethod === method.id ? "border-[#F97316] bg-[#F97316]" : "border-[#E5E7EB] bg-white"}`}>
                    {payMethod === method.id && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>
                {payMethod === "card" && method.id === "card" && (
                  <div className="animate-[fadeIn_0.3s_ease_both] border border-t-0 border-[#F97316] rounded-b-xl p-4 bg-[#FFF7ED] flex flex-col gap-3">
                    <div>
                      <Label required>Card number</Label>
                      <input className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-[10px] text-sm text-[#111827] outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] transition-all bg-white placeholder:text-[#9CA3AF]" placeholder="0000 0000 0000 0000" value={cardNum} onChange={(e) => setCardNum(fmtCard(e.target.value))} maxLength={19} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label required>Expiry</Label>
                        <input className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-[10px] text-sm text-[#111827] outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] transition-all bg-white placeholder:text-[#9CA3AF]" placeholder="MM/YY" value={cardExp} onChange={(e) => setCardExp(fmtExp(e.target.value))} maxLength={5} />
                      </div>
                      <div>
                        <Label required>CVV</Label>
                        <input className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-[10px] text-sm text-[#111827] outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] transition-all bg-white placeholder:text-[#9CA3AF]" placeholder="•••" type="password" value={cardCvv} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} maxLength={4} />
                      </div>
                    </div>
                    <div>
                      <Label required>Name on card</Label>
                      <input className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-[10px] text-sm text-[#111827] outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] transition-all bg-white placeholder:text-[#9CA3AF]" placeholder="EMEKA OKAFOR" value={cardName} onChange={(e) => setCardName(e.target.value.toUpperCase())} />
                    </div>
                    <div className="flex gap-1.5 items-center text-[11px] text-[#6B7280]">🔒 Processed securely by Paystack. We never store your card details.</div>
                  </div>
                )}
                {payMethod === "ussd" && method.id === "ussd" && (
                  <div className="animate-[fadeIn_0.3s_ease_both] border border-t-0 border-[#F97316] rounded-b-xl p-4 bg-[#FFF7ED]">
                    <Label>Select your bank USSD code</Label>
                    <select className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-[10px] text-sm text-[#111827] outline-none bg-white appearance-none cursor-pointer pr-8 bg-no-repeat bg-[position:right_12px_center]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2714%27 height=%2714%27 viewBox=%270 0 24 24%27%3E%3Cpath fill=%27%236B7280%27 d=%27M7 10l5 5 5-5z%27/%3E%3C/svg%3E')" }} value={ussdBank} onChange={(e) => setUssdBank(e.target.value)}>
                      {[{ v: "*737#", l: "GTBank *737#" }, { v: "*966#", l: "Zenith Bank *966#" }, { v: "*770#", l: "First Bank *770#" }, { v: "*901#", l: "Access Bank *901#" }, { v: "*919#", l: "UBA *919#" }, { v: "*822#", l: "Sterling Bank *822#" }].map((b) => <option key={b.v} value={b.v}>{b.l}</option>)}
                    </select>
                    <div className="mt-2.5 bg-white rounded-lg px-3 py-2.5 text-xs text-[#374151] leading-relaxed">After clicking "Place order", dial <strong>{ussdBank}</strong> on your registered number and follow the prompts.</div>
                  </div>
                )}
                {payMethod === "transfer" && method.id === "transfer" && (
                  <div className="animate-[fadeIn_0.3s_ease_both] border border-t-0 border-[#F97316] rounded-b-xl p-4 bg-[#FFF7ED]">
                    <div className="text-[13px] text-[#374151] leading-relaxed">After placing your order, a unique account number will be generated. Transfer the exact amount within <strong>30 minutes</strong> to secure your order.</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2.5">
          <button onClick={onBack} className="bg-white border border-[#E5E7EB] rounded-[10px] px-5 py-3 text-sm font-semibold text-[#374151] hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all cursor-pointer">
            ← Back
          </button>
          <button onClick={handleNext} className="flex-1 bg-[#F97316] text-white rounded-[10px] py-3 text-[15px] font-bold hover:bg-[#EA6C0A] hover:-translate-y-px hover:shadow-[0_4px_18px_rgba(249,115,22,0.3)] transition-all cursor-pointer">
            Review order →
          </button>
        </div>
      </div>
      <div className="order-summary-col">
        <OrderSummary cart={cart} couponCode={coupon} setCouponCode={setCoupon} couponApplied={couponApplied} setCouponApplied={setCouponApplied} />
      </div>
    </div>
  );
}

/* ─── Review Screen ─────────────────────────────────────────────── */
function ReviewScreen({
  cart, address, payMethod, couponApplied, couponCode, onPricesChanged, onNext, onBack,
}: {
  cart: CartItemUI[];
  address: Record<string, string | number>;
  payMethod: string;
  couponApplied: boolean;
  couponCode: string;
  onPricesChanged: () => void;
  onNext: (c: CheckoutPayload) => void;
  onBack: () => void;
}) {
  const [placing, setPlacing] = useState(false);
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = cart.reduce((s, i) => s + i.shipping, 0);
  const discount = couponApplied ? Math.round(subtotal * 0.05) : 0;
  const total = subtotal + shipping - discount;
  const [error, setError] = useState<string | null>(null);
  const payIcons: Record<string, string> = { card: "💳", transfer: "🏦", ussd: "📲", opay: "🟢", palmpay: "🟣", bnpl: "📅" };
  const payLabels: Record<string, string> = { card: "Debit card", transfer: "Bank transfer", ussd: "USSD", opay: "OPay wallet", palmpay: "PalmPay", bnpl: "Buy now pay later" };

  const handlePlace = async () => {
    setPlacing(true);
    setError(null);
    try {
      const res = await fetch("/api/buyer/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          payMethod,
          couponCode: couponApplied ? couponCode : undefined,
          expectedTotal: total,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Could not place your order. Please try again.");
        if (res.status === 409) onPricesChanged();
        return;
      }

      const payload: CheckoutPayload = {
        checkoutId: json.data.checkoutId,
        orders: json.data.orders,
        total: json.data.total ?? total,
        subtotal,
        shipping,
        discount,
      };
      onNext(payload);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="animate-[fadeUp_0.38s_ease_both]">
      <h2 className="text-xl font-extrabold text-[#111827] mb-5">Review your order</h2>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-start">
        <div className="flex flex-col gap-3.5">
          <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5">
            <SectionTitle>📦 Items ({cart.length})</SectionTitle>
            {cart.map((item) => (
              <div key={item.id} className="flex gap-3 py-2.5 border-b border-[#E5E7EB] last:border-b-0">
                <div className="w-12 h-12 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg flex items-center justify-center text-2xl shrink-0">{item.img}</div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-[#111827]">{item.title}</div>
                  <div className="text-xs text-[#6B7280]">Qty: {item.qty} · {COURIERS[item.courierId]?.name || "GIG Logistics"}</div>
                </div>
                <div className="text-sm font-bold text-[#111827]">₦{(item.price * item.qty).toLocaleString()}</div>
              </div>
            ))}
          </div>
          <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5">
            <div className="flex justify-between items-center mb-2.5">
              <SectionTitle>📍 Delivery address</SectionTitle>
              <button onClick={onBack} className="bg-transparent border-none text-xs text-[#F97316] font-semibold cursor-pointer">Edit</button>
            </div>
            <div className="text-sm text-[#374151] leading-7">
              <strong>{address.firstName} {address.lastName}</strong><br />
              {address.address}, {address.lga}<br />
              {address.state}, Nigeria<br />
              📞 +234 {address.phone}
            </div>
          </div>
          <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5">
            <SectionTitle>💳 Payment method</SectionTitle>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{payIcons[payMethod]}</span>
              <span className="text-sm font-semibold text-[#111827]">{payLabels[payMethod]}</span>
            </div>
          </div>
          <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5">
            <SectionTitle>💰 Payment breakdown</SectionTitle>
            {[
              { l: "Subtotal", v: `₦${subtotal.toLocaleString()}` },
              { l: "Shipping", v: `₦${shipping.toLocaleString()}` },
              { l: "Discount", v: discount > 0 ? `−₦${discount.toLocaleString()}` : "—", c: discount > 0 ? C.green : C.textLight },
            ].map((r) => (
              <div key={r.l} className="flex justify-between text-[13px] text-[#6B7280] mb-2">
                <span>{r.l}</span>
                <span className="font-medium" style={{ color: r.c || C.textMid }}>{r.v}</span>
              </div>
            ))}
            <div className="flex justify-between text-lg font-extrabold text-[#111827] pt-2.5 border-t border-[#E5E7EB]">
              <span>Total charged</span>
              <span className="text-[#F97316]">₦{total.toLocaleString()}</span>
            </div>
          </div>
          <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[14px] p-4 flex gap-3 items-start">
            <span className="text-2xl shrink-0">🛡️</span>
            <div>
              <div className="text-[13px] font-bold text-[#166534] mb-1">Your payment is 100% protected</div>
              <div className="text-xs text-[#166534] leading-relaxed">₦{total.toLocaleString()} goes into <strong>Shopdroply Escrow</strong> — not the seller. Released only after you confirm receipt.</div>
            </div>
          </div>
          <button onClick={handlePlace} disabled={placing} className="w-full bg-[#F97316] text-white rounded-[10px] py-4 text-base font-bold hover:bg-[#EA6C0A] hover:-translate-y-px hover:shadow-[0_4px_18px_rgba(249,115,22,0.3)] transition-all cursor-pointer disabled:bg-[#D1D5DB] disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
            {placing ? "🔒 Securing payment..." : `🔒 Place order — ₦${total.toLocaleString()}`}
          </button>
          <div className="text-center text-xs text-[#6B7280]">By placing this order you agree to our <span className="text-[#F97316] cursor-pointer">Terms</span> and <span className="text-[#F97316] cursor-pointer">Escrow Agreement</span></div>
        </div>
        <div className="order-summary-col">
          <OrderSummary cart={cart} couponCode="" setCouponCode={() => { }} couponApplied={couponApplied} setCouponApplied={() => { }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Confirmed Screen ──────────────────────────────────────────── */
function ConfirmedScreen({ checkout }: { checkout: CheckoutPayload | null }) {
  if (!checkout) return null;
  const total = checkout.total;
  const orderId = checkout.orders.map((o) => o.id).join(", ");

  return (
    <div className="max-w-[560px] mx-auto text-center py-8 px-4 animate-[scaleIn_0.35s_ease_both]">
      <div className="w-20 h-20 rounded-full bg-[#F0FDF4] border-[3px] border-[#BBF7D0] flex items-center justify-center mx-auto mb-5 text-4xl animate-[checkPop_0.5s_ease_both]">✅</div>
      <h1 className="text-[26px] font-extrabold text-[#111827] tracking-tight mb-2">Order placed successfully!</h1>
      <p className="text-sm text-[#6B7280] leading-7 mb-6">Your payment of <strong className="text-[#F97316]">₦{total.toLocaleString()}</strong> is held in Shopdroply Escrow. You'll receive SMS and email updates.</p>
      <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5 mb-5 text-left">
        <div className="text-xs text-[#6B7280] mb-1">Order ID</div>
        <div className="text-lg font-extrabold text-[#111827] tracking-wide">{orderId}</div>
        <div className="text-xs text-[#6B7280] mt-2.5">A confirmation has been sent to your email and phone number.</div>
      </div>
      <div className="flex flex-col gap-2.5 mb-6">
        {[
          { icon: "🛡️", t: "Payment secured in escrow", done: true },
          { icon: "📦", t: "Seller is packing your order", done: false },
          { icon: "🚚", t: "GIG Logistics will pick up soon", done: false },
          { icon: "🏠", t: "Delivery to your address", done: false },
        ].map((s) => (
          <div key={s.t} className={`flex gap-3 items-center px-3.5 py-2.5 rounded-[10px] ${s.done ? "bg-[#F0FDF4] border border-[#BBF7D0]" : "bg-white border border-[#E5E7EB]"}`}>
            <span className="text-xl">{s.icon}</span>
            <span className={`text-[13px] ${s.done ? "font-bold text-[#16A34A]" : "font-medium text-[#374151]"}`}>{s.t}</span>
            {s.done && <span className="ml-auto text-xs font-bold text-[#16A34A]">✓ Done</span>}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2.5">
        <Link href="/buyer/orders" className="w-full bg-[#F97316] text-white rounded-[10px] py-3.5 text-[15px] font-bold hover:bg-[#EA6C0A] transition-colors no-underline inline-flex items-center justify-center">
          📦 Track my order
        </Link>
        <Link href="/search" className="w-full bg-white border border-[#E5E7EB] text-[#374151] rounded-[10px] py-3 text-sm font-semibold hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all no-underline inline-flex items-center justify-center">
          🛍️ Continue shopping
        </Link>
      </div>
    </div>
  );
}

/* ─── Navbar ────────────────────────────────────────────────────── */
function Navbar({ step }: { step: number }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-[0_1px_0_#E5E7EB] h-[58px] flex items-center px-4 gap-3">
      <div className="text-lg font-extrabold text-[#111827] cursor-pointer shrink-0">shop<span className="text-[#F97316]">droply</span></div>
      <div className="flex-1 flex justify-center">
        <div className="text-[13px] font-semibold text-[#6B7280]">{["", "Cart", "Delivery address", "Payment", "Review order", "Order placed"][step]}</div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-[#16A34A] font-semibold">🔒 Secure checkout</div>
    </nav>
  );
}

/* ─── Main Export ───────────────────────────────────────────────── */
export default function CartCheckoutFlow() {
  const [step, setStep] = useState(1);
  const [checkout, setCheckout] = useState<CheckoutPayload | null>(null);
  const [cart, setCart] = useState<CartItemUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState<Record<string, string | number>>({ firstName: "Emeka", lastName: "Okafor", phone: "803 456 7890", state: "Lagos", lga: "Ikeja", address: "14 Allen Avenue, beside First Bank" });
  const [payMethod, setPayMethod] = useState("card");
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const res = await fetch("/api/buyer/cart");
      const json = await res.json();
      if (json.success) {
        setCart(json.data.map((item: any) => ({
          id: item.id,
          listingId: item.listingId,
          title: item.title,
          img: item.image || "📦",
          price: item.price,
          qty: item.qty,
          seller: item.seller,
          shipping: item.shipping ?? 0,
          courierId: 0,
          condition: item.condition || "New",
        })));
      }
    } catch (err) {
      console.error("Failed to load cart", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQty = async (id: string, delta: number) => {
    const item = cart.find((i) => i.id === id);
    if (!item) return;
    const newQty = Math.max(1, item.qty + delta);

    setCart((prev) => prev.map((i) => i.id === id ? { ...i, qty: newQty } : i));

    try {
      await fetch("/api/buyer/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: id, qty: newQty }),
      });
    } catch {
      setCart((prev) => prev.map((i) => i.id === id ? { ...i, qty: item.qty } : i));
    }
  };

  const handleRemove = async (id: string) => {
    const prevCart = cart;
    setCart((prev) => prev.filter((i) => i.id !== id));
    try {
      await fetch(`/api/buyer/cart?id=${id}`, { method: "DELETE" });
    } catch {
      setCart(prevCart);
    }
  };

  const handleCourierChange = (id: string, courierId: number, shipping: number) => {
    setCart((prev) => prev.map((i) => i.id === id ? { ...i, courierId, shipping } : i));
  };

  if (loading) {
    return (
      <>
        <Navbar step={step} />
        <div className="pt-[72px] pb-20 min-h-screen bg-[#F9FAFB] flex items-center justify-center">
          <div className="text-[#6B7280] text-sm font-medium animate-pulse">Loading your cart...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar step={step} />
      <div className="pt-[72px] pb-20 min-h-screen bg-[#F9FAFB]">
        <div className="max-w-[1080px] mx-auto px-4 py-6">
          <Stepper step={step} />
          {step === 1 && <CartScreen cart={cart} onUpdateQty={handleUpdateQty} onRemove={handleRemove} onCourierChange={handleCourierChange} onNext={() => setStep(2)} />}
          {step === 2 && <AddressScreen cart={cart} address={address} setAddress={setAddress} coupon={coupon} setCoupon={setCoupon} couponApplied={couponApplied} setCouponApplied={setCouponApplied} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
          {step === 3 && <PaymentScreen cart={cart} payMethod={payMethod} setPayMethod={setPayMethod} coupon={coupon} setCoupon={setCoupon} couponApplied={couponApplied} setCouponApplied={setCouponApplied} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
          {step === 4 && <ReviewScreen cart={cart} address={address} payMethod={payMethod} couponApplied={couponApplied} couponCode={coupon} onPricesChanged={fetchCart} onNext={(c) => { setCheckout(c); setStep(5); }} onBack={() => setStep(3)} />}
          {step === 5 && <ConfirmedScreen checkout={checkout} />}
        </div>
      </div>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#111827] rounded-[30px] px-2 py-1.5 flex gap-1 z-[999] shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
        {["Cart", "Address", "Payment", "Review", "✅ Done"].map((l, i) => (
          <button key={l} onClick={() => setStep(i + 1)} className={`px-3.5 py-1.5 rounded-full border-none font-bold text-xs cursor-pointer transition-all ${step === i + 1 ? "bg-[#F97316] text-white" : "bg-transparent text-[#9CA3AF]"}`}>
            {l}
          </button>
        ))}
      </div>
    </>
  );
}