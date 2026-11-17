"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

// ─── Types ─────────────────────────────────────────────────────────
interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  origPrice?: number;
  type: "fixed" | "auction";
  category: string;
  condition: string;
  location: string;
  images: string[];
  status: "active" | "sold" | "paused" | "draft";
  views?: number;
  watchers?: number;
  stock?: number;
  acceptOffers?: boolean;
  handlingTime?: string;
  acceptReturns?: boolean;
  shippingFee?: number;
  shippingMethod?: string;
  createdAt: string;
}

interface FormState {
  title: string;
  description: string;
  price: string;
  origPrice: string;
  category: string;
  condition: string;
  location: string;
  stock: number;
  acceptOffers: boolean;
  shippingFee: string;
  shippingMethod: string;
  handlingTime: string;
  acceptReturns: boolean;
  images: string[];
}

const CATEGORIES = [
  "Phones & Tablets", "Fashion", "Home & Living", "Electronics", "Vehicles & Parts",
  "Beauty & Health", "Books & Media", "Sports & Fitness", "Gaming", "Kitchen & Food",
];

const CONDITIONS = ["New", "Used — Like new", "Used — Good", "Used — Fair"];
const CONDITION_VALUES: Record<string, string> = {
  "New": "new", "Used — Like new": "used-like-new", "Used — Good": "used-good", "Used — Fair": "used-fair",
};
const CONDITION_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(CONDITION_VALUES).map(([k, v]) => [v, k])
);

const COURIERS = ["GIG Logistics", "Fez Delivery", "Kwik Delivery", "DHL Nigeria", "Pickup"];

const TABS = [
  { id: "details", label: "Details", icon: "📋" },
  { id: "pricing", label: "Pricing", icon: "💰" },
  { id: "photos", label: "Photos", icon: "📷" },
  { id: "shipping", label: "Shipping", icon: "🚚" },
];

const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;
const inputCls = "w-full px-3.5 py-2.5 border-[1.5px] border-[#E5E7EB] rounded-[10px] text-sm outline-none focus:border-[#F97316] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.1)] bg-white";

