"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/* ─── Types ─────────────────────────────────────────────────────── */
interface EscrowRecord {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  status: "pending" | "released" | "disputed";
  createdAt: string;
}

/* ─── Design tokens ─────────────────────────────────────────────── */
const C = {
  orange: "#F97316", orangeLight: "#FFF7ED", orangeBdr: "#FED7AA",
  green: "#16A34A", greenLight: "#F0FDF4", greenBdr: "#BBF7D0",
  red: "#DC2626", redLight: "#FEF2F2", redBdr: "#FECACA",
  amber: "#D97706", amberLight: "#FFFBEB", amberBdr: "#FDE68A",
  blue: "#2563EB", blueLight: "#EFF6FF", blueBdr: "#BFDBFE",
  bg: "#F9FAFB", border: "#E5E7EB",
  text: "#111827", textMid: "#374151", textSub: "#6B7280", textLight: "#9CA3AF",
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  pending:   { label: "Pending",   color: C.amber, bg: C.amberLight, border: C.amberBdr, icon: "⏳" },
  released:  { label: "Released",  color: C.green, bg: C.greenLight, border: C.greenBdr, icon: "✅" },
  disputed:  { label: "Disputed",  color: C.red,   bg: C.redLight,   border: C.redBdr,   icon: "🛡️" },
};

/* ─── Helpers ───────────────────────────────────────────────────── */
function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

/* ─── Toast ─────────────────────────────────────────────────────── */
function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-[fadeUp_0.3s_ease_both]">
      <div
        className={`px-5 py-3 rounded-[10px] text-sm font-semibold shadow-[0_4px_24px_rgba(0,0,0,0.12)] border ${
          type === "success"
            ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]"
            : "bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]"
        }`}
      >
        {msg}
      </div>
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────────── */
function StatCard({
  label,
  amount,
  count,
  color,
  bg,
  border,
  icon,
}: {
  label: string;
  amount: number;
  count: number;
  color: string;
  bg: string;
  border: string;
  icon: string;
}) {
  return (
    <div className="bg-white border rounded-[14px] p-5 transition-all hover:shadow-[0_2px_12px_rgba(0,0,0,0.05)]" style={{ borderColor: border }}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-lg" style={{ background: bg, border: `1px solid ${border}` }}>
          {icon}
        </div>
        <span className="text-[13px] font-semibold text-[#6B7280]">{label}</span>
      </div>
      <div className="text-[22px] font-extrabold text-[#111827]">₦{amount.toLocaleString()}</div>
      <div className="text-[11px] text-[#9CA3AF] mt-0.5">{count} transaction{count !== 1 ? "s" : ""}</div>
    </div>
  );
}

