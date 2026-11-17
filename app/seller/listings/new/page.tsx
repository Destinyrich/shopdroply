"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SellerSidebar from "@/components/seller/Sidebar";

interface Category {
  id: string;
  name: string;
  icon: string;
  commissionRate: number;
}

interface SellerProfile {
  id: string;
  name: string;
  email: string;
  sellerStatus?: string;
}

const CONDITIONS = ["new", "used", "refurbished"];
const SHIPPING_METHODS = ["GIG Logistics", "Fez Delivery", "Kwik Delivery", "DHL Nigeria", "Pickup"];
const EMOJI_IMAGES = ["📱", "👗", "💻", "🚗", "💄", "📚", "⚽", "🎮", "🍳", "📺", "👟", "👔", "🧹", "📦", "💎"];

export default function CreateListingPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    type: "fixed" as "fixed" | "auction",
    category: "",
    condition: "new",
    images: [] as string[],
    shippingFee: "",
    shippingMethod: "GIG Logistics",
    endTime: "",
    reservePrice: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileRes, catRes] = await Promise.all([
        fetch("/api/seller/me"),
        fetch("/api/categories"),
      ]);
      const profileData = await profileRes.json();
      const catData = await catRes.json();

      if (!profileData.success || !profileData.data) {
        router.push("/seller/onboarding");
        return;
      }
      setSeller(profileData.data);
      if (catData.success) setCategories(catData.data);
    } catch {
      setToast({ msg: "❌ Failed to load data", type: "error" });
    }
  };

  const updateForm = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleImage = (emoji: string) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.includes(emoji)
        ? prev.images.filter((i) => i !== emoji)
        : [...prev.images, emoji].slice(0, 6),
    }));
  };

  const validate = () => {
    if (!form.title.trim()) return "Title is required";
    if (!form.price || Number(form.price) <= 0) return "Valid price is required";
    if (!form.category) return "Category is required";
    if (form.type === "auction" && !form.endTime) return "End time is required for auctions";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      setToast({ msg: `❌ ${error}`, type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/seller/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          price: Number(form.price),
          type: form.type,
          category: form.category,
          condition: form.condition,
          images: form.images.length > 0 ? form.images : ["📦"],
          shippingFee: Number(form.shippingFee) || 0,
          shippingMethod: form.shippingMethod,
          endTime: form.type === "auction" ? new Date(form.endTime).toISOString() : undefined,
          reservePrice: form.type === "auction" && form.reservePrice ? Number(form.reservePrice) : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ msg: "✅ Listing created successfully!", type: "success" });
        setTimeout(() => router.push("/seller/listings"), 1200);
      } else {
        setToast({ msg: `❌ ${data.error || "Failed to create listing"}`, type: "error" });
      }
    } catch {
      setToast({ msg: "❌ Network error", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategory = categories.find((c) => c.name === form.category);
  const commissionRate = selectedCategory ? Math.round(selectedCategory.commissionRate * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-[10px] text-sm font-semibold shadow-lg border animate-[fadeUp_0.3s_ease_both]"
          style={{ background: toast.type === "success" ? "#F0FDF4" : "#FEF2F2", borderColor: toast.type === "success" ? "#BBF7D0" : "#FECACA", color: toast.type === "success" ? "#16A34A" : "#DC2626" }}>
          {toast.msg}
        </div>
      )}

      <SellerSidebar activeTab="listings" seller={seller} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="lg:pl-[260px] min-h-screen">
        <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] h-16 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden bg-transparent border-none text-xl cursor-pointer p-1">☰</button>
            <h1 className="text-lg font-extrabold text-[#111827]">Create Listing</h1>
          </div>
          <Link href="/seller/listings" className="text-[13px] font-semibold text-[#6B7280] hover:text-[#F97316] no-underline">
            ← Back to listings
          </Link>
        </header>

        <div className="p-4 lg:p-6 max-w-[800px] mx-auto">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Type toggle */}
            <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-4">
              <label className="block text-[12px] font-bold text-[#111827] mb-3 uppercase tracking-wider">Listing type</label>
              <div className="flex gap-2">
                {(["fixed", "auction"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => updateForm("type", t)}
                    className={`flex-1 py-3 rounded-[10px] text-sm font-bold border transition-all cursor-pointer ${
                      form.type === t ? "bg-[#FFF7ED] text-[#F97316] border-[#F97316]" : "bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#F97316]"
                    }`}>
                    {t === "fixed" ? "🛒 Fixed Price" : "🔨 Auction"}
                  </button>
                ))}
              </div>
            </div>

            {/* Title & Price */}
            <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-4 space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-[#111827] mb-2 uppercase tracking-wider">Title</label>
                <input type="text" placeholder="What are you selling?" value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  className="w-full px-4 py-3 border border-[#E5E7EB] rounded-[10px] text-sm outline-none focus:border-[#F97316] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.1)]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-[#111827] mb-2 uppercase tracking-wider">Price (₦)</label>
                  <input type="number" placeholder="0" value={form.price}
                    onChange={(e) => updateForm("price", e.target.value)}
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-[10px] text-sm outline-none focus:border-[#F97316] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.1)]" />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#111827] mb-2 uppercase tracking-wider">Category</label>
                  <select value={form.category} onChange={(e) => updateForm("category", e.target.value)}
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-[10px] text-sm outline-none focus:border-[#F97316] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.1)] bg-white">
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {commissionRate > 0 && (
                <div className="text-[11px] text-[#6B7280]">
                  Commission: <span className="font-bold text-[#F97316]">{commissionRate}%</span> will be deducted on successful sale
                </div>
              )}
            </div>

            {/* Description */}
            <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-4">
              <label className="block text-[12px] font-bold text-[#111827] mb-2 uppercase tracking-wider">Description</label>
              <textarea rows={4} placeholder="Describe your item in detail..." value={form.description}
                onChange={(e) => updateForm("description", e.target.value)}
                className="w-full px-4 py-3 border border-[#E5E7EB] rounded-[10px] text-sm outline-none focus:border-[#F97316] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.1)] resize-none" />
            </div>

            {/* Condition & Images */}
            <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-4 space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-[#111827] mb-2 uppercase tracking-wider">Condition</label>
                <div className="flex gap-2">
                  {CONDITIONS.map((c) => (
                    <button key={c} type="button" onClick={() => updateForm("condition", c)}
                      className={`px-4 py-2 rounded-[10px] text-sm font-bold border transition-all cursor-pointer capitalize ${
                        form.condition === c ? "bg-[#FFF7ED] text-[#F97316] border-[#F97316]" : "bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#F97316]"
                      }`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[#111827] mb-2 uppercase tracking-wider">Images (select up to 6)</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_IMAGES.map((emoji) => (
                    <button key={emoji} type="button" onClick={() => toggleImage(emoji)}
                      className={`w-12 h-12 rounded-[10px] text-2xl flex items-center justify-center border transition-all cursor-pointer ${
                        form.images.includes(emoji) ? "bg-[#FFF7ED] border-[#F97316] ring-2 ring-[#F97316]/20" : "bg-white border-[#E5E7EB] hover:border-[#F97316]"
                      }`}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Shipping */}
            <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-[#111827] mb-2 uppercase tracking-wider">Shipping fee (₦)</label>
                  <input type="number" placeholder="0" value={form.shippingFee}
                    onChange={(e) => updateForm("shippingFee", e.target.value)}
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-[10px] text-sm outline-none focus:border-[#F97316]" />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#111827] mb-2 uppercase tracking-wider">Courier</label>
                  <select value={form.shippingMethod} onChange={(e) => updateForm("shippingMethod", e.target.value)}
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-[10px] text-sm outline-none focus:border-[#F97316] bg-white">
                    {SHIPPING_METHODS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Auction fields */}
            {form.type === "auction" && (
              <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-4 space-y-4 animate-[fadeUp_0.3s_ease_both]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-bold text-[#111827] mb-2 uppercase tracking-wider">End time</label>
                    <input type="datetime-local" value={form.endTime}
                      onChange={(e) => updateForm("endTime", e.target.value)}
                      className="w-full px-4 py-3 border border-[#E5E7EB] rounded-[10px] text-sm outline-none focus:border-[#F97316]" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#111827] mb-2 uppercase tracking-wider">Reserve price (₦)</label>
                    <input type="number" placeholder="Optional" value={form.reservePrice}
                      onChange={(e) => updateForm("reservePrice", e.target.value)}
                      className="w-full px-4 py-3 border border-[#E5E7EB] rounded-[10px] text-sm outline-none focus:border-[#F97316]" />
                  </div>
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <Link href="/seller/listings" className="flex-1 bg-white border border-[#E5E7EB] text-[#374151] rounded-[10px] py-3 text-sm font-bold text-center hover:border-[#F97316] hover:text-[#F97316] transition-all no-underline">
                Cancel
              </Link>
              <button type="submit" disabled={submitting}
                className="flex-1 bg-[#F97316] text-white rounded-[10px] py-3 text-sm font-bold hover:bg-[#EA6C0A] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                {submitting ? "Creating..." : "🚀 Publish listing"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] px-2 py-2 z-[200] flex justify-around lg:hidden">
        {[
          { id: "dashboard", icon: "📊", href: "/seller/dashboard" },
          { id: "listings", icon: "📦", href: "/seller/listings" },
          { id: "orders", icon: "🛒", href: "/seller/orders" },
          { id: "earnings", icon: "💰", href: "/seller/earnings" },
          { id: "settings", icon: "⚙️", href: "/seller/settings" },
        ].map((item) => (
          <Link key={item.id} href={item.href} className="p-2 text-xl text-[#9CA3AF] no-underline">{item.icon}</Link>
        ))}
      </nav>
      <div className="h-16 lg:hidden" />
    </div>
  );
}