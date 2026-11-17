"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface SellerAccountProfile {
  id: string; name: string; email: string; phone?: string; sellerStatus?: string;
}

interface OrderItem {
  id: string; listingId: string; title: string; image: string;
  price: number; qty: number; seller: string; sellerId: string;
  shipping: number; courier: string; condition: string;
}

interface Order {
  id: string; buyerId: string; buyerName?: string; items: OrderItem[];
  status: string; total: number; subtotal: number; shipping: number;
  address: Record<string, string | number>; payMethod: string; courier: string; eta: string;
  createdAt: string; trackingNumber?: string;
}

const COURIERS = [
  { id: "GIG", name: "GIG Logistics", logo: "🚛", eta: "1–3 days", price: 2500 },
  { id: "FEZ", name: "Fez Delivery", logo: "📦", eta: "2–4 days", price: 2200 },
  { id: "KWK", name: "Kwik Delivery", logo: "⚡", eta: "Same day", price: 3500 },
  { id: "DHL", name: "DHL Nigeria", logo: "✈️", eta: "1–2 days", price: 5500 },
];

const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;
const inputCls = "w-full px-3.5 py-2.5 border-[1.5px] border-[#E5E7EB] rounded-[10px] text-sm outline-none focus:border-[#F97316] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.1)] bg-white";
const fmtAddress = (a: Record<string, string | number>) => {
  const parts = Object.values(a || {}).filter((v) => v !== a.phone && Boolean(v));
  return parts.length ? parts.join(", ") : "—";
};

