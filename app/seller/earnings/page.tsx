"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SellerSidebar from "@/components/seller/Sidebar";

interface SellerAccountProfile {
  id: string; name: string; email: string; phone?: string;
  bankName?: string; accountNumber?: string; accountName?: string; sellerStatus?: string;
}

interface Earning {
  id: string; sellerId: string; orderId: string; amount: number; commission: number;
  netAmount: number; status: "pending" | "available" | "withdrawn"; createdAt: string; description?: string;
}

interface Payout {
  id: string; sellerId: string; amount: number; bankName: string;
  accountNumber: string; accountName: string; status: string; createdAt: string;
}

interface Txn {
  id: string; kind: "sale" | "payout" | "other"; description: string;
  amount: number; fee: number; status: string; createdAt: string;
}

const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const time = d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `Today ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" }) + " " + time;
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  available: { label: "✓ Available", color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" },
  pending:   { label: "⏳ Pending", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  withdrawn: { label: "✓ Withdrawn", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
  completed: { label: "✓ Completed", color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" },
};

function TxnStatus({ status }: { status: string }) {
  const sc = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap"
      style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}>
      {sc.label}
    </span>
  );
}

export default function SellerEarningsPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<SellerAccountProfile | null>(null);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [available, setAvailable] = useState(0);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"transactions" | "payouts">("transactions");
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = async () => {
    try {
      const [profileRes, earningsRes] = await Promise.all([
        fetch("/api/seller/me"),
        fetch("/api/seller/earnings"),
      ]);
      const profileData = await profileRes.json();
      const earningsData = await earningsRes.json();
      if (!profileData.success || !profileData.data) {
        router.push("/seller/onboarding");
        return;
      }
      setSeller(profileData.data);
      if (earningsData.success && earningsData.data) {
        const d = earningsData.data;
        // Support both shapes: { earnings, payouts, available, pending } or a bare array
        if (Array.isArray(d)) {
          setEarnings(d);
          const avail = d.filter((e: Earning) => e.status === "available").reduce((s: number, e: Earning) => s + e.netAmount, 0);
          const pend = d.filter((e: Earning) => e.status === "pending").reduce((s: number, e: Earning) => s + e.netAmount, 0);
          setAvailable(avail);
          setPending(pend);
        } else {
          setEarnings(d.earnings || []);
          setPayouts(d.payouts || []);
          setAvailable(d.available || 0);
          setPending(d.pending || 0);
        }
      }
    } catch {
      setToast({ msg: "❌ Failed to load earnings", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const transactions: Txn[] = useMemo(() => {
    const saleTxns: Txn[] = earnings
      .filter((e) => e.netAmount >= 0)
      .map((e) => ({
        id: e.id, kind: "sale",
        description: e.description || `Sale — Order ${e.orderId}`,
        amount: e.amount, fee: e.commission, status: e.status, createdAt: e.createdAt,
      }));
    const payoutTxns: Txn[] = payouts.map((p) => ({
      id: p.id, kind: "payout",
      description: `Payout to ${p.bankName} ${p.accountNumber}`,
      amount: -p.amount, fee: 0, status: p.status, createdAt: p.createdAt,
    }));
    return [...saleTxns, ...payoutTxns].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [earnings, payouts]);

  const totalEarnings = earnings.filter((e) => e.netAmount >= 0).reduce((s, e) => s + e.netAmount, 0);
  const totalPayouts = payouts.reduce((s, p) => s + p.amount, 0);

  // Weekly chart: last 7 days of sales + payouts
  const week = useMemo(() => {
    const days: { label: string; sales: number; payouts: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toDateString();
      days.push({
        label: d.toLocaleDateString("en-NG", { weekday: "short" }),
        sales: earnings
          .filter((e) => e.netAmount >= 0 && new Date(e.createdAt).toDateString() === key)
          .reduce((s, e) => s + e.netAmount, 0),
        payouts: payouts
          .filter((p) => new Date(p.createdAt).toDateString() === key)
          .reduce((s, p) => s + p.amount, 0),
      });
    }
    return days;
  }, [earnings, payouts]);

  const weekTotal = week.reduce((s, d) => s + d.sales, 0);
  const maxBar = Math.max(...week.map((d) => d.sales + d.payouts), 1);

  // This month vs last month
  const monthStats = useMemo(() => {
    const now = new Date();
    const startThis = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startLast = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const sum = (from: number, to: number) =>
      earnings
        .filter((e) => e.netAmount >= 0)
        .filter((e) => { const t = new Date(e.createdAt).getTime(); return t >= from && t < to; })
        .reduce((s, e) => s + e.netAmount, 0);
    const thisMonth = sum(startThis, Date.now() + 1);
    const lastMonth = sum(startLast, startThis);
    const change = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;
    return { thisMonth, lastMonth, change };
  }, [earnings]);

  const withdraw = async () => {
    const amt = Number(amount.replace(/[^0-9]/g, ""));
    if (!amt || amt <= 0) return;
    if (amt > available) {
      setToast({ msg: `❌ Amount exceeds available balance (${naira(available)})`, type: "error" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/seller/earnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt }),
      });
      const data = await res.json();
      if (data.success) {
        setShowWithdraw(false);
        setAmount("");
        setToast({ msg: `✅ ${naira(amt)} withdrawn to ${seller?.bankName || "bank"}`, type: "success" });
        await loadData();
      } else {
        setToast({ msg: `❌ ${data.error || "Withdrawal failed"}`, type: "error" });
      }
    } catch {
      setToast({ msg: "❌ Withdrawal failed", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const bank = seller?.bankName
    ? { bank: seller.bankName, number: `****${(seller.accountNumber || "").slice(-4)}`, name: seller.accountName || seller.name }
    : null;

  const stats = [
    { label: "AVAILABLE BALANCE", value: available, color: "#16A34A", sub: "Ready to withdraw" },
    { label: "PENDING CLEARANCE", value: pending, color: "#D97706", sub: "Held in escrow" },
    { label: "TOTAL EARNINGS", value: totalEarnings, color: "#111827", sub: "All time (net)" },
    { label: "TOTAL PAYOUTS", value: totalPayouts, color: "#2563EB", sub: "Withdrawn to bank" },
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

      {/* Withdraw modal */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black/50 z-[500] flex items-center justify-center p-4" onClick={() => setShowWithdraw(false)}>
          <div className="bg-white rounded-[20px] p-7 max-w-[440px] w-full" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-extrabold text-[#111827] mb-1">💳 Withdraw funds</div>
            <div className="text-[13px] text-[#6B7280] mb-5">Transfer your available balance to your bank account</div>

            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[10px] px-3.5 py-3 mb-5">
              <div className="text-[11px] text-[#166534] font-semibold">Available balance</div>
              <div className="text-2xl font-extrabold text-[#16A34A]">{naira(available)}</div>
            </div>

            <div className="mb-5">
              <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Amount to withdraw</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#374151]">₦</span>
                <input
                  className="w-full pl-7 pr-3.5 py-2.5 border-[1.5px] border-[#E5E7EB] rounded-[10px] text-sm outline-none focus:border-[#F97316] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.1)] bg-white"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                  inputMode="numeric"
                />
              </div>
              <button onClick={() => setAmount(String(available))}
                className="mt-1.5 text-[11px] text-[#F97316] font-semibold bg-transparent border-none cursor-pointer">
                Withdraw all
              </button>
            </div>

            <div className="mb-5">
              <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Bank account</label>
              {bank ? (
                <div className="border-2 border-[#F97316] bg-[#FFF7ED] rounded-[10px] px-3.5 py-3 flex justify-between items-center">
                  <div>
                    <div className="text-[13px] font-bold text-[#111827]">{bank.bank}</div>
                    <div className="text-xs text-[#6B7280]">{bank.number} · {bank.name}</div>
                  </div>
                  <span className="text-[10px] font-bold text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] px-2 py-0.5 rounded-[10px]">Default</span>
                </div>
              ) : (
                <div className="border-2 border-dashed border-[#E5E7EB] rounded-[10px] px-3.5 py-4 text-xs text-[#6B7280] text-center">
                  No bank account on file — add one in Settings before withdrawing.
                </div>
              )}
            </div>

            <div className="flex gap-2.5">
              <button onClick={() => setShowWithdraw(false)} disabled={submitting}
                className="flex-1 py-3 text-sm font-semibold text-[#374151] border-[1.5px] border-[#E5E7EB] rounded-[10px] hover:border-[#F97316] hover:text-[#F97316] bg-white cursor-pointer disabled:opacity-50">
                Cancel
              </button>
              <button onClick={withdraw}
                disabled={submitting || !amount || Number(amount) <= 0 || Number(amount) > available || !bank}
                className="flex-[2] py-3 text-sm font-bold text-white bg-[#F97316] rounded-[10px] hover:bg-[#EA6C0A] cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? "Processing…" : `Withdraw ${amount ? naira(Number(amount)) : "₦0"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <SellerSidebar activeTab="earnings" seller={seller} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="lg:pl-[260px] min-h-screen">
        <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] h-16 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden bg-transparent border-none text-xl cursor-pointer p-1">☰</button>
            <h1 className="text-lg font-extrabold text-[#111827]">Earnings</h1>
          </div>
          <button onClick={() => setShowWithdraw(true)} disabled={available <= 0}
            className="bg-[#F97316] text-white rounded-[10px] px-5 py-2.5 text-[13px] font-bold hover:bg-[#EA6C0A] transition-all cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed">
            💳 Withdraw
          </button>
        </header>

        <div className="p-4 lg:p-6 max-w-[1100px]">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 bg-white border border-[#E5E7EB] rounded-[14px] animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {stats.map((s) => (
                  <div key={s.label} className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-5 hover:border-[#F97316] transition-all">
                    <div className="text-[11px] text-[#6B7280] font-semibold mb-1">{s.label}</div>
                    <div className="text-[24px] font-extrabold mb-1" style={{ color: s.color }}>{naira(s.value)}</div>
                    <div className="text-[11px] text-[#6B7280]">{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Chart + month card */}
              <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5 mb-6">
                <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-5">
                  <div className="flex justify-between items-center mb-5">
                    <div>
                      <div className="text-[15px] font-bold text-[#111827]">Revenue this week</div>
                      <div className="text-xs text-[#6B7280]">Net sales vs payouts</div>
                    </div>
                    <div className="text-xl font-extrabold text-[#F97316]">{naira(weekTotal)}</div>
                  </div>
                  <div className="flex items-end gap-2 h-[140px] px-1">
                    {week.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <div className="flex gap-0.5 items-end h-[110px]">
                          {d.sales > 0 && (
                            <div className="w-full max-w-4 rounded-t bg-[#F97316]" style={{ height: `${(d.sales / maxBar) * 100}%` }} title={`Sales ${naira(d.sales)}`} />
                          )}
                          {d.payouts > 0 && (
                            <div className="w-full max-w-4 rounded-t bg-[#2563EB]" style={{ height: `${(d.payouts / maxBar) * 100}%` }} title={`Payout ${naira(d.payouts)}`} />
                          )}
                        </div>
                        <div className="text-[11px] text-[#6B7280] font-semibold">{d.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-3 justify-center">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#F97316]" />
                      <span className="text-[11px] text-[#6B7280]">Sales</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#2563EB]" />
                      <span className="text-[11px] text-[#6B7280]">Payouts</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-5">
                  <div className="text-sm font-bold text-[#111827] mb-2.5">This month</div>
                  <div className="text-[26px] font-extrabold text-[#111827] mb-1">{naira(monthStats.thisMonth)}</div>
                  <div className="text-xs font-semibold mb-4" style={{ color: monthStats.change >= 0 ? "#16A34A" : "#DC2626" }}>
                    {monthStats.change >= 0 ? "↑" : "↓"} {Math.abs(monthStats.change).toFixed(1)}% vs last month
                  </div>
                  <div className="border-t border-[#E5E7EB] pt-3 flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#6B7280]">Platform fees (est. 8%)</span>
                      <span className="text-[#DC2626] font-semibold">{naira(Math.round(monthStats.thisMonth * 0.087))}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#6B7280]">Net earnings</span>
                      <span className="text-[#16A34A] font-bold">{naira(monthStats.thisMonth)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b-2 border-[#E5E7EB] mb-5">
                {([
                  { key: "transactions", label: "Transactions" },
                  { key: "payouts", label: "Payout History" },
                ] as const).map((tab) => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className="px-5 py-3 text-sm font-semibold border-b-2 -mb-[2px] cursor-pointer bg-transparent transition-all"
                    style={{
                      color: activeTab === tab.key ? "#F97316" : "#6B7280",
                      borderBottomColor: activeTab === tab.key ? "#F97316" : "transparent",
                    }}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "transactions" && (
                <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] overflow-hidden">
                  {transactions.length === 0 ? (
                    <div className="text-center py-14 text-sm text-[#6B7280]">
                      <div className="text-3xl mb-2">💰</div>No transactions yet
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[#F9FAFB] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                            <th className="text-left px-4 py-2.5">Transaction</th>
                            <th className="text-left px-4 py-2.5">Date</th>
                            <th className="text-right px-4 py-2.5">Amount</th>
                            <th className="text-right px-4 py-2.5">Fee</th>
                            <th className="text-right px-4 py-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map((txn) => (
                            <tr key={txn.id} className="border-t border-[#F3F4F6] hover:bg-[#F9FAFB]">
                              <td className="px-4 py-3.5">
                                <div className="font-semibold text-[#111827]">{txn.description}</div>
                                <div className="text-[11px] text-[#6B7280]">{txn.id}</div>
                              </td>
                              <td className="px-4 py-3.5 text-xs text-[#6B7280] whitespace-nowrap">{fmtDate(txn.createdAt)}</td>
                              <td className={`px-4 py-3.5 text-right font-bold whitespace-nowrap ${txn.amount < 0 ? "text-[#DC2626]" : "text-[#111827]"}`}>
                                {txn.amount < 0 ? "−" : "+"}{naira(Math.abs(txn.amount))}
                              </td>
                              <td className="px-4 py-3.5 text-right text-xs text-[#6B7280]">
                                {txn.fee > 0 ? naira(txn.fee) : "—"}
                              </td>
                              <td className="px-4 py-3.5 text-right"><TxnStatus status={txn.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "payouts" && (
                <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] overflow-hidden">
                  {payouts.length === 0 ? (
                    <div className="text-center py-14 text-sm text-[#6B7280]">
                      <div className="text-3xl mb-2">🏦</div>No payouts yet — click Withdraw to cash out.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[#F9FAFB] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                            <th className="text-left px-4 py-2.5">Payout</th>
                            <th className="text-left px-4 py-2.5">Date</th>
                            <th className="text-right px-4 py-2.5">Amount</th>
                            <th className="text-right px-4 py-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payouts.map((p) => (
                            <tr key={p.id} className="border-t border-[#F3F4F6] hover:bg-[#F9FAFB]">
                              <td className="px-4 py-3.5">
                                <div className="font-semibold text-[#111827]">{p.bankName} {p.accountNumber}</div>
                                <div className="text-[11px] text-[#6B7280]">{p.id} · {p.accountName}</div>
                              </td>
                              <td className="px-4 py-3.5 text-xs text-[#6B7280] whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                              <td className="px-4 py-3.5 text-right font-bold text-[#2563EB] whitespace-nowrap">{naira(p.amount)}</td>
                              <td className="px-4 py-3.5 text-right"><TxnStatus status={p.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
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
