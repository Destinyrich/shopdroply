"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/Sidebar";

/* ─── Types ─────────────────────────────────────────────────────── */
interface KycUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  isVerified: boolean;
  role?: string;
  sellerTier?: "individual" | "verified" | "business";
  sellerStatus?: "pending" | "approved" | "rejected";
  sellerOnboardingAt?: string;
  kycRejectionReason?: string;
  nin?: string;
  bvn?: string;
  accountStatus?: "active" | "suspended";
}

interface KycDetail {
  user: KycUser & { bankName?: string; accountNumber?: string; accountName?: string };
  orderCount: number;
  totalSpent: number;
}

const REJECT_REASONS = [
  "Invalid or unreadable NIN document",
  "NIN / BVN details mismatch",
  "Name mismatch with bank account",
  "Applicant under 18 years old",
  "Duplicate application",
  "Other",
];

/* ─── Helpers ───────────────────────────────────────────────────── */
const TIER_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  individual: { label: "👤 Individual · NIN only", color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB" },
  verified:   { label: "✅ Verified · NIN + BVN", color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" },
  business:   { label: "🏢 Business · CAC + BVN", color: "#F97316", bg: "#FFF7ED", border: "#FED7AA" },
};

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—";

const daysWaiting = (iso?: string) =>
  iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)) : 0;

const initials = (name: string) =>
  name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "??";

