"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import SellerSidebar from "@/components/seller/Sidebar";

interface SellerAccountProfile {
  id: string; name: string; email: string; sellerStatus?: string;
}

interface OrderItem {
  id: string; listingId: string; title: string; image: string;
  price: number; qty: number; seller: string; sellerId: string;
  shipping: number; courier: string; condition: string;
}

interface Order {
  id: string; buyerId: string; buyerName?: string; items: OrderItem[];
  status: string; total: number; subtotal: number; shipping: number; discount: number;
  address: Record<string, string | number>; payMethod: string; courier: string; eta: string;
  createdAt: string; updatedAt: string; trackingNumber?: string;
}

const STATUS_MAP: Record<string, string> = {
  pending: "pending", Processing: "pending",
  shipped: "shipped", "In transit": "shipped",
  delivered: "delivered", Delivered: "delivered", "Confirm receipt": "delivered",
  dispute: "dispute", cancelled: "cancelled", Cancelled: "cancelled",
};
const normStatus = (s: string) => STATUS_MAP[s] || "pending";

const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;
const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—";
const fmtAddress = (a: Record<string, string | number>) => {
  const parts = Object.values(a || {}).filter(Boolean);
  return parts.length ? parts.join(", ") : "No address on file";
};

const BANNERS: Record<string, { bg: string; border: string; icon: string; title: string; sub: string; titleColor: string }> = {
  pending:   { bg: "#FFFBEB", border: "#FDE68A", icon: "⏳", title: "Awaiting shipment", sub: "Ship this order soon to maintain your seller rating.", titleColor: "#D97706" },
  shipped:   { bg: "#EFF6FF", border: "#BFDBFE", icon: "🚚", title: "In transit", sub: "The buyer has been notified with tracking details.", titleColor: "#2563EB" },
  delivered: { bg: "#F0FDF4", border: "#BBF7D0", icon: "✅", title: "Delivered", sub: "Escrow will be released after buyer confirmation.", titleColor: "#16A34A" },
  dispute:   { bg: "#FEF2F2", border: "#FECACA", icon: "⚠️", title: "Dispute open", sub: "Work with the buyer to resolve this order.", titleColor: "#DC2626" },
  cancelled: { bg: "#F9FAFB", border: "#E5E7EB", icon: "❌", title: "Order cancelled", sub: "The buyer was refunded.", titleColor: "#6B7280" },
};