// ─── Toggle switch ─────────────────────────────────────────────────
function Toggle({ on, onChange, color = "#F97316" }: { on: boolean; onChange: (v: boolean) => void; color?: string }) {
  return (
    <div onClick={() => onChange(!on)}
      className="w-10 h-[22px] rounded-full cursor-pointer relative shrink-0 transition-colors"
      style={{ background: on ? color : "#D1D5DB" }}>
      <div className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all"
        style={{ left: on ? 20 : 2 }} />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────
export default function EditListingPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [listing, setListing] = useState<Listing | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [newImageUrl, setNewImageUrl] = useState("");

  useEffect(() => { if (id) loadListing(); }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadListing = async () => {
    try {
      const res = await fetch(`/api/seller/listings/${id}`);
      const data = await res.json();
      if (!data.success || !data.data) {
        router.push("/seller/listings");
        return;
      }
      const l: Listing = data.data;
      setListing(l);
      setForm({
        title: l.title || "",
        description: l.description || "",
        price: String(l.price ?? ""),
        origPrice: l.origPrice ? String(l.origPrice) : "",
        category: l.category || CATEGORIES[0],
        condition: CONDITION_LABELS[l.condition] || "New",
        location: l.location || "",
        stock: l.stock ?? 1,
        acceptOffers: l.acceptOffers ?? true,
        shippingFee: l.shippingFee ? String(l.shippingFee) : "0",
        shippingMethod: l.shippingMethod || COURIERS[0],
        handlingTime: l.handlingTime || "1",
        acceptReturns: l.acceptReturns ?? true,
        images: Array.isArray(l.images) ? [...l.images] : [],
      });
    } catch {
      setToast({ msg: "❌ Failed to load listing", type: "error" });
      router.push("/seller/listings");
    } finally {
      setLoading(false);
    }
  };

  const upd = (key: keyof FormState, value: unknown) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSave = async () => {
    if (!form) return;
    const newErrors: Record<string, string> = {};
    if (!form.title.trim()) newErrors.title = "Title is required";
    if (!form.description.trim()) newErrors.description = "Description is required";
    const priceNum = Number(String(form.price).replace(/[^0-9.]/g, ""));
    if (!priceNum || priceNum <= 0) newErrors.price = "Enter a valid price";
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      setActiveTab(newErrors.price ? "pricing" : "details");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/seller/listings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          price: priceNum,
          origPrice: Number(String(form.origPrice).replace(/[^0-9.]/g, "")) || 0,
          category: form.category,
          condition: CONDITION_VALUES[form.condition] || "new",
          location: form.location,
          stock: form.stock,
          acceptOffers: form.acceptOffers,
          shippingFee: Number(String(form.shippingFee).replace(/[^0-9.]/g, "")) || 0,
          shippingMethod: form.shippingMethod,
          handlingTime: form.handlingTime,
          acceptReturns: form.acceptReturns,
          images: form.images,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ msg: "✅ Listing updated!", type: "success" });
        setListing((prev) => (prev ? { ...prev, ...data.data } : prev));
      } else {
        setToast({ msg: `❌ ${data.error || "Save failed"}`, type: "error" });
      }
    } catch {
      setToast({ msg: "❌ Failed to save changes", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/seller/listings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        setListing((prev) => (prev ? { ...prev, status: status as Listing["status"] } : prev));
        setToast({ msg: `✅ Listing ${status === "active" ? "activated" : status}`, type: "success" });
      } else {
        setToast({ msg: `❌ ${data.error || "Update failed"}`, type: "error" });
      }
    } catch {
      setToast({ msg: "❌ Failed to update status", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this listing permanently?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/seller/listings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/seller/listings");
      } else {
        setToast({ msg: `❌ ${data.error || "Delete failed"}`, type: "error" });
      }
    } catch {
      setToast({ msg: "❌ Failed to delete listing", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const addImage = () => {
    const url = newImageUrl.trim();
    if (!url || !form) return;
    upd("images", [...form.images, url]);
    setNewImageUrl("");
  };

  // ── File upload (seller picks images from device) ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !form) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success && data.data?.url) {
        upd("images", [...form.images, data.data.url]);
      } else {
        setToast({ msg: `❌ ${data.error || "Upload failed"}`, type: "error" });
      }
    } catch {
      setToast({ msg: "❌ Upload failed — try again", type: "error" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading || !form || !listing) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center text-[#6B7280]">
          <div className="text-3xl mb-2 animate-pulse">📦</div>
          <div className="text-sm font-semibold">Loading listing…</div>
        </div>
      </div>
    );
  }

  const priceNum = Number(String(form.price).replace(/[^0-9.]/g, "")) || 0;
  const fee = Math.round(priceNum * 0.08);
  const net = priceNum - fee;
  const conversion = listing.views ? ((0 / listing.views) * 100).toFixed(1) : "0.0";

  const err = (key: string) => errors[key]
    ? <div className="text-[12px] text-[#DC2626] mt-1">⚠️ {errors[key]}</div>
    : null;

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {toast && (
        <div className="fixed top-4 right-4 z-[300] px-5 py-3 rounded-[10px] text-sm font-semibold shadow-lg border"
          style={{
            background: toast.type === "success" ? "#F0FDF4" : "#FEF2F2",
            borderColor: toast.type === "success" ? "#BBF7D0" : "#FECACA",
            color: toast.type === "success" ? "#16A34A" : "#DC2626",
          }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-[200] bg-white border-b border-[#E5E7EB] h-[58px] flex items-center px-4 gap-3">
        <Link href="/seller/listings"
          className="px-3.5 py-2 text-[13px] font-semibold text-[#374151] border-[1.5px] border-[#E5E7EB] rounded-[10px] hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all no-underline">
          ← Back
        </Link>
        <div className="text-lg font-extrabold text-[#111827]">
          shop<span className="text-[#F97316]">droply</span>
        </div>
        <div className="flex-1 flex justify-center">
          <span className="text-sm font-bold text-[#111827]">Edit listing</span>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="bg-[#F97316] text-white rounded-[10px] px-5 py-2 text-[13px] font-bold hover:bg-[#EA6C0A] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? "Saving…" : "💾 Save changes"}
        </button>
      </header>

      <div className="max-w-[900px] mx-auto px-4 pt-6 pb-12">
        {/* Listing summary */}
        <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-5 mb-6 flex flex-wrap gap-4 items-center">
          <div className="w-16 h-16 rounded-[12px] bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] flex items-center justify-center text-2xl shrink-0 overflow-hidden">
            {form.images[0] ? <img src={form.images[0]} alt="" className="w-full h-full object-cover" /> : "📦"}
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-base font-bold text-[#111827] mb-1">{listing.title}</div>
            <div className="flex flex-wrap gap-2.5 items-center">
              <span className="text-lg font-extrabold text-[#F97316]">{naira(priceNum)}</span>
              {Number(form.origPrice) > priceNum && (
                <span className="text-[11px] text-[#6B7280] line-through">{naira(Number(form.origPrice))}</span>
              )}
              <span className="text-[10px] font-bold text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] px-2 py-0.5 rounded-[10px] capitalize">
                ● {listing.status}
              </span>
              <span className="text-[11px] text-[#6B7280]">ID: {listing.id}</span>
            </div>
          </div>
          <div className="flex gap-5 text-center">
            <div><div className="text-lg font-extrabold text-[#111827]">{listing.views || 0}</div><div className="text-[10px] text-[#6B7280]">Views</div></div>
            <div><div className="text-lg font-extrabold text-[#111827]">{listing.watchers || 0}</div><div className="text-[10px] text-[#6B7280]">Watchers</div></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-[#E5E7EB] mb-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="px-5 py-3 text-sm font-semibold border-b-2 -mb-[2px] whitespace-nowrap cursor-pointer transition-all bg-transparent"
              style={{
                color: activeTab === tab.id ? "#F97316" : "#6B7280",
                borderBottomColor: activeTab === tab.id ? "#F97316" : "transparent",
              }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5 items-start">
          <div>
            {/* ── Details ── */}
            {activeTab === "details" && (
              <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-6">
                <div className="text-[15px] font-bold text-[#111827] mb-4">Basic information</div>

                <div className="mb-4">
                  <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Title *</label>
                  <input className={inputCls} style={errors.title ? { borderColor: "#DC2626" } : undefined}
                    value={form.title} onChange={(e) => upd("title", e.target.value)} maxLength={80} />
                  <div className="text-[11px] text-[#9CA3AF] mt-1 text-right">{form.title.length}/80</div>
                  {err("title")}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Category</label>
                    <select className={inputCls} value={form.category} onChange={(e) => upd("category", e.target.value)}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Condition</label>
                    <select className={inputCls} value={form.condition} onChange={(e) => upd("condition", e.target.value)}>
                      {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Description *</label>
                  <textarea className={`${inputCls} resize-y min-h-[120px]`}
                    style={errors.description ? { borderColor: "#DC2626" } : undefined}
                    value={form.description} onChange={(e) => upd("description", e.target.value)} rows={5} />
                  {err("description")}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Location</label>
                    <input className={inputCls} value={form.location} onChange={(e) => upd("location", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Stock quantity</label>
                    <div className="flex items-center w-fit border-[1.5px] border-[#E5E7EB] rounded-[8px] overflow-hidden">
                      <button onClick={() => upd("stock", Math.max(0, form.stock - 1))}
                        className="w-9 h-10 bg-white border-none cursor-pointer text-base hover:bg-[#F9FAFB]">−</button>
                      <div className="w-12 h-10 flex items-center justify-center text-sm font-bold border-x border-[#E5E7EB]">{form.stock}</div>
                      <button onClick={() => upd("stock", form.stock + 1)}
                        className="w-9 h-10 bg-white border-none cursor-pointer text-base hover:bg-[#F9FAFB]">+</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Pricing ── */}
            {activeTab === "pricing" && (
              <div>
                <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-6 mb-4">
                  <div className="text-[15px] font-bold text-[#111827] mb-4">Pricing</div>
                  <div className="mb-4">
                    <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Price *</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#374151]">₦</span>
                      <input className={`${inputCls} pl-7`} style={errors.price ? { borderColor: "#DC2626" } : undefined}
                        value={form.price} onChange={(e) => upd("price", e.target.value)} inputMode="numeric" />
                    </div>
                    {err("price")}
                  </div>
                  <div className="mb-5">
                    <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Original price (shown struck through)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#374151]">₦</span>
                      <input className={`${inputCls} pl-7`} value={form.origPrice}
                        onChange={(e) => upd("origPrice", e.target.value)} inputMode="numeric" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Toggle on={form.acceptOffers} onChange={(v) => upd("acceptOffers", v)} />
                    <div>
                      <div className="text-[13px] font-semibold text-[#111827]">Accept offers</div>
                      <div className="text-[11px] text-[#6B7280]">Let buyers negotiate a lower price</div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[10px] p-4">
                  <div className="text-[13px] font-bold text-[#2563EB] mb-1.5">💰 Fee preview</div>
                  <div className="text-[12px] text-[#1e40af] leading-relaxed">
                    Price: <strong>{naira(priceNum)}</strong><br />
                    Platform fee (8%): <strong>{naira(fee)}</strong><br />
                    You receive: <strong className="text-[#16A34A]">{naira(net)}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* ── Photos ── */}
            {activeTab === "photos" && (
              <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-6">
                <div className="text-[15px] font-bold text-[#111827] mb-4">Photos</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div className="flex flex-wrap gap-3 mb-4">
                  {/* Upload tile */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-20 h-20 rounded-[10px] border-2 border-dashed border-[#E5E7EB] flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#F97316] hover:bg-[#FFF7ED] transition-all bg-white disabled:opacity-50">
                    <span className="text-xl">{uploading ? "⏳" : "📤"}</span>
                    <span className="text-[9px] font-bold text-[#6B7280]">{uploading ? "Uploading" : "Upload"}</span>
                  </button>
                  {form.images.map((img, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-[10px] border-2 border-[#F97316] overflow-hidden group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 text-[9px] font-bold text-[#F97316] bg-white px-1 rounded">COVER</span>
                      )}
                      <button
                        onClick={() => upd("images", form.images.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-[11px] items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none hidden group-hover:flex">
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mb-4">
                  <input className={inputCls} placeholder="Paste an image URL and click Add…"
                    value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addImage()} />
                  <button onClick={addImage}
                    className="px-4 py-2.5 text-sm font-bold text-white bg-[#F97316] rounded-[10px] hover:bg-[#EA6C0A] transition-all cursor-pointer border-none shrink-0">
                    Add
                  </button>
                </div>
                <div className="text-[12px] text-[#6B7280] leading-relaxed">
                  💡 <strong>Tip:</strong> Upload clear, well-lit photos (max 5MB each). The first image is the cover — drag order is saved as-is. Listings with 4+ photos sell 3x faster.
                </div>
              </div>
            )}

            {/* ── Shipping ── */}
            {activeTab === "shipping" && (
              <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-6">
                <div className="text-[15px] font-bold text-[#111827] mb-4">Shipping settings</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Courier</label>
                    <select className={inputCls} value={form.shippingMethod} onChange={(e) => upd("shippingMethod", e.target.value)}>
                      {COURIERS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Shipping fee (₦)</label>
                    <input className={inputCls} value={form.shippingFee} inputMode="numeric"
                      onChange={(e) => upd("shippingFee", e.target.value)} />
                  </div>
                </div>
                <div className="mb-5">
                  <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Handling time</label>
                  <select className={inputCls} value={form.handlingTime} onChange={(e) => upd("handlingTime", e.target.value)}>
                    <option value="same">Same day</option>
                    <option value="1">1 business day</option>
                    <option value="2">2 business days</option>
                    <option value="3">3 business days</option>
                    <option value="5">5 business days</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <Toggle on={form.acceptReturns} onChange={(v) => upd("acceptReturns", v)} color="#16A34A" />
                  <div>
                    <div className="text-[13px] font-semibold text-[#111827]">Accept returns</div>
                    <div className="text-[11px] text-[#6B7280]">Buyers can return within 7 days if not as described</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Right sidebar ── */}
          <div className="flex flex-col gap-4">
            <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-5">
              <div className="text-sm font-bold text-[#111827] mb-3">Listing status</div>
              <div className="flex flex-col gap-2">
                {listing.status !== "active" && (
                  <button disabled={busy} onClick={() => changeStatus("active")}
                    className="w-full py-2.5 text-[13px] font-bold text-white bg-[#F97316] rounded-[10px] hover:bg-[#EA6C0A] transition-all cursor-pointer border-none disabled:opacity-50">
                    ▶ Activate
                  </button>
                )}
                {listing.status === "active" && (
                  <button disabled={busy} onClick={() => changeStatus("paused")}
                    className="w-full py-2.5 text-[13px] font-semibold text-[#374151] border-[1.5px] border-[#E5E7EB] rounded-[10px] hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all cursor-pointer disabled:opacity-50 bg-white">
                    ⏸ Pause listing
                  </button>
                )}
                <button disabled={busy} onClick={handleDelete}
                  className="w-full py-2.5 text-[13px] font-semibold text-[#DC2626] bg-[#FEF2F2] border-[1.5px] border-[#FECACA] rounded-[10px] hover:bg-[#DC2626] hover:text-white transition-all cursor-pointer disabled:opacity-50">
                  🗑 Delete listing
                </button>
              </div>
            </div>

            <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[14px] p-5">
              <div className="text-sm font-bold text-[#111827] mb-3">Performance</div>
              <div className="flex flex-col gap-2.5 text-[13px]">
                <div className="flex justify-between"><span className="text-[#6B7280]">Views</span><strong className="text-[#111827]">{listing.views || 0}</strong></div>
                <div className="flex justify-between"><span className="text-[#6B7280]">Watchers</span><strong className="text-[#111827]">{listing.watchers || 0}</strong></div>
                <div className="flex justify-between"><span className="text-[#6B7280]">Stock</span><strong className="text-[#111827]">{form.stock}</strong></div>
                <div className="flex justify-between"><span className="text-[#6B7280]">Listed</span><strong className="text-[#111827]">{new Date(listing.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</strong></div>
                <div className="flex justify-between"><span className="text-[#6B7280]">Type</span><strong className="text-[#111827] capitalize">{listing.type}</strong></div>
              </div>
            </div>

            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-[10px] p-3.5">
              <div className="text-[12px] text-[#D97706] leading-relaxed">
                <strong>💡 Tip:</strong> Lowering your price by 10% can increase views by up to 40%.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