/* ─── Escrow Row ────────────────────────────────────────────────── */
function EscrowRow({ record }: { record: EscrowRecord }) {
  const meta = STATUS_META[record.status];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white border border-[#E5E7EB] rounded-[12px] transition-all hover:border-[#F97316] hover:shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
      {/* Status icon */}
      <div
        className="w-10 h-10 rounded-[10px] flex items-center justify-center text-xl shrink-0"
        style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
      >
        {meta.icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/buyer/orders/${record.orderId}`}
            className="text-sm font-bold text-[#111827] hover:text-[#F97316] transition-colors no-underline"
          >
            {record.orderId}
          </Link>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border"
            style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}
          >
            {meta.label}
          </span>
        </div>
        <div className="text-[11px] text-[#6B7280] mt-0.5">
          {formatDate(record.createdAt)} at {formatTime(record.createdAt)} · Seller: {record.sellerId.slice(0, 8)}...
        </div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <div className="text-base font-extrabold text-[#111827]">₦{record.amount.toLocaleString()}</div>
        <div className="text-[11px] text-[#9CA3AF]">Escrow amount</div>
      </div>

      {/* Action */}
      <div className="shrink-0">
        <Link
          href={`/buyer/orders/${record.orderId}`}
          className="inline-flex items-center justify-center bg-white border border-[#E5E7EB] text-[#374151] rounded-[10px] px-4 py-2 text-[12px] font-semibold hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all no-underline"
        >
          View order →
        </Link>
      </div>
    </div>
  );
}

/* ─── Empty State ───────────────────────────────────────────────── */
function EmptyState({ filter }: { filter: string }) {
  const msgs: Record<string, { icon: string; title: string; body: string }> = {
    all: { icon: "🛡️", title: "No escrow transactions", body: "When you place an order, your payment is held in escrow. It will show up here." },
    pending: { icon: "⏳", title: "No pending escrow", body: "All your escrow funds have been released or resolved." },
    released: { icon: "✅", title: "No released funds", body: "Funds are released after you confirm delivery." },
    disputed: { icon: "🛡️", title: "No disputes", body: "You have no active disputes. Great!" },
  };
  const m = msgs[filter] || msgs.all;

  return (
    <div className="text-center py-20 px-6 bg-white rounded-[14px] border border-[#E5E7EB]">
      <div className="text-[52px] mb-3">{m.icon}</div>
      <div className="text-lg font-bold text-[#111827] mb-1.5">{m.title}</div>
      <div className="text-sm text-[#6B7280] mb-5 max-w-[340px] mx-auto">{m.body}</div>
      <Link
        href="/search"
        className="inline-flex items-center justify-center bg-[#F97316] text-white rounded-[10px] px-6 py-2.5 text-sm font-bold hover:bg-[#EA6C0A] transition-colors no-underline"
      >
        🛍️ Start shopping
      </Link>
    </div>
  );
}

/* ─── Skeleton Row ──────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-4 bg-white border border-[#E5E7EB] rounded-[12px] animate-pulse">
      <div className="w-10 h-10 bg-[#E5E7EB] rounded-[10px] shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-1/4 bg-[#E5E7EB] rounded" />
        <div className="h-3 w-1/2 bg-[#E5E7EB] rounded" />
      </div>
      <div className="h-4 w-20 bg-[#E5E7EB] rounded shrink-0" />
      <div className="h-8 w-24 bg-[#E5E7EB] rounded-[10px] shrink-0" />
    </div>
  );
}

/* ─── Main Export ───────────────────────────────────────────────── */
export default function EscrowPage() {
  const [records, setRecords] = useState<EscrowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "released" | "disputed">("all");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchEscrow();
  }, []);

  const fetchEscrow = async () => {
    try {
      const res = await fetch("/api/buyer/escrow");
      const json = await res.json();
      if (json.success) {
        setRecords(json.data);
      }
    } catch (err) {
      console.error("Failed to load escrow", err);
      setToast({ msg: "❌ Failed to load escrow records", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const filtered = records.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  const pendingTotal = records.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount, 0);
  const releasedTotal = records.filter((r) => r.status === "released").reduce((s, r) => s + r.amount, 0);
  const disputedTotal = records.filter((r) => r.status === "disputed").reduce((s, r) => s + r.amount, 0);

  const pendingCount = records.filter((r) => r.status === "pending").length;
  const releasedCount = records.filter((r) => r.status === "released").length;
  const disputedCount = records.filter((r) => r.status === "disputed").length;

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-[1080px] mx-auto px-4 py-4">
          <h1 className="text-[22px] font-extrabold text-[#111827]">Escrow Protection</h1>
          <p className="text-[13px] text-[#6B7280] mt-0.5">
            {records.length} transaction{records.length !== 1 ? "s" : ""} · Funds are held safely until delivery is confirmed
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-[1080px] mx-auto px-4 pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <StatCard
            label="Pending in escrow"
            amount={pendingTotal}
            count={pendingCount}
            color={C.amber}
            bg={C.amberLight}
            border={C.amberBdr}
            icon="⏳"
          />
          <StatCard
            label="Released to sellers"
            amount={releasedTotal}
            count={releasedCount}
            color={C.green}
            bg={C.greenLight}
            border={C.greenBdr}
            icon="✅"
          />
          <StatCard
            label="Under dispute"
            amount={disputedTotal}
            count={disputedCount}
            color={C.red}
            bg={C.redLight}
            border={C.redBdr}
            icon="🛡️"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { key: "all", label: "All", count: records.length },
            { key: "pending", label: "Pending", count: pendingCount },
            { key: "released", label: "Released", count: releasedCount },
            { key: "disputed", label: "Disputed", count: disputedCount },
          ].map((tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as typeof filter)}
                className={`px-3.5 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  active
                    ? "bg-[#F97316] text-white border-[#F97316]"
                    : "bg-white text-[#374151] border-[#E5E7EB] hover:border-[#F97316] hover:text-[#F97316]"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full ${active ? "bg-white/20" : "bg-[#F3F4F6] text-[#6B7280]"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1080px] mx-auto px-4 pb-10">
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((record) => (
              <EscrowRow key={record.id} record={record} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}