export default function ShipOrderPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [seller, setSeller] = useState<SellerAccountProfile | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [selectedCourier, setSelectedCourier] = useState(COURIERS[0]);
  const [weight, setWeight] = useState("1");
  const [dims, setDims] = useState({ l: "30", w: "20", h: "10" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [shipped, setShipped] = useState<{ tracking: string; courier: string; eta: string } | null>(null);

  useEffect(() => { if (id) loadData(); }, [id]);

  const loadData = async () => {
    try {
      const [profileRes, orderRes] = await Promise.all([
        fetch("/api/seller/me"),
        fetch(`/api/seller/orders/${id}`),
      ]);
      const profileData = await profileRes.json();
      const orderData = await orderRes.json();
      if (!profileData.success || !profileData.data) {
        router.push("/seller/onboarding");
        return;
      }
      if (!orderData.success || !orderData.data) {
        router.push("/seller/orders");
        return;
      }
      setSeller(profileData.data);
      setOrder(orderData.data);
    } catch {
      router.push("/seller/orders");
    } finally {
      setLoading(false);
    }
  };

  const confirmShipment = async () => {
    if (!order) return;
    setSubmitting(true);
    const tracking = `${selectedCourier.id}-${Math.floor(1000000 + Math.random() * 9000000)}`;
    try {
      const res = await fetch("/api/seller/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          status: "shipped",
          trackingNumber: tracking,
          courier: selectedCourier.name,
          eta: selectedCourier.eta,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShipped({ tracking, courier: selectedCourier.name, eta: selectedCourier.eta });
        setStep(3);
      } else {
        setErrors({ submit: data.error || "Failed to confirm shipment" });
      }
    } catch {
      setErrors({ submit: "Failed to confirm shipment" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center text-[#6B7280]">
          <div className="text-3xl mb-2 animate-pulse">🚚</div>
          <div className="text-sm font-semibold">Loading order…</div>
        </div>
      </div>
    );
  }

  // ── Success screen ──
  if (step === 3 && shipped) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4">
        <div className="text-center max-w-[520px] w-full py-12">
          <div className="w-[100px] h-[100px] rounded-full bg-[#F0FDF4] border-[3px] border-[#16A34A] flex items-center justify-center mx-auto mb-6">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="text-2xl font-extrabold text-[#111827] mb-2">Order shipped! 🚚</div>
          <div className="text-sm text-[#6B7280] leading-relaxed mb-8">
            {order.id} has been marked as shipped. The buyer can now track delivery.
          </div>
          <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-6 text-left mb-6">
            <div className="text-[13px] font-bold text-[#111827] mb-3.5">Shipping details</div>
            <div className="flex flex-col gap-2.5 text-[13px]">
              <div className="flex justify-between"><span className="text-[#6B7280]">Courier</span><span className="text-[#111827] font-semibold">{shipped.courier}</span></div>
              <div className="flex justify-between"><span className="text-[#6B7280]">Tracking number</span><span className="text-[#2563EB] font-extrabold">{shipped.tracking}</span></div>
              <div className="flex justify-between"><span className="text-[#6B7280]">Estimated delivery</span><span className="text-[#111827] font-semibold">{shipped.eta}</span></div>
            </div>
          </div>
          <div className="flex gap-2.5 justify-center flex-wrap">
            <Link href="/seller/orders"
              className="px-7 py-3 text-sm font-bold text-white bg-[#F97316] rounded-[10px] hover:bg-[#EA6C0A] transition-all no-underline">
              📋 Back to orders
            </Link>
            <Link href={`/seller/orders/${order.id}`}
              className="px-6 py-3 text-sm font-semibold text-[#374151] border-[1.5px] border-[#E5E7EB] rounded-[10px] hover:border-[#F97316] hover:text-[#F97316] bg-white transition-all no-underline">
              View order
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const ownItems = seller?.id ? order.items.filter((i) => i.sellerId === seller.id) : order.items;
  const first = ownItems[0];

  const nextStep = () => {
    const e: Record<string, string> = {};
    if (!weight.trim()) e.weight = "Enter package weight";
    if (!dims.l.trim() || !dims.w.trim() || !dims.h.trim()) e.dims = "Enter all dimensions";
    setErrors(e);
    if (Object.keys(e).length === 0) setStep(2);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] h-16 flex items-center gap-3 px-4 lg:px-6">
        <Link href={`/seller/orders/${order.id}`}
          className="px-3.5 py-2 text-[13px] font-semibold text-[#374151] border-[1.5px] border-[#E5E7EB] rounded-[10px] hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all no-underline">
          ← Back to order
        </Link>
        <h1 className="text-lg font-extrabold text-[#111827]">Ship order {order.id}</h1>
      </header>

      <div className="p-4 lg:p-6 max-w-[900px] mx-auto">
        {/* Progress */}
        <div className="flex items-center justify-center mb-7 flex-wrap">
          {["Package", "Label", "Shipped"].map((label, i) => (
            <div key={label} className="flex items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold border-2"
                style={{
                  background: i < step ? "#16A34A" : i === step ? "#F97316" : "#fff",
                  color: i <= step ? "#fff" : "#9CA3AF",
                  borderColor: i < step ? "#16A34A" : i === step ? "#F97316" : "#E5E7EB",
                }}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className="mx-2 text-xs font-semibold"
                style={{ color: i === step ? "#F97316" : i < step ? "#111827" : "#9CA3AF" }}>
                {label}
              </span>
              {i < 2 && <div className="w-10 h-0.5 mx-2" style={{ background: i < step ? "#16A34A" : "#E5E7EB" }} />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
          <div className="min-w-0">
            {/* Order summary */}
            <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-5 mb-5">
              <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-3">Order summary</div>
              <div className="flex gap-3 items-center">
                <div className="w-14 h-14 rounded-[10px] bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                  {first?.image ? <img src={first.image} alt="" className="w-full h-full object-cover" /> : "📦"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[#111827] truncate">
                    {first?.title}{ownItems.length > 1 ? ` +${ownItems.length - 1} more` : ""}
                  </div>
                  <div className="text-[13px] font-extrabold text-[#F97316]">{naira(order.subtotal)}</div>
                </div>
              </div>
            </div>

            {step === 1 && (
              <div>
                {/* Couriers */}
                <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-5 mb-5">
                  <div className="text-[15px] font-bold text-[#111827] mb-3.5">Select courier</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {COURIERS.map((c) => (
                      <div key={c.id} onClick={() => setSelectedCourier(c)}
                        className="border-2 rounded-[12px] p-4 cursor-pointer transition-all"
                        style={{
                          borderColor: selectedCourier.id === c.id ? "#F97316" : "#E5E7EB",
                          background: selectedCourier.id === c.id ? "#FFF7ED" : "#fff",
                        }}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{c.logo}</span>
                            <div>
                              <div className="text-[13px] font-bold text-[#111827]">{c.name}</div>
                              <div className="text-[11px] text-[#6B7280]">{c.eta}</div>
                            </div>
                          </div>
                          <div className="text-sm font-extrabold text-[#F97316]">{naira(c.price)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Package details */}
                <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-5 mb-5">
                  <div className="text-[15px] font-bold text-[#111827] mb-3.5">Package details</div>
                  <div className="mb-4">
                    <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Weight (kg) *</label>
                    <input className={inputCls} style={errors.weight ? { borderColor: "#DC2626" } : undefined}
                      value={weight} onChange={(e) => { setWeight(e.target.value); setErrors((p) => ({ ...p, weight: "" })); }}
                      placeholder="e.g. 1.5" />
                    {errors.weight && <div className="text-xs text-[#DC2626] mt-1">⚠️ {errors.weight}</div>}
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Dimensions (cm) *</label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {(["l", "w", "h"] as const).map((k) => (
                        <input key={k} className={inputCls} style={errors.dims ? { borderColor: "#DC2626" } : undefined}
                          value={dims[k]} placeholder={k === "l" ? "Length" : k === "w" ? "Width" : "Height"}
                          onChange={(e) => { setDims((p) => ({ ...p, [k]: e.target.value })); setErrors((p) => ({ ...p, dims: "" })); }} />
                      ))}
                    </div>
                    {errors.dims && <div className="text-xs text-[#DC2626] mt-1">⚠️ {errors.dims}</div>}
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <Link href={`/seller/orders/${order.id}`}
                    className="flex-1 py-3 text-sm font-semibold text-center text-[#374151] border-[1.5px] border-[#E5E7EB] rounded-[10px] hover:border-[#F97316] hover:text-[#F97316] bg-white transition-all no-underline">
                    Cancel
                  </Link>
                  <button onClick={nextStep}
                    className="flex-[2] py-3 text-sm font-bold text-white bg-[#F97316] rounded-[10px] hover:bg-[#EA6C0A] transition-all cursor-pointer border-none">
                    Next: Print label →
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                {/* Label preview */}
                <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-5 mb-4">
                  <div className="flex justify-between items-center mb-3.5">
                    <div className="text-[15px] font-bold text-[#111827]">Shipping label</div>
                    <button onClick={() => window.print()}
                      className="px-3.5 py-1.5 text-xs font-semibold text-[#374151] border-[1.5px] border-[#E5E7EB] rounded-lg hover:border-[#F97316] hover:text-[#F97316] bg-white cursor-pointer">
                      🖨 Print
                    </button>
                  </div>
                  <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-lg p-5 font-mono text-xs leading-relaxed">
                    <div className="text-center border-b-2 border-dashed border-[#E5E7EB] pb-3 mb-3">
                      <div className="text-base font-extrabold">SHOPDROPLY</div>
                      <div className="text-[10px] text-[#6B7280]">Shipping Label — {order.id}</div>
                    </div>
                    <div className="mb-3">
                      <div className="text-[10px] text-[#6B7280]">FROM:</div>
                      <div className="font-bold">{seller?.name || "Seller"}</div>
                      <div>{seller?.phone || ""}</div>
                    </div>
                    <div className="mb-3 border-t border-[#E5E7EB] pt-3">
                      <div className="text-[10px] text-[#6B7280]">TO:</div>
                      <div className="font-bold">{order.buyerName || "Buyer"}</div>
                      <div>{fmtAddress(order.address)}</div>
                      <div>{order.address?.phone || ""}</div>
                    </div>
                    <div className="border-t-2 border-dashed border-[#E5E7EB] pt-3 flex justify-between">
                      <div>
                        <div className="text-[10px] text-[#6B7280]">COURIER</div>
                        <div className="font-bold">{selectedCourier.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-[#6B7280]">WEIGHT</div>
                        <div className="font-bold">{weight} kg</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-[10px] px-3.5 py-3 mb-4">
                  <div className="text-xs text-[#D97706] leading-relaxed">
                    <strong>📦 Important:</strong> Attach this label securely to your package before dropping it off at the nearest {selectedCourier.name} centre.
                  </div>
                </div>

                {errors.submit && (
                  <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] px-3.5 py-3 mb-4 text-xs text-[#DC2626] font-semibold">
                    ⚠️ {errors.submit}
                  </div>
                )}

                <div className="flex gap-2.5">
                  <button onClick={() => setStep(1)}
                    className="flex-1 py-3 text-sm font-semibold text-[#374151] border-[1.5px] border-[#E5E7EB] rounded-[10px] hover:border-[#F97316] hover:text-[#F97316] bg-white cursor-pointer">
                    ← Back
                  </button>
                  <button onClick={confirmShipment} disabled={submitting}
                    className="flex-[2] py-3 text-sm font-bold text-white bg-[#16A34A] rounded-[10px] hover:bg-[#15803D] transition-all cursor-pointer border-none disabled:opacity-50">
                    {submitting ? "Confirming…" : "✅ Confirm shipment"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right column — delivery info */}
          <div className="flex flex-col gap-4">
            <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-5">
              <div className="text-sm font-bold text-[#111827] mb-3">Delivery address</div>
              <div className="text-[13px] text-[#111827] leading-relaxed mb-2">
                <strong>{order.buyerName || "Buyer"}</strong><br />
                {fmtAddress(order.address)}
              </div>
              <div className="text-xs text-[#6B7280]">{order.address?.phone || ""}</div>
            </div>

            <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-5">
              <div className="text-sm font-bold text-[#111827] mb-3">Shipping summary</div>
              <div className="flex flex-col gap-2.5 text-[13px]">
                <div className="flex justify-between"><span className="text-[#6B7280]">Courier</span><span className="text-[#111827] font-semibold">{selectedCourier.name}</span></div>
                <div className="flex justify-between"><span className="text-[#6B7280]">Delivery time</span><span className="text-[#111827] font-semibold">{selectedCourier.eta}</span></div>
                <div className="flex justify-between"><span className="text-[#6B7280]">Package weight</span><span className="text-[#111827] font-semibold">{weight || "—"} kg</span></div>
                <div className="flex justify-between text-sm font-extrabold text-[#111827] border-t border-[#E5E7EB] pt-2.5">
                  <span>Courier fee</span>
                  <span>{naira(selectedCourier.price)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
