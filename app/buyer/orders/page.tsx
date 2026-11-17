"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import PayNowButton from "@/components/buyer/PayNowButton";

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
  status: "Pending payment" | "Processing" | "In transit" | "Delivered" | "Confirm receipt" | "Cancelled" | "dispute" | "pending" | "shipped";
  total: number;
  subtotal: number;
  shipping: number;
  discount: number;
  address: Record<string, string | number>;
  payMethod: string;
  courier: string;
  eta: string;
  checkoutId?: string;
  paymentStatus?: string;
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
  "Pending payment": { label: "Pending payment", color: C.amber, bg: C.amberLight, border: C.amberBdr, icon: "💳" },
  dispute:       { label: "In dispute",    color: C.red,    bg: C.redLight,    border: C.redBdr,    icon: "⚖️" },
};

// Safety net: an unknown status must never crash the page.
function metaFor(status: string) {
  return STATUS_META[status] ?? { label: status, color: C.textSub, bg: C.bg, border: C.border, icon: "📦" };
}

const TABS = ["All", "Pending payment", "Processing", "In transit", "Delivered", "Confirm receipt", "Cancelled"];

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
  const meta = metaFor(status);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
      style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}
    >
      {meta.icon} {meta.label}
    </span>
  );
}

/* ─── Order Card ────────────────────────────────────────────────── */
function OrderCard({ order }: { order: Order }) {
  const mainItem = order.items[0];
  const moreCount = order.items.length - 1;

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-4 sm:p-5 transition-all hover:border-[#F97316] hover:shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-bold text-[#111827]">{order.id}</span>
          <StatusBadge status={order.status} />
        </div>
        <span className="text-[11px] text-[#9CA3AF]">{formatDate(order.createdAt)} · {formatTime(order.createdAt)}</span>
      </div>

      {/* Items preview */}
      <div className="flex gap-3 items-start mb-3.5">
        <div className="w-16 h-16 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[10px] flex items-center justify-center text-2xl shrink-0">
          {mainItem.image || "📦"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[#111827] truncate">{mainItem.title}</div>
          <div className="text-[11px] text-[#6B7280] mt-0.5">
            {mainItem.qty} × ₦{mainItem.price.toLocaleString()} · {mainItem.seller}
          </div>
          {moreCount > 0 && (
            <div className="text-[11px] text-[#9CA3AF] mt-0.5">+{moreCount} more item{moreCount > 1 ? "s" : ""}</div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-extrabold text-[#111827]">₦{order.total.toLocaleString()}</div>
          <div className="text-[11px] text-[#9CA3AF]">{order.items.length} item{order.items.length > 1 ? "s" : ""}</div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E5E7EB]">
        {order.status === "Pending payment" ? (
          <div className="text-[11px] text-[#D97706]">Complete payment so the seller can ship</div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
            <span>🚚</span>
            <span>{order.courier || "GIG Logistics"}</span>
            <span className="text-[#E5E7EB]">·</span>
            <span>ETA: {order.eta || "2–3 days"}</span>
          </div>
        )}
        <div className="flex gap-2">
          {order.status === "Pending payment" && order.checkoutId && (
            <PayNowButton checkoutId={order.checkoutId} />
          )}
          {order.status === "Delivered" && (
            <button className="bg-[#F0FDF4] border border-[#BBF7D0] text-[#16A34A] rounded-lg px-3 py-1.5 text-[11px] font-bold hover:bg-[#16A34A] hover:text-white transition-all cursor-pointer">
              ✓ Confirm receipt
            </button>
          )}
          <Link
            href={`/buyer/orders/${order.id}`}
            className="bg-white border border-[#E5E7EB] text-[#374151] rounded-lg px-3 py-1.5 text-[11px] font-semibold hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all no-underline"
          >
            View details →
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Empty State ───────────────────────────────────────────────── */
function EmptyState({ filter }: { filter: string }) {
  return (
    <div className="text-center py-16 px-6 bg-white rounded-[14px] border border-[#E5E7EB]">
      <div className="text-[52px] mb-3">📦</div>
      <div className="text-lg font-bold text-[#111827] mb-1.5">
        {filter === "All" ? "No orders yet" : `No ${filter.toLowerCase()} orders`}
      </div>
      <div className="text-sm text-[#6B7280] mb-4">
        {filter === "All"
          ? "When you place an order, it will show up here."
          : `You don't have any orders with "${filter}" status.`}
      </div>
      <Link
        href="/search"
        className="inline-flex items-center justify-center bg-[#F97316] text-white rounded-[10px] px-6 py-2.5 text-sm font-bold hover:bg-[#EA6C0A] transition-colors no-underline"
      >
        🛍️ Browse listings
      </Link>
    </div>
  );
}

/* ─── Skeleton Loader ───────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5 animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-4 w-24 bg-[#E5E7EB] rounded" />
        <div className="h-4 w-16 bg-[#E5E7EB] rounded" />
      </div>
      <div className="flex gap-3 mb-3">
        <div className="w-16 h-16 bg-[#E5E7EB] rounded-[10px] shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-3/4 bg-[#E5E7EB] rounded" />
          <div className="h-3 w-1/2 bg-[#E5E7EB] rounded" />
        </div>
      </div>
      <div className="h-8 w-full bg-[#E5E7EB] rounded-lg" />
    </div>
  );
}

/* ─── Main Export ───────────────────────────────────────────────── */
function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("status") || "All";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/buyer/orders");
      const json = await res.json();
      if (json.success) {
        setOrders(json.data);
      }
    } catch (err) {
      console.error("Failed to load orders", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = orders.filter((o) => {
    const matchesTab = activeTab === "All" || o.status === activeTab;
    const matchesSearch =
      search === "" ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.items.some((i) => i.title.toLowerCase().includes(search.toLowerCase())) ||
      o.items.some((i) => i.seller.toLowerCase().includes(search.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const setTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "All") {
      params.delete("status");
    } else {
      params.set("status", tab);
    }
    router.push(`/buyer/orders?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] sticky top-0 z-40">
        <div className="max-w-[1080px] mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-[22px] font-extrabold text-[#111827]">My Orders</h1>
              <p className="text-[13px] text-[#6B7280] mt-0.5">
                {orders.length} order{orders.length !== 1 ? "s" : ""} total
              </p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <input
                  className="w-full sm:w-[260px] bg-white border border-[#E5E7EB] rounded-[10px] pl-9 pr-3 py-2 text-[13px] text-[#111827] outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] transition-all placeholder:text-[#9CA3AF]"
                  placeholder="Search orders, items, sellers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-sm">🔍</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 overflow-x-auto pb-1 scrollbar-hide">
            {TABS.map((tab) => {
              const count = tab === "All" ? orders.length : orders.filter((o) => o.status === tab).length;
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setTab(tab)}
                  className={`px-3.5 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                    active
                      ? "bg-[#F97316] text-white border-[#F97316]"
                      : "bg-white text-[#374151] border-[#E5E7EB] hover:border-[#F97316] hover:text-[#F97316]"
                  }`}
                >
                  {tab}
                  {count > 0 && (
                    <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full ${active ? "bg-white/20" : "bg-[#F3F4F6] text-[#6B7280]"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1080px] mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col gap-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={activeTab} />
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersContent />
    </Suspense>
  );
}