/* ─── Toast ─────────────────────────────────────────────────────── */
function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[400] animate-[fadeUp_0.3s_ease_both]">
      <div className={`px-5 py-3 rounded-[10px] text-sm font-semibold shadow-lg border ${
        type === "success" ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]" : "bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]"
      }`}>
        {msg}
      </div>
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────────── */
function StatCard({ label, value, icon, color, delay }: {
  label: string; value: string; icon: string; color: string; delay: number;
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5 transition-all hover:border-[#F97316] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] animate-[fadeUp_0.35s_ease_both]"
      style={{ animationDelay: `${delay * 0.07}s` }}>
      <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-lg mb-3" style={{ background: color + "15", color }}>
        {icon}
      </div>
      <div className="text-2xl font-extrabold text-[#111827] mb-1">{value}</div>
      <div className="text-xs text-[#6B7280] font-medium">{label}</div>
    </div>
  );
}

/* ─── Review Modal ──────────────────────────────────────────────── */
function ReviewModal({ userId, onClose, onDecide, acting }: {
  userId: string;
  onClose: () => void;
  onDecide: (id: string, action: "approve" | "reject", reason?: string) => Promise<boolean>;
  acting: boolean;
}) {
  const [detail, setDetail] = useState<KycDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonOther, setReasonOther] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}`);
        const data = await res.json();
        if (data.success) setDetail(data.data);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const u = detail?.user;
  const finalReason = reason === "Other" ? reasonOther.trim() : reason;
  const canReject = finalReason.length > 3;

  const checklist = u ? [
    { label: "Email address provided", ok: !!u.email },
    { label: "Phone number provided", ok: !!u.phone },
    { label: "Email verified", ok: !!u.isVerified },
    { label: "NIN submitted", ok: !!u.nin },
    { label: "BVN submitted", ok: !!u.bvn || u.sellerTier === "individual" },
    { label: "Payout bank account", ok: !!u.bankName },
  ] : [];

  return (
    <div className="fixed inset-0 bg-black/50 z-[500] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[20px] max-w-[560px] w-full max-h-[90vh] overflow-y-auto animate-[scaleIn_0.3s_ease_both]" onClick={(e) => e.stopPropagation()}>
        {loading || !u ? (
          <div className="p-8 animate-pulse space-y-4">
            <div className="h-16 w-16 bg-[#E5E7EB] rounded-full" />
            <div className="h-6 w-48 bg-[#E5E7EB] rounded" />
            <div className="h-4 w-full bg-[#E5E7EB] rounded" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-6 border-b border-[#E5E7EB]">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-[#F97316] text-white flex items-center justify-center text-lg font-extrabold shrink-0">
                  {initials(u.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-extrabold text-[#111827]">{u.name}</div>
                  <div className="text-[13px] text-[#6B7280] truncate">{u.email}</div>
                  <div className="text-[12px] text-[#9CA3AF]">{u.phone || "No phone"} · Applied {fmtDate(u.sellerOnboardingAt)} ({daysWaiting(u.sellerOnboardingAt)}d ago)</div>
                </div>
                <button onClick={onClose} className="bg-transparent border-none text-xl cursor-pointer text-[#9CA3AF] hover:text-[#111827]">✕</button>
              </div>
              <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold border"
                style={(() => { const t = TIER_META[u.sellerTier || "individual"]; return { color: t.color, background: t.bg, borderColor: t.border }; })()}>
                {TIER_META[u.sellerTier || "individual"]?.label}
              </span>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {/* Checklist */}
              <div>
                <div className="text-[13px] font-bold text-[#111827] mb-2">Verification checklist</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {checklist.map((c) => (
                    <div key={c.label} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] border text-[12px] font-semibold ${
                      c.ok ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]" : "bg-[#F9FAFB] border-[#F3F4F6] text-[#9CA3AF]"
                    }`}>
                      <span>{c.ok ? "✅" : "⬜"}</span> {c.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Identity docs */}
              <div>
                <div className="text-[13px] font-bold text-[#111827] mb-2">Identity documents</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-[10px] p-3">
                    <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide">NIN</div>
                    <div className="font-semibold text-[#374151] text-[13px]">{u.nin || "—"}</div>
                  </div>
                  <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-[10px] p-3">
                    <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide">BVN</div>
                    <div className="font-semibold text-[#374151] text-[13px]">{u.bvn || "—"}</div>
                  </div>
                </div>
                {u.bankName && (
                  <div className="mt-2 bg-[#F9FAFB] border border-[#F3F4F6] rounded-[10px] p-3">
                    <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide">Payout account</div>
                    <div className="font-semibold text-[#374151] text-[13px]">{u.bankName} · {u.accountNumber} · {u.accountName}</div>
                  </div>
                )}
                <div className="mt-2 text-[11px] text-[#9CA3AF] leading-relaxed">
                  ⚠️ Full NIN/BVN verification against NIMC/BVN APIs happens via your Prembly/Smile Identity integration at onboarding. This screen reviews the submitted application.
                </div>
              </div>

              {/* Decision */}
              {!rejectMode ? (
                <div className="flex flex-col gap-2 border-t border-[#F3F4F6] pt-4">
                  <div className="flex gap-2">
                    <button
                      disabled={acting}
                      onClick={() => {
                        if (!confirming) { setConfirming(true); return; }
                        onDecide(u.id, "approve");
                      }}
                      className={`flex-1 py-3 rounded-[10px] text-[13px] font-bold text-white transition-all cursor-pointer border-none disabled:opacity-50 ${
                        confirming ? "bg-[#15803D]" : "bg-[#16A34A] hover:bg-[#15803D]"
                      }`}
                    >
                      {confirming ? "⚠️ Click again to confirm approval" : "✅ Approve verification"}
                    </button>
                    <button
                      disabled={acting}
                      onClick={() => setRejectMode(true)}
                      className="flex-1 py-3 rounded-[10px] text-[13px] font-bold bg-[#FEF2F2] text-[#DC2626] border-[1.5px] border-[#FECACA] hover:bg-[#DC2626] hover:text-white transition-all cursor-pointer disabled:opacity-50"
                    >
                      ❌ Decline
                    </button>
                  </div>
                  {confirming && (
                    <button onClick={() => setConfirming(false)} className="text-[11px] text-[#9CA3AF] bg-transparent border-none cursor-pointer hover:text-[#6B7280]">
                      Cancel confirmation
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3 border-t border-[#F3F4F6] pt-4">
                  <div className="text-[13px] font-bold text-[#111827]">Reason for declining</div>
                  <div className="flex flex-wrap gap-2">
                    {REJECT_REASONS.map((r) => (
                      <button
                        key={r}
                        onClick={() => setReason(r)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold border-[1.5px] cursor-pointer transition-all ${
                          reason === r
                            ? "bg-[#FEF2F2] text-[#DC2626] border-[#DC2626]"
                            : "bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#DC2626] hover:text-[#DC2626]"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  {reason === "Other" && (
                    <textarea
                      value={reasonOther}
                      onChange={(e) => setReasonOther(e.target.value)}
                      placeholder="Describe the issue…"
                      rows={2}
                      className="w-full px-3.5 py-2.5 border-[1.5px] border-[#E5E7EB] rounded-[10px] text-sm outline-none bg-white focus:border-[#F97316] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.1)] transition-all resize-vertical"
                    />
                  )}
                  <div className="flex gap-2">
                    <button
                      disabled={acting || !canReject}
                      onClick={() => onDecide(u.id, "reject", finalReason)}
                      className="flex-1 py-3 rounded-[10px] text-[13px] font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] transition-all cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      🚫 Decline application
                    </button>
                    <button
                      onClick={() => { setRejectMode(false); setReason(""); setReasonOther(""); }}
                      className="px-5 py-3 rounded-[10px] text-[13px] font-semibold bg-white text-[#374151] border-[1.5px] border-[#E5E7EB] hover:border-[#F97316] hover:text-[#F97316] transition-all cursor-pointer"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Skeleton ──────────────────────────────────────────────────── */
function SkeletonKyc() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-8 w-56 bg-[#E5E7EB] rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-white border border-[#E5E7EB] rounded-[14px]" />
        ))}
      </div>
      <div className="h-80 bg-white border border-[#E5E7EB] rounded-[14px]" />
    </div>
  );
}

/* ─── Main Export ───────────────────────────────────────────────── */
export default function AdminKycPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("kyc");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [queue, setQueue] = useState<KycUser[]>([]);
  const [history, setHistory] = useState<KycUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"queue" | "history">("queue");
  const [modalUserId, setModalUserId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadKyc();
  }, []);

  const loadKyc = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/kyc");
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (res.status === 403) { router.push("/"); return; }
      const data = await res.json();
      if (data.success) {
        setQueue(data.data.queue);
        setHistory(data.data.history);
      } else {
        setToast({ msg: `❌ ${data.error || "Failed to load KYC queue"}`, type: "error" });
      }
    } catch {
      setToast({ msg: "❌ Failed to load KYC queue", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDecide = async (id: string, action: "approve" | "reject", reason?: string): Promise<boolean> => {
    setActing(true);
    try {
      const res = await fetch(`/api/admin/kyc/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (data.success) {
        setToast({
          msg: action === "approve" ? "🎉 Seller approved — badge applied" : "❌ Application declined",
          type: action === "approve" ? "success" : "error",
        });
        const decided = queue.find((u) => u.id === id);
        setQueue((prev) => prev.filter((u) => u.id !== id));
        if (decided) {
          setHistory((prev) => [
            { ...decided, sellerStatus: action === "approve" ? "approved" : "rejected", kycRejectionReason: reason },
            ...prev,
          ]);
        }
        setModalUserId(null);
        return true;
      }
      setToast({ msg: `❌ ${data.error || "Action failed"}`, type: "error" });
      return false;
    } catch {
      setToast({ msg: "❌ Action failed", type: "error" });
      return false;
    } finally {
      setActing(false);
    }
  };

  const stats = useMemo(() => [
    { label: "Awaiting review", value: queue.length.toString(), icon: "⏳", color: "#D97706" },
    { label: "Approved sellers", value: history.filter((u) => u.sellerStatus === "approved").length.toString(), icon: "✅", color: "#16A34A" },
    { label: "Declined", value: history.filter((u) => u.sellerStatus === "rejected").length.toString(), icon: "❌", color: "#DC2626" },
    { label: "NIN-only in queue", value: queue.filter((u) => u.sellerTier === "individual" || !u.sellerTier).length.toString(), icon: "🪪", color: "#2563EB" },
  ], [queue, history]);

  const list = view === "queue" ? queue : history;

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {modalUserId && (
        <ReviewModal userId={modalUserId} onClose={() => setModalUserId(null)} onDecide={handleDecide} acting={acting} />
      )}

      <AdminSidebar activeTab={activeTab} admin={{ id: "", email: "", name: "Super Admin", role: "admin" }} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="lg:pl-[260px] min-h-screen">
        <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] h-16 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden bg-transparent border-none text-xl cursor-pointer p-1">☰</button>
            <h1 className="text-lg font-extrabold text-[#111827]">Seller KYC</h1>
            {queue.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-white bg-[#D97706] px-2.5 py-0.5 rounded-full font-bold">
                {queue.length} pending
              </span>
            )}
          </div>
        </header>

        {loading ? (
          <SkeletonKyc />
        ) : (
          <div className="p-4 lg:p-6 max-w-[1200px]">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {stats.map((s, i) => (
                <StatCard key={i} {...s} delay={i} />
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-0 border-b-2 border-[#E5E7EB] mb-4 overflow-x-auto">
              {([
                { key: "queue", label: "Review queue" },
                { key: "history", label: "Decision history" },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setView(t.key)}
                  className="px-5 py-3 text-[13px] font-semibold border-b-2 -mb-[2px] whitespace-nowrap cursor-pointer bg-transparent transition-all"
                  style={{
                    color: view === t.key ? "#F97316" : "#6B7280",
                    borderBottomColor: view === t.key ? "#F97316" : "transparent",
                  }}
                >
                  {t.label}
                  <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    view === t.key ? "bg-[#F97316] text-white" : "bg-[#F9FAFB] text-[#6B7280] border border-[#E5E7EB]"
                  }`}>
                    {t.key === "queue" ? queue.length : history.length}
                  </span>
                </button>
              ))}
            </div>

            {/* List */}
            <div className="bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden">
              <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_1fr_100px] gap-4 px-4 py-2.5 bg-[#F9FAFB] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                <div>Applicant</div><div>Tier</div><div>Documents</div><div>{view === "queue" ? "Waiting" : "Decision"}</div><div className="text-right">Action</div>
              </div>

              {list.length === 0 && (
                <div className="text-center py-14 text-sm text-[#6B7280]">
                  <div className="text-3xl mb-2">{view === "queue" ? "🎉" : "📋"}</div>
                  {view === "queue" ? "Queue is clear — no applications awaiting review" : "No decisions yet"}
                </div>
              )}

              {list.map((u, i) => {
                const tier = TIER_META[u.sellerTier || "individual"];
                const waiting = daysWaiting(u.sellerOnboardingAt);
                return (
                  <div key={u.id}
                    className="grid grid-cols-1 md:grid-cols-[2fr_1.2fr_1fr_1fr_100px] gap-2 md:gap-4 px-4 py-3.5 items-center border-b border-[#F3F4F6] last:border-b-0 hover:bg-[#F9FAFB] transition-colors animate-[fadeUp_0.3s_ease_both]"
                    style={{ animationDelay: `${i * 0.03}s` }}>
                    {/* Applicant */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#F97316] text-white flex items-center justify-center text-xs font-extrabold shrink-0">
                        {initials(u.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-[#111827] truncate">{u.name}</div>
                        <div className="text-[11px] text-[#9CA3AF] truncate">{u.email}</div>
                      </div>
                    </div>

                    {/* Tier */}
                    <div>
                      <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold border" style={{ color: tier.color, background: tier.bg, borderColor: tier.border }}>
                        {tier.label}
                      </span>
                    </div>

                    {/* Documents */}
                    <div className="flex gap-1.5 text-[11px] font-bold">
                      <span className={`px-2 py-0.5 rounded-full border ${u.nin ? "text-[#16A34A] bg-[#F0FDF4] border-[#BBF7D0]" : "text-[#9CA3AF] bg-[#F9FAFB] border-[#E5E7EB]"}`}>NIN {u.nin ? "✓" : "✗"}</span>
                      <span className={`px-2 py-0.5 rounded-full border ${u.bvn ? "text-[#16A34A] bg-[#F0FDF4] border-[#BBF7D0]" : "text-[#9CA3AF] bg-[#F9FAFB] border-[#E5E7EB]"}`}>BVN {u.bvn ? "✓" : "✗"}</span>
                    </div>

                    {/* Waiting / decision */}
                    <div className="text-[12px]">
                      {view === "queue" ? (
                        <span className={`font-bold ${waiting >= 3 ? "text-[#DC2626]" : waiting >= 1 ? "text-[#D97706]" : "text-[#16A34A]"}`}>
                          {waiting === 0 ? "Today" : `${waiting}d`}
                        </span>
                      ) : (
                        <div>
                          <span className={`font-bold ${u.sellerStatus === "approved" ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                            {u.sellerStatus === "approved" ? "✅ Approved" : "❌ Declined"}
                          </span>
                          {u.kycRejectionReason && (
                            <div className="text-[10px] text-[#9CA3AF] truncate max-w-[160px]" title={u.kycRejectionReason}>
                              {u.kycRejectionReason}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    <div className="md:text-right">
                      <button
                        onClick={() => setModalUserId(u.id)}
                        className="bg-white border-[1.5px] border-[#E5E7EB] text-[#374151] rounded-[10px] px-3 py-1.5 text-[11px] font-bold hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all cursor-pointer"
                      >
                        {view === "queue" ? "🔍 Review" : "👁 View"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-[12px] p-4 text-[12px] text-[#1E40AF] leading-relaxed">
              ℹ️ <strong>Review SLA:</strong> aim to review applications within 24–48 hours — sellers can&apos;t list until approved. Approving grants the verified badge (NIN+BVN tiers) or basic badge (NIN-only). Declined applicants are notified with the reason and can re-apply after correcting the issue.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}