export default function SellerOrderDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [seller, setSeller] = useState<SellerAccountProfile | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => { if (id) loadData(); }, [id]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

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
      setToast({ msg: "❌ Failed to load order", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!order) return;
    setBusy(true);
    try {
      const res = await fetch("/api/seller/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, status }),
      });
      const data = await res.json();
      if (data.success) {
        setOrder((prev) => (prev ? { ...prev, status } : prev));
        setShowCancel(false);
        setToast({ msg: "✅ Order updated", type: "success" });
      } else {
        setToast({ msg: `❌ ${data.error || "Update failed"}`, type: "error" });
      }
    } catch {
      setToast({ msg: "❌ Failed to update order", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center text-[#6B7280]">
          <div className="text-3xl mb-2 animate-pulse">🛒</div>
          <div className="text-sm font-semibold">Loading order…</div>
        </div>
      </div>
    );
  }

  const st = normStatus(order.status);
  const banner = BANNERS[st];
  const ownItems = seller?.id ? order.items.filter((i) => i.sellerId === seller.id) : order.items;
  const subtotal = ownItems.reduce((a, i) => a + i.price * (i.qty || 1), 0);
  const shipping = ownItems.reduce((a, i) => a + (i.shipping || 0), 0);
  const total = subtotal + shipping;

  // Timeline derived from the real order state
  const done1 = true;
  const done2 = true; // orders only exist after payment in this platform
  const timeline = [
    { label: "Order placed", time: fmtDate(order.createdAt), done: done1 },
    { label: "Payment confirmed", time: fmtDate(order.createdAt), done: done2 },
    { label: "Awaiting shipment", time: st === "pending" ? "Current step" : "Completed", done: st !== "pending", current: st === "pending" },
    { label: "Shipped", time: st === "shipped" || st === "delivered" ? fmtDate(order.updatedAt) : "—", done: st === "shipped" || st === "delivered", current: st === "shipped" },
    { label: "Delivered", time: st === "delivered" ? fmtDate(order.updatedAt) : "—", done: st === "delivered" },
    { label: "Escrow released", time: st === "delivered" ? "Pending buyer confirmation" : "—", done: false },
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 rounded-[10px] text-sm font-semibold shadow-lg border"
          style={{
            background: toast.type === "success" ? "#F0FDF4" : "#FEF2F2",
            borderColor: toast.type === "success" ? "#BBF7D0" : "#FECACA",
            color: toast.type === "success" ? "#16A34A" : "#DC2626",
          }}>
          {toast.msg}
        </div>
      )}

      {showCancel && (
        <div className="fixed inset-0 bg-black/50 z-[500] flex items-center justify-center p-4" onClick={() => setShowCancel(false)}>
          <div className="bg-white rounded-[20px] p-7 max-w-[420px] w-full" onClick={(e) => e.stopPropagation()}>
            <div className="text-4xl text-center mb-3">⚠️</div>
            <div className="text-lg font-extrabold text-[#111827] text-center mb-2">Cancel this order?</div>
            <div className="text-sm text-[#6B7280] text-center mb-5 leading-relaxed">
              The buyer will be notified and refunded. This cannot be undone.
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setShowCancel(false)} disabled={busy}
                className="flex-1 py-3 text-sm font-semibold text-[#374151] border-[1.5px] border-[#E5E7EB] rounded-[10px] hover:border-[#F97316] hover:text-[#F97316] bg-white cursor-pointer disabled:opacity-50">
                Keep order
              </button>
              <button onClick={() => updateStatus("Cancelled")} disabled={busy}
                className="flex-1 py-3 text-sm font-bold text-white bg-[#DC2626] rounded-[10px] hover:bg-[#B91C1C] cursor-pointer border-none disabled:opacity-50">
                {busy ? "Cancelling…" : "Yes, cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      <SellerSidebar activeTab="orders" seller={seller} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="lg:pl-[260px] min-h-screen">
        <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] h-16 flex items-center gap-3 px-4 lg:px-6">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden bg-transparent border-none text-xl cursor-pointer p-1">☰</button>
          <Link href="/seller/orders"
            className="px-3.5 py-2 text-[13px] font-semibold text-[#374151] border-[1.5px] border-[#E5E7EB] rounded-[10px] hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all no-underline">
            ← Back to orders
          </Link>
          <h1 className="text-lg font-extrabold text-[#111827] flex-1">Order {order.id}</h1>
          {st === "pending" && (
            <button onClick={() => setShowCancel(true)} disabled={busy}
              className="px-4 py-2 text-[13px] font-semibold text-[#DC2626] bg-[#FEF2F2] border-[1.5px] border-[#FECACA] rounded-[10px] hover:bg-[#DC2626] hover:text-white transition-all cursor-pointer disabled:opacity-50">
              Cancel order
            </button>
          )}
        </header>

        <div className="p-4 lg:p-6 max-w-[1100px]">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
            <div className="flex flex-col gap-5 min-w-0">
              {/* Status banner */}
              <div className="border-[1.5px] rounded-[12px] px-4 py-3.5 flex gap-3 items-center flex-wrap"
                style={{ background: banner.bg, borderColor: banner.border }}>
                <span className="text-2xl">{banner.icon}</span>
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm font-bold" style={{ color: banner.titleColor }}>{banner.title}</div>
                  <div className="text-xs text-[#6B7280]">{banner.sub}</div>
                </div>
                {st === "pending" && (
                  <Link href={`/seller/orders/${order.id}/ship`}
                    className="px-5 py-2.5 text-[13px] font-bold text-white bg-[#F97316] rounded-[10px] hover:bg-[#EA6C0A] transition-all no-underline shrink-0">
                    🚚 Ship now
                  </Link>
                )}
                {st === "shipped" && (
                  <button onClick={() => updateStatus("Delivered")} disabled={busy}
                    className="px-5 py-2.5 text-[13px] font-bold text-white bg-[#16A34A] rounded-[10px] hover:bg-[#15803D] transition-all cursor-pointer border-none shrink-0 disabled:opacity-50">
                    {busy ? "Updating…" : "✅ Mark delivered"}
                  </button>
                )}
              </div>

              {/* Items */}
              <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-5">
                <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-3.5">Items ordered</div>
                <div className="flex flex-col gap-3.5">
                  {ownItems.map((item) => (
                    <div key={item.id} className="flex gap-3.5 items-center">
                      <div className="w-[72px] h-[72px] rounded-[12px] bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] flex items-center justify-center text-3xl shrink-0 overflow-hidden">
                        {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : "📦"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-bold text-[#111827] mb-1 truncate">{item.title}</div>
                        <div className="flex flex-wrap gap-2.5 items-center">
                          <span className="text-lg font-extrabold text-[#111827]">{naira(item.price * (item.qty || 1))}</span>
                          <span className="text-[11px] font-bold text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] px-2 py-0.5 rounded-[10px]">{item.condition}</span>
                          <span className="text-[11px] text-[#6B7280]">Qty: {item.qty}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-5">
                <div className="text-[15px] font-bold text-[#111827] mb-5">Order timeline</div>
                <div className="relative pl-6">
                  {timeline.map((ev, i) => (
                    <div key={i} className="relative" style={{ paddingBottom: i < timeline.length - 1 ? 18 : 0 }}>
                      {i < timeline.length - 1 && (
                        <div className="absolute left-[-19px] top-5 bottom-[-10px] w-0.5"
                          style={{ background: ev.done ? "#16A34A" : "#E5E7EB" }} />
                      )}
                      <div className="flex gap-3 items-start">
                        <div className="w-3 h-3 rounded-full border-[3px] border-white relative z-10 shrink-0 mt-1"
                          style={{
                            background: ev.done ? "#16A34A" : ev.current ? "#F97316" : "#fff",
                            boxShadow: `0 0 0 2px ${ev.done ? "#16A34A" : ev.current ? "#F97316" : "#E5E7EB"}`,
                          }} />
                        <div className="flex-1">
                          <div className="text-[13px] font-bold" style={{ color: ev.done || ev.current ? "#111827" : "#9CA3AF" }}>{ev.label}</div>
                          <div className="text-[11px] mt-0.5" style={{ color: ev.done ? "#16A34A" : ev.current ? "#F97316" : "#9CA3AF" }}>{ev.time}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping */}
              <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-5">
                <div className="text-[15px] font-bold text-[#111827] mb-3.5">Shipping details</div>
                <div className="flex flex-col gap-3 text-[13px]">
                  <div className="flex justify-between gap-4">
                    <span className="text-[#6B7280] shrink-0">Delivery address</span>
                    <span className="text-[#111827] font-semibold text-right max-w-[280px]">{fmtAddress(order.address)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#6B7280]">Shipping method</span>
                    <span className="text-[#111827] font-semibold">{order.courier || "—"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#6B7280]">Shipping fee</span>
                    <span className="text-[#111827] font-semibold">{naira(shipping)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#6B7280]">Estimated delivery</span>
                    <span className="text-[#111827] font-semibold">{order.eta || "—"}</span>
                  </div>
                  {order.trackingNumber && (
                    <div className="flex justify-between gap-4">
                      <span className="text-[#6B7280]">Tracking number</span>
                      <span className="text-[#2563EB] font-extrabold">{order.trackingNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-5">
              {/* Buyer */}
              <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-5">
                <div className="text-[15px] font-bold text-[#111827] mb-3.5">Buyer</div>
                <div className="flex gap-3 items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#2563EB] flex items-center justify-center text-white font-extrabold text-base">
                    {(order.buyerName || "B").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#111827]">{order.buyerName || "Buyer"}</div>
                    <div className="text-xs text-[#6B7280]">Order placed {fmtDate(order.createdAt)}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 text-[13px]">
                  <div className="flex justify-between gap-4">
                    <span className="text-[#6B7280]">Phone</span>
                    <span className="text-[#111827] font-semibold">{order.address?.phone || "—"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#6B7280]">Payment method</span>
                    <span className="text-[#111827] font-semibold capitalize">{order.payMethod || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Payment summary */}
              <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-5">
                <div className="text-[15px] font-bold text-[#111827] mb-3.5">Payment summary</div>
                <div className="flex flex-col gap-2.5 mb-4 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Items subtotal</span>
                    <span className="text-[#111827] font-semibold">{naira(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Shipping</span>
                    <span className="text-[#111827] font-semibold">{naira(shipping)}</span>
                  </div>
                  <div className="flex justify-between text-base font-extrabold text-[#111827] border-t border-[#E5E7EB] pt-2.5">
                    <span>Total</span>
                    <span>{naira(total)}</span>
                  </div>
                </div>
                <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg px-3 py-2.5 flex gap-2 items-center">
                  <span className="text-base">🛡️</span>
                  <div>
                    <div className="text-xs font-bold text-[#166534]">Escrow protected</div>
                    <div className="text-[11px] text-[#166534]">Payment held until delivery is confirmed</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-5">
                <div className="text-[15px] font-bold text-[#111827] mb-3.5">Actions</div>
                <div className="flex flex-col gap-2">
                  {st === "pending" && (
                    <Link href={`/seller/orders/${order.id}/ship`}
                      className="w-full py-3 text-sm font-bold text-white text-center bg-[#F97316] rounded-[10px] hover:bg-[#EA6C0A] transition-all no-underline">
                      🚚 Ship order
                    </Link>
                  )}
                  {st === "shipped" && (
                    <button onClick={() => updateStatus("Delivered")} disabled={busy}
                      className="w-full py-3 text-sm font-bold text-white bg-[#16A34A] rounded-[10px] hover:bg-[#15803D] transition-all cursor-pointer border-none disabled:opacity-50">
                      ✅ Mark as delivered
                    </button>
                  )}
                  <button onClick={() => window.print()}
                    className="w-full py-3 text-sm font-semibold text-[#374151] border-[1.5px] border-[#E5E7EB] rounded-[10px] hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all cursor-pointer bg-white">
                    🖨 Print order
                  </button>
                  {st === "pending" && (
                    <button onClick={() => setShowCancel(true)} disabled={busy}
                      className="w-full py-3 text-sm font-semibold text-[#DC2626] bg-[#FEF2F2] border-[1.5px] border-[#FECACA] rounded-[10px] hover:bg-[#DC2626] hover:text-white transition-all cursor-pointer disabled:opacity-50">
                      Cancel order
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
