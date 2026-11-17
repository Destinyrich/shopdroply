"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

/* ─── Types ─────────────────────────────────────────────────────── */
interface OrderItem {
  id: string;
  listingId: string;
  title: string;
  image: string;
  price: number;
  qty: number;
  seller: string;
  shipping: number;
  courier: string;
  condition: string;
}

interface Order {
  id: string;
  buyerId: string;
  items: OrderItem[];
  status: "Processing" | "In transit" | "Delivered" | "Confirm receipt" | "Cancelled";
  total: number;
  subtotal: number;
  shipping: number;
  discount: number;
  address: Record<string, string | number>;
  payMethod: string;
  courier: string;
  eta: string;
  createdAt: string;
  updatedAt: string;
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

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  Processing:    { label: "Processing",    color: C.amber,  bg: C.amberLight,  border: C.amberBdr,  icon: "📦" },
  "In transit":  { label: "In transit",    color: C.blue,   bg: C.blueLight,   border: C.blueBdr,   icon: "🚚" },
  Delivered:     { label: "Delivered",     color: C.green,  bg: C.greenLight,  border: C.greenBdr,  icon: "📬" },
  "Confirm receipt": { label: "Confirm receipt", color: C.orange, bg: C.orangeLight, border: C.orangeBdr, icon: "✋" },
  Cancelled:     { label: "Cancelled",     color: C.red,    bg: C.redLight,    border: C.redBdr,    icon: "❌" },
};

const PAY_ICONS: Record<string, string> = {
  card: "💳", transfer: "🏦", ussd: "📲", opay: "🟢", palmpay: "🟣", bnpl: "📅",
};

const PAY_LABELS: Record<string, string> = {
  card: "Debit / Credit card", transfer: "Bank transfer", ussd: "USSD",
  opay: "OPay wallet", palmpay: "PalmPay wallet", bnpl: "Buy now, pay later",
};

const TRACKING_STEPS = [
  { key: "Processing", label: "Order placed", icon: "📝" },
  { key: "Processing", label: "Processing", icon: "📦" },
  { key: "In transit", label: "In transit", icon: "🚚" },
  { key: "Delivered", label: "Delivered", icon: "📬" },
  { key: "Confirm receipt", label: "Completed", icon: "✅" },
];

/* ─── Helpers ───────────────────────────────────────────────────── */
function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

/* ─── Status Badge ──────────────────────────────────────────────── */
function StatusBadge({ status }: { status: Order["status"] }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
      style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}
    >
      {meta.icon} {meta.label}
    </span>
  );
}

