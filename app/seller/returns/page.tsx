"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SellerSidebar from "@/components/seller/Sidebar";

interface SellerAccountProfile {
  id: string; name: string; email: string; sellerStatus?: string;
}

interface ReturnRequest {
  id: string; orderId: string; sellerId: string; buyerName: string;
  item: string; image: string; amount: number; reason: string; details?: string;
  status: "requested" | "approved" | "declined" | "received" | "refunded";
  resolution?: string; createdAt: string; updatedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  requested: { label: "New request", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "📥" },
  approved:  { label: "Approved",    color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", icon: "✓" },
  declined:  { label: "Declined",    color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: "✕" },
  received:  { label: "Item received", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", icon: "📦" },
  refunded:  { label: "Refunded",    color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0", icon: "💰" },
};

const REASON_ICONS: Record<string, string> = {
  "Item not as described": "🔍",
  "Damaged on arrival": "💥",
  "Wrong item sent": "❌",
  "Changed my mind": "🔄",
  "Defective / not working": "⚙️",
};

const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;

function timeAgo(iso?: string) {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min ago`;
  const h = Math.floor(s / 3600);
  if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
  return `${Math.floor(h / 24)} day${Math.floor(h / 24) > 1 ? "s" : ""} ago`;
}

function StatusPill({ status }: { status: string }) {
  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.requested;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap"
      style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}>
      {sc.icon} {sc.label}
    </span>
  );
}

export default function SellerReturnsPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<SellerAccountProfile | null>(null);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  // Modal state: which action + target return
  const [modal, setModal] = useState<{ action: "decline" | "refund"; ret: ReturnRequest } | null>(null);
  const [resolution, setResolution] = useState("");

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = async () => {
    try {
      const [profileRes, returnsRes] = await Promise.all([
        fetch("/api/seller/me"),
        fetch("/api/seller/returns"),
      ]);
      const profileData = await profileRes.json();
      const returnsData = await returnsRes.json();
      if (!profileData.success || !profileData.data) {
        router.push("/seller/onboarding");
        return;
      }
      setSeller(profileData.data);
      if (returnsData.success) setReturns(returnsData.data);
    } catch {
      setToast({ msg: "❌ Failed to load returns", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string, resNote?: string) => {
    setBusyId(id);
    try {
      const r = await fetch("/api/seller/returns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, resolution: resNote }),
      });
      const data = await r.json();
      if (data.success) {
        setReturns((prev) => prev.map((x) => (x.id === id ? { ...x, ...data.data } : x)));
        setModal(null);
        setResolution("");
        const labels: Record<string, string> = {
          approved: "Return approved — ask the buyer to send the item back",
          declined: "Return declined",
          received: "Item marked as received",
          refunded: "Refund issued to the buyer",
        };
        setToast({ msg: `✅ ${labels[status] || "Updated"}`, type: "success" });
      } else {
        setToast({ msg: `❌ ${data.error || "Update failed"}`, type: "error" });
      }
    } catch {
      setToast({ msg: "❌ Failed to update return", type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const counts = {
    requested: returns.filter((r) => r.status === "requested").length,
    approved: returns.filter((r) => r.status === "approved").length,
    inProgress: returns.filter((r) => r.status === "received").length,
    closed: returns.filter((r) => r.status === "refunded" || r.status === "declined").length,
  };
  const openValue = returns
    .filter((r) => r.status === "requested" || r.status === "approved" || r.status === "received")
    .reduce((s, r) => s + r.amount, 0);

  const statCards = [
    { label: "NEW REQUESTS", count: counts.requested, color: "#D97706", sub: "Need your response" },
    { label: "APPROVED", count: counts.approved, color: "#2563EB", sub: "Awaiting item back" },
    { label: "ITEMS RECEIVED", count: counts.inProgress, color: "#7C3AED", sub: "Ready to refund" },
    { label: "CLOSED", count: counts.closed, color: "#16A34A", sub: `${naira(openValue)} currently at risk` },
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

      {/* Resolution modal (decline / refund need a note) */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-[500] flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-[20px] p-7 max-w-[440px] w-full" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-extrabold text-[#111827] mb-1">
              {modal.action === "decline" ? "❌ Decline return" : "💰 Issue refund"}
            </div>
            <div className="text-[13px] text-[#6B7280] mb-4">
              {modal.action === "decline"
                ? `${modal.ret.item} — ${naira(modal.ret.amount)}. Tell the buyer why.`
                : `${modal.ret.item} — ${naira(modal.ret.amount)} will be returned to the buyer via escrow.`}
            </div>
            <textarea
              className="w-full px-3.5 py-2.5 border-[1.5px] border-[#E5E7EB] rounded-[10px] text-sm outline-none focus:border-[#F97316] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.1)] bg-white resize-y min-h-[80px] mb-4"
              placeholder={modal.action === "decline" ? "e.g. Item matches the listing photos…" : "e.g. Refunded in full after inspection"}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2.5">
              <button onClick={() => setModal(null)} disabled={busyId === modal.ret.id}
                className="flex-1 py-2.5 text-sm font-semibold text-[#374151] border-[1.5px] border-[#E5E7EB] rounded-[10px] hover:border-[#F97316] hover:text-[#F97316] bg-white cursor-pointer disabled:opacity-50">
                Cancel
              </button>
              <button
                onClick={() => updateStatus(modal.ret.id, modal.action === "decline" ? "declined" : "refunded", resolution)}
                disabled={busyId === modal.ret.id || !resolution.trim()}
                className={`flex-[2] py-2.5 text-sm font-bold text-white rounded-[10px] cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  modal.action === "decline" ? "bg-[#DC2626] hover:bg-[#B91C1C]" : "bg-[#16A34A] hover:bg-[#15803D]"}`}>
                {busyId === modal.ret.id ? "Processing…" : modal.action === "decline" ? "Decline return" : "Confirm refund"}
              </button>
            </div>
          </div>
        </div>
      )}

      <SellerSidebar activeTab="returns" seller={seller} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="lg:pl-[260px] min-h-screen">
        <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] h-16 flex items-center gap-3 px-4 lg:px-6">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden bg-transparent border-none text-xl cursor-pointer p-1">☰</button>
          <h1 className="text-lg font-extrabold text-[#111827]">Returns</h1>
        </header>

        <div className="p-4 lg:p-6 max-w-[1000px]">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map((s) => (
              <div key={s.label} className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-5">
                <div className="text-[11px] text-[#6B7280] font-semibold mb-1">{s.label}</div>
                <div className="text-[26px] font-extrabold mb-0.5" style={{ color: s.color }}>{s.count}</div>
                <div className="text-[11px] text-[#6B7280]">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* List */}
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 bg-white border border-[#E5E7EB] rounded-[14px] animate-pulse" />
              ))}
            </div>
          ) : returns.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-[14px] text-center py-16 text-sm text-[#6B7280]">
              <div className="text-4xl mb-3">↩️</div>
              <div className="text-base font-bold text-[#111827] mb-1">No return requests</div>
              Buyer return requests will appear here.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {returns.map((ret) => (
                <div key={ret.id} className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-4">
                  <div className="flex gap-3.5 items-start flex-wrap">
                    <div className="w-[52px] h-[52px] rounded-[10px] bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                      {ret.image ? <img src={ret.image} alt="" className="w-full h-full object-cover" /> : "📦"}
                    </div>
                    <div className="flex-1 min-w-[220px]">
                      <div className="flex justify-between items-start gap-2 flex-wrap mb-1.5">
                        <div>
                          <div className="text-sm font-bold text-[#111827] mb-0.5">{ret.item}</div>
                          <div className="text-xs text-[#6B7280]">
                            {ret.buyerName} · {ret.orderId} · {timeAgo(ret.createdAt)}
                          </div>
                        </div>
                        <StatusPill status={ret.status} />
                      </div>

                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-lg font-extrabold text-[#111827]">{naira(ret.amount)}</span>
                        <span className="text-[11px] font-bold text-[#374151] bg-[#F9FAFB] border border-[#E5E7EB] px-2 py-0.5 rounded-[10px]">
                          {REASON_ICONS[ret.reason] || "↩️"} {ret.reason}
                        </span>
                      </div>

                      {ret.details && (
                        <div className="bg-[#F9FAFB] rounded-lg px-3 py-2 mb-2 text-xs text-[#374151] italic">
                          &ldquo;{ret.details}&rdquo;
                        </div>
                      )}

                      {ret.resolution && (
                        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg px-3 py-2 mb-2 text-xs text-[#1e40af]">
                          <strong>Resolution:</strong> {ret.resolution}
                        </div>
                      )}

                      {/* Actions per state */}
                      <div className="flex gap-2 flex-wrap mt-1">
                        {ret.status === "requested" && (
                          <>
                            <button disabled={busyId === ret.id} onClick={() => updateStatus(ret.id, "approved")}
                              className="px-4 py-2 text-xs font-bold text-white bg-[#16A34A] rounded-lg hover:bg-[#15803D] cursor-pointer border-none disabled:opacity-50">
                              ✓ Approve return
                            </button>
                            <button disabled={busyId === ret.id} onClick={() => { setModal({ action: "decline", ret }); setResolution(""); }}
                              className="px-4 py-2 text-xs font-semibold text-[#DC2626] bg-[#FEF2F2] border-[1.5px] border-[#FECACA] rounded-lg hover:bg-[#DC2626] hover:text-white cursor-pointer disabled:opacity-50">
                              ❌ Decline
                            </button>
                          </>
                        )}
                        {ret.status === "approved" && (
                          <button disabled={busyId === ret.id} onClick={() => updateStatus(ret.id, "received")}
                            className="px-4 py-2 text-xs font-bold text-white bg-[#7C3AED] rounded-lg hover:bg-[#6D28D9] cursor-pointer border-none disabled:opacity-50">
                            📦 Mark item received
                          </button>
                        )}
                        {ret.status === "received" && (
                          <button disabled={busyId === ret.id} onClick={() => { setModal({ action: "refund", ret }); setResolution(""); }}
                            className="px-4 py-2 text-xs font-bold text-white bg-[#16A34A] rounded-lg hover:bg-[#15803D] cursor-pointer border-none disabled:opacity-50">
                            💰 Issue refund
                          </button>
                        )}
                        <Link href={`/seller/orders/${ret.orderId}`}
                          className="px-4 py-2 text-xs font-semibold text-[#374151] border-[1.5px] border-[#E5E7EB] rounded-lg hover:border-[#F97316] hover:text-[#F97316] bg-white transition-all no-underline">
                          View order
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] px-2 py-2 z-[200] flex justify-around lg:hidden">
        {[
          { icon: "📊", href: "/seller/dashboard" },
          { icon: "📦", href: "/seller/listings" },
          { icon: "🛒", href: "/seller/orders" },
          { icon: "💰", href: "/seller/earnings" },
          { icon: "⚙️", href: "/seller/settings" },
        ].map((item, i) => (
          <Link key={i} href={item.href} className="p-2 text-xl text-[#9CA3AF] no-underline">{item.icon}</Link>
        ))}
      </nav>
      <div className="h-16 lg:hidden" />
    </div>
  );
}
