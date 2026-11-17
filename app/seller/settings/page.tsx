"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SellerSidebar from "@/components/seller/Sidebar";

interface SellerAccountProfile {
  id: string; name: string; email: string; phone?: string; dob?: string;
  sellerTier?: string; createdAt?: string; sellerStatus?: string;
  bankName?: string; accountNumber?: string; accountName?: string;
  storeBanner?: string; storeAbout?: string; storePolicies?: string;
}

type Tab = "profile" | "store" | "bank";

const inputCls = "w-full px-3.5 py-2.5 border-[1.5px] border-[#E5E7EB] rounded-[10px] text-sm outline-none focus:border-[#F97316] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.1)] bg-white";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "profile", label: "Profile", icon: "👤" },
  { key: "store", label: "Store", icon: "🏪" },
  { key: "bank", label: "Bank & Payouts", icon: "🏦" },
];

export default function SellerSettingsPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<SellerAccountProfile | null>(null);
  const [tab, setTab] = useState<Tab>("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [profileForm, setProfileForm] = useState({ name: "", phone: "", dob: "" });
  const [storeForm, setStoreForm] = useState({ storeAbout: "", storePolicies: "", storeBanner: "" });
  const [bankForm, setBankForm] = useState({ bankName: "", accountNumber: "", accountName: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = async () => {
    try {
      const res = await fetch("/api/seller/me");
      const data = await res.json();
      if (!data.success || !data.data) {
        router.push("/seller/onboarding");
        return;
      }
      const p: SellerAccountProfile = data.data;
      setSeller(p);
      setProfileForm({ name: p.name || "", phone: p.phone || "", dob: p.dob || "" });
      setStoreForm({ storeAbout: p.storeAbout || "", storePolicies: p.storePolicies || "", storeBanner: p.storeBanner || "" });
      setBankForm({ bankName: p.bankName || "", accountNumber: p.accountNumber || "", accountName: p.accountName || "" });
    } catch {
      setToast({ msg: "❌ Failed to load settings", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const save = async (payload: Record<string, string>) => {
    setSaving(true);
    setErrors({});
    try {
      const res = await fetch("/api/seller/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSeller((prev) => (prev ? { ...prev, ...payload } : prev));
        setToast({ msg: "✅ Settings saved", type: "success" });
      } else {
        setToast({ msg: `❌ ${data.error || "Save failed"}`, type: "error" });
      }
    } catch {
      setToast({ msg: "❌ Failed to save", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = () => {
    const e: Record<string, string> = {};
    if (!profileForm.name.trim()) e.name = "Name is required";
    if (profileForm.phone && !/^\+?[0-9\s-]{7,15}$/.test(profileForm.phone)) e.phone = "Enter a valid phone number";
    if (Object.keys(e).length) { setErrors(e); return; }
    save({ name: profileForm.name.trim(), phone: profileForm.phone.trim(), dob: profileForm.dob });
  };

  const saveBank = () => {
    const e: Record<string, string> = {};
    if (!bankForm.bankName.trim()) e.bankName = "Bank name is required";
    if (!/^\d{10}$/.test(bankForm.accountNumber)) e.accountNumber = "Account number must be exactly 10 digits";
    if (!bankForm.accountName.trim()) e.accountName = "Account name is required";
    if (Object.keys(e).length) { setErrors(e); return; }
    save({
      bankName: bankForm.bankName.trim(),
      accountNumber: bankForm.accountNumber.trim(),
      accountName: bankForm.accountName.trim(),
    });
  };

  const uploadBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success && data.data?.url) {
        setStoreForm((p) => ({ ...p, storeBanner: data.data.url }));
      } else {
        setToast({ msg: `❌ ${data.error || "Upload failed"}`, type: "error" });
      }
    } catch {
      setToast({ msg: "❌ Upload failed", type: "error" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const err = (key: string) => errors[key]
    ? <div className="text-xs text-[#DC2626] mt-1">⚠️ {errors[key]}</div>
    : null;

  if (loading || !seller) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center text-[#6B7280]">
          <div className="text-3xl mb-2 animate-pulse">⚙️</div>
          <div className="text-sm font-semibold">Loading settings…</div>
        </div>
      </div>
    );
  }

  const joined = seller.createdAt
    ? new Date(seller.createdAt).toLocaleDateString("en-NG", { month: "long", year: "numeric" })
    : "—";

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

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadBanner} />

      <SellerSidebar activeTab="settings" seller={seller} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="lg:pl-[260px] min-h-screen">
        <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] h-16 flex items-center gap-3 px-4 lg:px-6">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden bg-transparent border-none text-xl cursor-pointer p-1">☰</button>
          <h1 className="text-lg font-extrabold text-[#111827]">Settings</h1>
        </header>

        <div className="p-4 lg:p-6 max-w-[760px]">
          {/* Account summary */}
          <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-5 mb-5 flex items-center gap-4 flex-wrap">
            <div className="w-14 h-14 rounded-full bg-[#F97316] flex items-center justify-center text-white font-extrabold text-lg">
              {seller.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-[180px]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-extrabold text-[#111827]">{seller.name}</span>
                {seller.sellerTier && (
                  <span className="text-[10px] font-bold text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] px-2 py-0.5 rounded-[10px] capitalize">
                    ✓ {seller.sellerTier} seller
                  </span>
                )}
              </div>
              <div className="text-xs text-[#6B7280]">{seller.email} · Member since {joined}</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b-2 border-[#E5E7EB] mb-5">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => { setTab(t.key); setErrors({}); }}
                className="px-5 py-3 text-sm font-semibold border-b-2 -mb-[2px] cursor-pointer bg-transparent transition-all"
                style={{
                  color: tab === t.key ? "#F97316" : "#6B7280",
                  borderBottomColor: tab === t.key ? "#F97316" : "transparent",
                }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ── Profile ── */}
          {tab === "profile" && (
            <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-6">
              <div className="text-[15px] font-bold text-[#111827] mb-5">Personal information</div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Full name *</label>
                  <input className={inputCls} style={errors.name ? { borderColor: "#DC2626" } : undefined}
                    value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} />
                  {err("name")}
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Email</label>
                  <input className={`${inputCls} bg-[#F9FAFB] text-[#6B7280]`} value={seller.email} readOnly />
                  <div className="text-[11px] text-[#9CA3AF] mt-1">Email cannot be changed.</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Phone</label>
                    <input className={inputCls} style={errors.phone ? { borderColor: "#DC2626" } : undefined}
                      value={profileForm.phone} placeholder="+2348012345678"
                      onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} />
                    {err("phone")}
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Date of birth</label>
                    <input type="date" className={inputCls} value={profileForm.dob}
                      onChange={(e) => setProfileForm((p) => ({ ...p, dob: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button onClick={saveProfile} disabled={saving}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-[#F97316] rounded-[10px] hover:bg-[#EA6C0A] cursor-pointer border-none disabled:opacity-50">
                    {saving ? "Saving…" : "💾 Save profile"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Store ── */}
          {tab === "store" && (
            <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-6">
              <div className="text-[15px] font-bold text-[#111827] mb-5">Storefront</div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Store banner</label>
                  <div className="h-32 rounded-[12px] bg-gradient-to-r from-[#F97316] to-[#EA580C] relative overflow-hidden border-[1.5px] border-[#E5E7EB]">
                    {storeForm.storeBanner && <img src={storeForm.storeBanner} alt="" className="w-full h-full object-cover" />}
                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="absolute bottom-2.5 right-2.5 px-3.5 py-1.5 text-xs font-bold text-white bg-black/60 backdrop-blur rounded-lg hover:bg-black/80 cursor-pointer border-none disabled:opacity-50">
                      {uploading ? "⏳ Uploading…" : "📤 Upload banner"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">About your store</label>
                  <textarea className={`${inputCls} resize-y min-h-[100px]`} rows={4} maxLength={1000}
                    placeholder="What you sell, quality standards, delivery times…"
                    value={storeForm.storeAbout}
                    onChange={(e) => setStoreForm((p) => ({ ...p, storeAbout: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Store policies</label>
                  <textarea className={`${inputCls} resize-y min-h-[90px]`} rows={3} maxLength={1000}
                    placeholder="Returns, delivery areas, payment terms…"
                    value={storeForm.storePolicies}
                    onChange={(e) => setStoreForm((p) => ({ ...p, storePolicies: e.target.value }))} />
                </div>
                <div className="flex justify-between items-center pt-1 flex-wrap gap-2">
                  <Link href="/seller/storefront" className="text-xs font-bold text-[#F97316] hover:underline no-underline">
                    → Preview my storefront
                  </Link>
                  <button onClick={() => save(storeForm)} disabled={saving}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-[#F97316] rounded-[10px] hover:bg-[#EA6C0A] cursor-pointer border-none disabled:opacity-50">
                    {saving ? "Saving…" : "💾 Save store"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Bank ── */}
          {tab === "bank" && (
            <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-6">
              <div className="text-[15px] font-bold text-[#111827] mb-1">Payout account</div>
              <div className="text-xs text-[#6B7280] mb-5">
                Withdrawals from Earnings are sent to this account (NIP transfer, usually within 24 hours).
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Bank name *</label>
                  <input className={inputCls} style={errors.bankName ? { borderColor: "#DC2626" } : undefined}
                    placeholder="e.g. Kuda Bank, GTBank, Zenith"
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm((p) => ({ ...p, bankName: e.target.value }))} />
                  {err("bankName")}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Account number *</label>
                    <input className={inputCls} style={errors.accountNumber ? { borderColor: "#DC2626" } : undefined}
                      placeholder="10-digit NUBAN" inputMode="numeric" maxLength={10}
                      value={bankForm.accountNumber}
                      onChange={(e) => setBankForm((p) => ({ ...p, accountNumber: e.target.value.replace(/[^0-9]/g, "") }))} />
                    {err("accountNumber")}
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Account name *</label>
                    <input className={inputCls} style={errors.accountName ? { borderColor: "#DC2626" } : undefined}
                      placeholder="As shown on the account"
                      value={bankForm.accountName}
                      onChange={(e) => setBankForm((p) => ({ ...p, accountName: e.target.value }))} />
                    {err("accountName")}
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button onClick={saveBank} disabled={saving}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-[#F97316] rounded-[10px] hover:bg-[#EA6C0A] cursor-pointer border-none disabled:opacity-50">
                    {saving ? "Saving…" : "💾 Save bank account"}
                  </button>
                </div>
              </div>
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
