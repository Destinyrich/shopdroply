"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SellerSidebar from "@/components/seller/Sidebar";

interface SellerAccountProfile {
  id: string; name: string; email: string; phone?: string;
  sellerTier?: string; createdAt?: string;
  storeBanner?: string; storeAbout?: string; storePolicies?: string; sellerStatus?: string;
}

interface Listing {
  id: string; title: string; price: number; type: "fixed" | "auction";
  category: string; status: string; views?: number; images: string[]; createdAt: string;
}

const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;
const inputCls = "w-full px-3.5 py-2.5 border-[1.5px] border-[#E5E7EB] rounded-[10px] text-sm outline-none focus:border-[#F97316] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.1)] bg-white";

const CATEGORY_ICONS: Record<string, string> = {
  "Phones & Tablets": "📱", "Fashion": "👗", "Home & Living": "🏠",
  "Electronics": "💻", "Vehicles & Parts": "🚗", "Beauty & Health": "💄",
  "Books & Media": "📚", "Sports & Fitness": "⚽", "Gaming": "🎮", "Kitchen & Food": "🍳",
};

export default function SellerStorefrontPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<SellerAccountProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ storeBanner: "", storeAbout: "", storePolicies: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = async () => {
    try {
      const res = await fetch("/api/seller/storefront");
      const data = await res.json();
      if (!data.success || !data.data) {
        router.push("/seller/onboarding");
        return;
      }
      setProfile(data.data.profile);
      setListings(data.data.listings || []);
      setForm({
        storeBanner: data.data.profile.storeBanner || "",
        storeAbout: data.data.profile.storeAbout || "",
        storePolicies: data.data.profile.storePolicies || "",
      });
    } catch {
      setToast({ msg: "❌ Failed to load storefront", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/seller/storefront", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setProfile((prev) => (prev ? { ...prev, ...form } : prev));
        setEditing(false);
        setToast({ msg: "✅ Storefront updated", type: "success" });
      } else {
        setToast({ msg: `❌ ${data.error || "Save failed"}`, type: "error" });
      }
    } catch {
      setToast({ msg: "❌ Failed to save", type: "error" });
    } finally {
      setSaving(false);
    }
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
        setForm((p) => ({ ...p, storeBanner: data.data.url }));
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

  const share = async () => {
    const url = `${window.location.origin}/store/${profile?.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast({ msg: "✅ Store link copied to clipboard", type: "success" });
    } catch {
      setToast({ msg: url, type: "success" });
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center text-[#6B7280]">
          <div className="text-3xl mb-2 animate-pulse">🏪</div>
          <div className="text-sm font-semibold">Loading storefront…</div>
        </div>
      </div>
    );
  }

  const totalViews = listings.reduce((s, l) => s + (l.views || 0), 0);
  const joined = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-NG", { month: "short", year: "numeric" })
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

      <SellerSidebar activeTab="storefront" seller={profile} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="lg:pl-[260px] min-h-screen">
        <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] h-16 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden bg-transparent border-none text-xl cursor-pointer p-1">☰</button>
            <h1 className="text-lg font-extrabold text-[#111827]">My Storefront</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={share}
              className="px-4 py-2 text-[13px] font-semibold text-[#374151] border-[1.5px] border-[#E5E7EB] rounded-[10px] hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all cursor-pointer bg-white">
              🔗 Share
            </button>
            {!editing ? (
              <button onClick={() => setEditing(true)}
                className="px-4 py-2 text-[13px] font-bold text-white bg-[#F97316] rounded-[10px] hover:bg-[#EA6C0A] transition-all cursor-pointer border-none">
                ✏️ Edit storefront
              </button>
            ) : (
              <>
                <button onClick={() => { setEditing(false); setForm({ storeBanner: profile.storeBanner || "", storeAbout: profile.storeAbout || "", storePolicies: profile.storePolicies || "" }); }}
                  className="px-4 py-2 text-[13px] font-semibold text-[#374151] border-[1.5px] border-[#E5E7EB] rounded-[10px] hover:border-[#F97316] hover:text-[#F97316] bg-white cursor-pointer">
                  Cancel
                </button>
                <button onClick={save} disabled={saving}
                  className="px-4 py-2 text-[13px] font-bold text-white bg-[#16A34A] rounded-[10px] hover:bg-[#15803D] cursor-pointer border-none disabled:opacity-50">
                  {saving ? "Saving…" : "💾 Save"}
                </button>
              </>
            )}
          </div>
        </header>

        <div className="max-w-[1000px]">
          {/* Banner */}
          <div className="h-[200px] relative bg-gradient-to-r from-[#F97316] to-[#EA580C]">
            {form.storeBanner && editing ? (
              <img src={form.storeBanner} alt="" className="w-full h-full object-cover" />
            ) : profile.storeBanner ? (
              <img src={profile.storeBanner} alt="" className="w-full h-full object-cover" />
            ) : null}
            {editing && (
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="absolute bottom-3 right-4 px-4 py-2 text-xs font-bold text-white bg-black/60 backdrop-blur rounded-[10px] hover:bg-black/80 cursor-pointer border-none disabled:opacity-50">
                {uploading ? "⏳ Uploading…" : "📤 Upload banner"}
              </button>
            )}
          </div>

          {/* Store header */}
          <div className="px-4 lg:px-6 pb-4 bg-white border-b border-[#E5E7EB]">
            <div className="flex items-end gap-4 -mt-10 mb-3 flex-wrap">
              <div className="w-20 h-20 rounded-2xl bg-[#F97316] border-4 border-white flex items-center justify-center text-white font-extrabold text-2xl shadow-lg">
                {profile.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl font-extrabold text-[#111827]">{profile.name}</span>
                  {profile.sellerTier && (
                    <span className="text-[10px] font-bold text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] px-2 py-0.5 rounded-[10px] capitalize">
                      ✓ {profile.sellerTier} seller
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#6B7280]">Member since {joined}{profile.phone ? ` · ${profile.phone}` : ""}</div>
              </div>
            </div>
            <div className="flex gap-6 text-sm flex-wrap">
              <div><span className="font-extrabold text-[#111827]">{listings.length}</span> <span className="text-[#6B7280]">active listings</span></div>
              <div><span className="font-extrabold text-[#111827]">{totalViews}</span> <span className="text-[#6B7280]">total views</span></div>
            </div>
          </div>

          <div className="p-4 lg:p-6 flex flex-col gap-5">
            {/* About */}
            <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-5">
              <div className="text-[15px] font-bold text-[#111827] mb-2.5">About this store</div>
              {editing ? (
                <textarea
                  className={`${inputCls} resize-y min-h-[100px]`}
                  placeholder="Tell buyers what you sell, your quality standards, delivery times…"
                  value={form.storeAbout}
                  onChange={(e) => setForm((p) => ({ ...p, storeAbout: e.target.value }))}
                  rows={4}
                  maxLength={1000}
                />
              ) : (
                <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap">
                  {profile.storeAbout || "No description yet — click Edit storefront to tell buyers about your store."}
                </p>
              )}
            </div>

            {/* Policies */}
            <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-5">
              <div className="text-[15px] font-bold text-[#111827] mb-2.5">Store policies</div>
              {editing ? (
                <textarea
                  className={`${inputCls} resize-y min-h-[90px]`}
                  placeholder="Returns, delivery areas, payment terms…"
                  value={form.storePolicies}
                  onChange={(e) => setForm((p) => ({ ...p, storePolicies: e.target.value }))}
                  rows={3}
                  maxLength={1000}
                />
              ) : (
                <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap">
                  {profile.storePolicies || "No policies set."}
                </p>
              )}
            </div>

            {/* Listings */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="text-[15px] font-bold text-[#111827]">Active listings ({listings.length})</div>
                <Link href="/seller/listings/new" className="text-xs font-bold text-[#F97316] hover:underline no-underline">+ Add listing</Link>
              </div>
              {listings.length === 0 ? (
                <div className="bg-white border border-[#E5E7EB] rounded-[14px] text-center py-12 text-sm text-[#6B7280]">
                  <div className="text-3xl mb-2">📦</div>No active listings — activate a listing to show it in your store.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {listings.map((l) => (
                    <Link key={l.id} href={`/seller/listings/${l.id}`}
                      className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] overflow-hidden hover:border-[#F97316] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all no-underline">
                      <div className="aspect-[4/3] bg-[#F9FAFB] flex items-center justify-center text-5xl relative border-b border-[#E5E7EB]">
                        {l.images?.[0] ? <img src={l.images[0]} alt="" className="w-full h-full object-cover" /> : (CATEGORY_ICONS[l.category] || "📦")}
                        <span className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-[10px] border"
                          style={l.type === "auction"
                            ? { color: "#7C3AED", background: "#F5F3FF", borderColor: "#DDD6FE" }
                            : { color: "#F97316", background: "#FFF7ED", borderColor: "#FED7AA" }}>
                          {l.type === "auction" ? "🔨 Auction" : "🏷️ Fixed"}
                        </span>
                      </div>
                      <div className="p-3.5">
                        <div className="text-[13px] font-semibold text-[#111827] truncate mb-1">{l.title}</div>
                        <div className="text-base font-extrabold text-[#111827]">{naira(l.price)}</div>
                        <div className="text-[11px] text-[#6B7280] mt-1">👁 {l.views || 0} views</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
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