/* ─── Tracking Timeline ─────────────────────────────────────────── */
function TrackingTimeline({ status }: { status: Order["status"] }) {
  const statusIndex = TRACKING_STEPS.findIndex((s) => s.key === status);
  const isCancelled = status === "Cancelled";

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5">
      <div className="text-base font-bold text-[#111827] mb-4">📍 Order tracking</div>
      {isCancelled ? (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] p-4 text-[13px] text-[#DC2626]">
          <strong>This order was cancelled.</strong> If you believe this was a mistake, please contact support.
        </div>
      ) : (
        <div className="relative">
          {TRACKING_STEPS.map((step, i) => {
            const done = i <= statusIndex;
            const active = i === statusIndex;
            return (
              <div key={step.label} className="flex gap-3 relative">
                {/* Connector line */}
                {i < TRACKING_STEPS.length - 1 && (
                  <div
                    className="absolute left-[15px] top-8 w-0.5 h-[calc(100%-16px)]"
                    style={{ background: i < statusIndex ? C.green : C.border }}
                  />
                )}
                {/* Dot */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 border-2 z-10"
                  style={{
                    background: done ? (active ? C.orange : C.green) : "#fff",
                    borderColor: done ? (active ? C.orange : C.green) : C.border,
                  }}
                >
                  {done && !active ? (
                    <span className="text-white text-xs font-bold">✓</span>
                  ) : (
                    <span style={{ color: active ? "#fff" : C.textLight }}>{step.icon}</span>
                  )}
                </div>
                {/* Label */}
                <div className="pb-6">
                  <div className={`text-[13px] font-bold ${active ? "text-[#F97316]" : done ? "text-[#16A34A]" : "text-[#9CA3AF]"}`}>
                    {step.label}
                  </div>
                  {active && (
                    <div className="text-[11px] text-[#6B7280] mt-0.5">Current status</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Section Title ─────────────────────────────────────────────── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-base font-bold text-[#111827] mb-3.5">{children}</div>;
}

/* ─── Skeleton ──────────────────────────────────────────────────── */
function SkeletonDetail() {
  return (
    <div className="max-w-[1080px] mx-auto px-4 py-6 animate-pulse">
      <div className="h-4 w-32 bg-[#E5E7EB] rounded mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          <div className="h-40 bg-white border border-[#E5E7EB] rounded-[14px]" />
          <div className="h-60 bg-white border border-[#E5E7EB] rounded-[14px]" />
          <div className="h-48 bg-white border border-[#E5E7EB] rounded-[14px]" />
        </div>
        <div className="space-y-4">
          <div className="h-56 bg-white border border-[#E5E7EB] rounded-[14px]" />
          <div className="h-40 bg-white border border-[#E5E7EB] rounded-[14px]" />
        </div>
      </div>
    </div>
  );
}

/* ─── Main Export ───────────────────────────────────────────────── */
export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDesc, setDisputeDesc] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (orderId) fetchOrder();
  }, [orderId]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const fetchOrder = async () => {
    try {
      const res = await fetch("/api/buyer/orders");
      const json = await res.json();
      if (json.success) {
        const found = json.data.find((o: Order) => o.id === orderId);
        if (found) setOrder(found);
        else router.push("/buyer/orders");
      }
    } catch (err) {
      console.error("Failed to load order", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!order) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/buyer/orders/${order.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setOrder((prev) => prev ? { ...prev, status: "Confirm receipt" } : prev);
        setToast({ msg: "✅ Delivery confirmed! Funds released to seller.", type: "success" });
      } else {
        setToast({ msg: "❌ Failed to confirm delivery. Try again.", type: "error" });
      }
    } catch {
      setToast({ msg: "❌ Network error. Try again.", type: "error" });
    } finally {
      setConfirming(false);
    }
  };

  const handleDispute = async () => {
    if (!order || !disputeReason.trim()) return;
    setDisputing(true);
    try {
      const res = await fetch("/api/buyer/escrow", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, status: "disputed", reason: disputeReason, description: disputeDesc }),
      });
      if (res.ok) {
        setShowDisputeModal(false);
        setToast({ msg: "🛡️ Dispute filed. Our team will review within 24hrs.", type: "success" });
      } else {
        setToast({ msg: "❌ Failed to file dispute. Try again.", type: "error" });
      }
    } catch {
      setToast({ msg: "❌ Network error. Try again.", type: "error" });
    } finally {
      setDisputing(false);
    }
  };

  if (loading) return <SkeletonDetail />;
  if (!order) return null;

  const meta = STATUS_META[order.status];
  const discount = order.discount || 0;

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-[fadeUp_0.3s_ease_both]">
          <div
            className={`px-5 py-3 rounded-[10px] text-sm font-semibold shadow-[0_4px_24px_rgba(0,0,0,0.12)] border ${
              toast.type === "success"
                ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]"
                : "bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]"
            }`}
          >
            {toast.msg}
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 animate-[fadeIn_0.2s_ease_both]">
          <div className="bg-white rounded-[14px] p-6 w-full max-w-[420px] shadow-[0_8px_40px_rgba(0,0,0,0.15)]">
            <div className="text-lg font-extrabold text-[#111827] mb-1">🛡️ Report an issue</div>
            <div className="text-[13px] text-[#6B7280] mb-4">
              File a dispute for order <strong>{order.id}</strong>. Your payment is safe in escrow.
            </div>
            <div className="flex flex-col gap-3.5">
              <div>
                <label className="text-[13px] font-semibold text-[#374151] mb-1 block">Reason <span className="text-[#DC2626]">*</span></label>
                <select
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-[10px] text-sm text-[#111827] outline-none bg-white appearance-none cursor-pointer"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                >
                  <option value="">Select a reason</option>
                  <option value="item_not_received">Item not received</option>
                  <option value="wrong_item">Wrong item received</option>
                  <option value="damaged">Item damaged / defective</option>
                  <option value="not_as_described">Not as described</option>
                  <option value="seller_no_response">Seller not responding</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-[13px] font-semibold text-[#374151] mb-1 block">Description</label>
                <textarea
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-[10px] text-sm text-[#111827] outline-none resize-y min-h-[80px] placeholder:text-[#9CA3AF]"
                  placeholder="Describe the issue in detail..."
                  value={disputeDesc}
                  onChange={(e) => setDisputeDesc(e.target.value)}
                />
              </div>
              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={() => setShowDisputeModal(false)}
                  className="flex-1 bg-white border border-[#E5E7EB] rounded-[10px] py-2.5 text-sm font-semibold text-[#374151] hover:border-[#F97316] hover:text-[#F97316] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDispute}
                  disabled={!disputeReason || disputing}
                  className="flex-1 bg-[#DC2626] text-white rounded-[10px] py-2.5 text-sm font-bold hover:bg-[#B91C1C] transition-all cursor-pointer disabled:bg-[#D1D5DB] disabled:cursor-not-allowed"
                >
                  {disputing ? "Filing..." : "File dispute"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-[1080px] mx-auto px-4 py-4">
          <Link
            href="/buyer/orders"
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#6B7280] hover:text-[#F97316] transition-colors no-underline mb-3"
          >
            ← Back to orders
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-[22px] font-extrabold text-[#111827]">{order.id}</h1>
              <StatusBadge status={order.status} />
            </div>
            <div className="text-[13px] text-[#6B7280]">
              Placed on {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1080px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">
          {/* Left column */}
          <div className="flex flex-col gap-4">
            {/* Tracking */}
            <TrackingTimeline status={order.status} />

            {/* Items */}
            <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5">
              <SectionTitle>📦 Items ({order.items.length})</SectionTitle>
              <div className="flex flex-col gap-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-3 items-start py-3 border-b border-[#E5E7EB] last:border-b-0 last:pb-0 first:pt-0">
                    <div className="w-16 h-16 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[10px] flex items-center justify-center text-2xl shrink-0">
                      {item.image || "📦"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/product/${item.listingId}`}
                        className="text-sm font-semibold text-[#111827] hover:text-[#F97316] transition-colors no-underline block truncate"
                      >
                        {item.title}
                      </Link>
                      <div className="text-[11px] text-[#6B7280] mt-0.5">
                        Seller: {item.seller} · {item.condition}
                      </div>
                      <div className="text-[11px] text-[#6B7280] mt-0.5">
                        🚚 {item.courier || order.courier || "GIG Logistics"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-[#111827]">₦{(item.price * item.qty).toLocaleString()}</div>
                      <div className="text-[11px] text-[#9CA3AF]">{item.qty} × ₦{item.price.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Address */}
            <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5">
              <SectionTitle>📍 Delivery address</SectionTitle>
              <div className="text-sm text-[#374151] leading-7">
                <strong>{order.address.firstName} {order.address.lastName}</strong><br />
                {order.address.address}<br />
                {order.address.lga}, {order.address.state}<br />
                📞 +234 {order.address.phone}
              </div>
              {order.address.note && (
                <div className="mt-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-[10px] px-3 py-2 text-[11px] text-[#92400E]">
                  📝 <strong>Note:</strong> {order.address.note}
                </div>
              )}
            </div>

            {/* Payment */}
            <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5">
              <SectionTitle>💳 Payment method</SectionTitle>
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{PAY_ICONS[order.payMethod] || "💳"}</span>
                <div>
                  <div className="text-sm font-semibold text-[#111827]">{PAY_LABELS[order.payMethod] || order.payMethod}</div>
                  <div className="text-[11px] text-[#6B7280]">Paid on {formatDate(order.createdAt)}</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            {order.status !== "Cancelled" && order.status !== "Confirm receipt" && (
              <div className="flex flex-wrap gap-2.5">
                {order.status === "Delivered" && (
                  <button
                    onClick={handleConfirmDelivery}
                    disabled={confirming}
                    className="flex-1 bg-[#16A34A] text-white rounded-[10px] py-3.5 text-[15px] font-bold hover:bg-[#15803D] hover:-translate-y-px hover:shadow-[0_4px_18px_rgba(22,163,74,0.3)] transition-all cursor-pointer disabled:bg-[#D1D5DB] disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                  >
                    {confirming ? "Confirming..." : "✓ Confirm delivery & release funds"}
                  </button>
                )}
                <button
                  onClick={() => setShowDisputeModal(true)}
                  className="bg-white border border-[#E5E7EB] text-[#374151] rounded-[10px] px-5 py-3.5 text-sm font-semibold hover:border-[#DC2626] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-all cursor-pointer"
                >
                  🚩 Report issue
                </button>
              </div>
            )}

            {order.status === "Confirm receipt" && (
              <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[14px] p-4 flex gap-3 items-start">
                <span className="text-2xl shrink-0">✅</span>
                <div>
                  <div className="text-[13px] font-bold text-[#166534] mb-1">Order completed</div>
                  <div className="text-xs text-[#166534] leading-relaxed">
                    You confirmed receipt on {formatDate(order.updatedAt)}. Funds have been released to the seller. Thank you for shopping on Shopdroply!
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right column — Summary */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-6">
            {/* Price breakdown */}
            <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5">
              <SectionTitle>💰 Order summary</SectionTitle>
              <div className="flex flex-col gap-2 mb-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-[13px] text-[#6B7280]">
                    <span className="truncate max-w-[200px]">{item.title} × {item.qty}</span>
                    <span className="font-medium text-[#374151] shrink-0">₦{(item.price * item.qty).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#E5E7EB] pt-3 space-y-2">
                <div className="flex justify-between text-[13px] text-[#6B7280]">
                  <span>Subtotal</span>
                  <span className="font-medium text-[#374151]">₦{order.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[13px] text-[#6B7280]">
                  <span>Shipping</span>
                  <span className="font-medium text-[#374151]">₦{order.shipping.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-[13px] text-[#16A34A]">
                    <span>Discount</span>
                    <span className="font-medium">−₦{discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-extrabold text-[#111827] pt-2 border-t border-[#E5E7EB]">
                  <span>Total</span>
                  <span className="text-[#F97316]">₦{order.total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Escrow banner */}
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[14px] p-4 flex gap-3 items-start">
              <span className="text-2xl shrink-0">🛡️</span>
              <div>
                <div className="text-[13px] font-bold text-[#166534] mb-1">Escrow protected</div>
                <div className="text-xs text-[#166534] leading-relaxed">
                  ₦{order.total.toLocaleString()} is held securely. Funds are only released to the seller after you confirm delivery.
                </div>
              </div>
            </div>

            {/* Need help */}
            <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5">
              <SectionTitle>❓ Need help?</SectionTitle>
              <div className="flex flex-col gap-2">
                <button className="w-full text-left px-3.5 py-2.5 rounded-[10px] text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB] hover:text-[#F97316] transition-all cursor-pointer border border-transparent hover:border-[#E5E7EB]">
                  📞 Contact seller
                </button>
                <button className="w-full text-left px-3.5 py-2.5 rounded-[10px] text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB] hover:text-[#F97316] transition-all cursor-pointer border border-transparent hover:border-[#E5E7EB]">
                  🔄 Request return / refund
                </button>
                <button className="w-full text-left px-3.5 py-2.5 rounded-[10px] text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB] hover:text-[#F97316] transition-all cursor-pointer border border-transparent hover:border-[#E5E7EB]">
                  📖 View escrow policy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}