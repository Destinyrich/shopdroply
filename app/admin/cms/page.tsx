"use client";

import { useState, useEffect } from "react";

// ─── Design Tokens ─────────────────────────────────────────────────
const C = {
  orange:       "#F97316", orangeLight:  "#FFF7ED", orangeBorder: "#FED7AA",
  green:        "#16A34A", greenLight:   "#F0FDF4", greenBorder:  "#BBF7D0",
  red:          "#DC2626", redLight:     "#FEF2F2", redBorder:    "#FECACA",
  amber:        "#D97706", amberLight:   "#FFFBEB", amberBorder:  "#FDE68A",
  blue:         "#2563EB", blueLight:    "#EFF6FF", blueBorder:   "#BFDBFE",
  purple:       "#7C3AED", purpleLight:  "#F5F3FF",
  bg:           "#F9FAFB", surface:      "#FFFFFF", border:       "#E5E7EB",
  text:         "#1A1A1A", textMid:      "#374151", textSub:      "#6B7280", textLight: "#9CA3AF",
};
const FONT = "'Plus Jakarta Sans', sans-serif";

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  .sdp-admin-scope,.sdp-admin-scope *{box-sizing:border-box;}
  .sdp-admin-scope{font-family:'Plus Jakarta Sans',sans-serif;-webkit-font-smoothing:antialiased;}
  .sdp-admin-scope button,.sdp-admin-scope input,.sdp-admin-scope select,.sdp-admin-scope textarea{font-family:'Plus Jakarta Sans',sans-serif;}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
  @keyframes scaleIn{from{opacity:0;transform:scale(0.92);}to{opacity:1;transform:scale(1);}}
  .fade-up{animation:fadeUp 0.35s ease both;}
  .scale-in{animation:scaleIn 0.3s ease both;}
  .btn-orange{background:#F97316;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;transition:all 0.15s;display:inline-flex;align-items:center;justify-content:center;gap:8px;}
  .btn-orange:hover{background:#EA6C0A;transform:translateY(-1px);box-shadow:0 4px 18px rgba(249,115,22,0.28);}
  .btn-ghost{background:#fff;border:1.5px solid #E5E7EB;border-radius:10px;color:#374151;font-weight:600;cursor:pointer;transition:all 0.15s;display:inline-flex;align-items:center;justify-content:center;gap:6px;}
  .btn-ghost:hover{border-color:#F97316;color:#F97316;background:#FFF7ED;}
  .btn-red{background:#FEF2F2;color:#DC2626;border:1.5px solid #FECACA;border-radius:10px;font-weight:600;cursor:pointer;transition:all 0.15s;display:inline-flex;align-items:center;justify-content:center;gap:6px;}
  .btn-red:hover{background:#DC2626;color:#fff;}
  .sdp-input{width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:14px;color:#1A1A1A;outline:none;transition:border-color 0.15s,box-shadow 0.15s;background:#fff;}
  .sdp-input:focus{border-color:#F97316;box-shadow:0 0 0 3px rgba(249,115,22,0.1);}
  .banner-row{display:grid;grid-template-columns:60px 1.5fr 110px 150px 100px 100px 160px;gap:16px;padding:14px 16px;align-items:center;border-bottom:1px solid #F3F4F6;transition:background 0.15s;}
  .banner-row:hover{background:#F9FAFB;}
  .status-pill{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;}
  .position-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:#F3F4F6;color:#4B5563;border:1px solid #E5E7EB;}
  .switch{width:40px;height:22px;border-radius:20px;border:none;cursor:pointer;position:relative;transition:background 0.2s;flex-shrink:0;padding:0;}
  .switch .knob{position:absolute;top:2px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.25);}
  @media(max-width:900px){.banner-row{grid-template-columns:1fr!important;gap:8px;padding:12px;}.admin-sidebar{display:none!important;}.admin-main{margin-left:0!important;}.stats-row{grid-template-columns:repeat(2,1fr)!important;}}
`;

const POSITION_CONFIG = {
  hero:        { label: "Hero slide", color: C.orange, bg: C.orangeLight, border: C.orangeBorder },
  "promo-bar": { label: "Promo bar",  color: C.blue,   bg: C.blueLight,   border: C.blueBorder },
  "seller-cta":{ label: "Seller CTA", color: C.purple, bg: C.purpleLight, border: "#DDD6FE" },
} as const;

type BannerPosition = keyof typeof POSITION_CONFIG;

type Banner = {
  id?: string | number;
  title: string;
  subtitle: string;
  position: BannerPosition;
  cta: string;
  link: string;
  image: string;
  bgColor: string;
  active: boolean;
  startDate: string;
  endDate: string;
  priority: number;
  clicks: number;
};

type BannerApi = Partial<Banner> & {
  position?: BannerPosition | string;
};

type BannerModalProps = {
  banner?: Banner | null;
  onClose: () => void;
  onSave: (form: Banner) => void | Promise<void>;
  acting: boolean;
};

function fromApi(b: BannerApi): Banner {
  return {
    id: b.id,
    title: b.title ?? "",
    subtitle: b.subtitle || "",
    position: (b.position as BannerPosition) ?? "hero",
    cta: b.cta || "Shop now",
    link: b.link || "/",
    image: b.image || "🖼️",
    bgColor: b.bgColor || "#FFF7ED",
    active: Boolean(b.active),
    startDate: b.startDate ?? "",
    endDate: b.endDate ?? "",
    priority: b.priority ?? 1,
    clicks: b.clicks ?? 0,
  };
}

function AdminSidebar() {
  return (
    <aside className="admin-sidebar" style={{ width: 260, minHeight: "100vh", background: "#1A1A1A", position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 100, overflowY: "auto", padding: "20px 0" }}>
      <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #333" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: FONT }}>shop<span style={{ color: C.orange }}>droply</span></div>
        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>Admin Control Center</div>
      </div>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #333" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 12 }}>SA</div>
          <div><div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Super Admin</div><div style={{ fontSize: 11, color: "#9CA3AF" }}>Full access</div></div>
        </div>
      </div>
      <nav style={{ padding: "12px 0" }}>
        {[
          { id: "dashboard", label: "Dashboard", icon: "📊" },
          { id: "users", label: "Users", icon: "👥" },
          { id: "kyc", label: "Seller KYC", icon: "🪪" },
          { id: "listings", label: "Listings", icon: "📦" },
          { id: "orders", label: "Orders", icon: "🛒" },
          { id: "escrow", label: "Escrow", icon: "🛡️" },
          { id: "disputes", label: "Disputes", icon: "⚠️" },
          { id: "payouts", label: "Payouts", icon: "💰" },
          { id: "fees", label: "Fees & Commission", icon: "📋" },
          { id: "shipping", label: "Shipping", icon: "🚚" },
          { id: "categories", label: "Categories", icon: "🏷️" },
          { id: "reviews", label: "Reviews", icon: "⭐" },
          { id: "cms", label: "CMS & Banners", icon: "🎨", active: true },
          { id: "reports", label: "Reports", icon: "📈" },
          { id: "roles", label: "Roles", icon: "🔐" },
        ].map(item => (
          <button key={item.id} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 20px", border: "none", background: item.active ? "rgba(249,115,22,0.15)" : "transparent", color: item.active ? C.orange : "#9CA3AF", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", textAlign: "left", borderRight: item.active ? `3px solid ${C.orange}` : "3px solid transparent" }}>
            <span style={{ fontSize: 15 }}>{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function BannerModal({ banner, onClose, onSave, acting }: BannerModalProps) {
  const emptyForm: Banner = {
    title: "",
    subtitle: "",
    position: "hero",
    cta: "",
    link: "",
    image: "🖼️",
    bgColor: "#FFF7ED",
    active: true,
    startDate: "",
    endDate: "",
    priority: 1,
    clicks: 0,
  };

  const [form, setForm] = useState<Banner>(banner ?? emptyForm);

  const bgOptions = [
    { label: "Orange", value: "#FFF7ED" },
    { label: "Green", value: "#F0FDF4" },
    { label: "Blue", value: "#EFF6FF" },
    { label: "Amber", value: "#FFFBEB" },
    { label: "Purple", value: "#F5F3FF" },
    { label: "Red", value: "#FEF2F2" },
    { label: "Dark", value: "#1A1A1A" },
  ];

  const valid = form.title.trim() && form.startDate && form.endDate;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div className="scale-in" style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 540, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text, fontFamily: FONT }}>{banner ? "Edit banner" : "Add new banner"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textLight }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Banner title *</label>
              <input className="sdp-input" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g. Summer Sale" />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>CTA button text</label>
              <input className="sdp-input" value={form.cta} onChange={e => setForm(prev => ({ ...prev, cta: e.target.value }))} placeholder="e.g. Shop now" />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Subtitle</label>
            <input className="sdp-input" value={form.subtitle} onChange={e => setForm(prev => ({ ...prev, subtitle: e.target.value }))} placeholder="Short description line..." />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Position</label>
              <select className="sdp-input" value={form.position} onChange={e => setForm(prev => ({ ...prev, position: e.target.value as BannerPosition }))}>
                <option value="hero">Hero slide (homepage carousel)</option>
                <option value="promo-bar">Promo bar (top strip)</option>
                <option value="seller-cta">Seller CTA section</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Priority order</label>
              <input className="sdp-input" type="number" min="1" max="10" value={form.priority} onChange={e => setForm(prev => ({ ...prev, priority: Number(e.target.value) }))} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Link URL</label>
            <input className="sdp-input" value={form.link} onChange={e => setForm(prev => ({ ...prev, link: e.target.value }))} placeholder="/category/fashion or https://..." />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Icon / image (emoji)</label>
              <input className="sdp-input" value={form.image} onChange={e => setForm(prev => ({ ...prev, image: e.target.value }))} placeholder="🖼️" maxLength={4} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Background colour</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 4 }}>
                {bgOptions.map(opt => (
                  <button key={opt.value} onClick={() => setForm(prev => ({ ...prev, bgColor: opt.value }))}
                    style={{ width: 30, height: 30, borderRadius: 8, background: opt.value, border: `2px solid ${form.bgColor === opt.value ? C.orange : "transparent"}`, cursor: "pointer", transition: "all 0.15s" }}
                    title={opt.label} />
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Start date *</label>
              <input className="sdp-input" type="date" value={form.startDate} onChange={e => setForm(prev => ({ ...prev, startDate: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>End date *</label>
              <input className="sdp-input" type="date" value={form.endDate} onChange={e => setForm(prev => ({ ...prev, endDate: e.target.value }))} />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.textMid }}>Active</span>
            <button className="switch" onClick={() => setForm(prev => ({ ...prev, active: !prev.active }))} style={{ background: form.active ? C.green : "#D1D5DB" }}>
              <span className="knob" style={{ left: form.active ? 20 : 2 }} />
            </button>
          </div>

          {/* Preview */}
          <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ background: C.bg, padding: "8px 12px", fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.04em" }}>Preview</div>
            <div style={{ background: form.bgColor, padding: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: form.bgColor === "#1A1A1A" ? "#fff" : C.text, fontFamily: FONT, marginBottom: 4 }}>{form.title || "Banner title"}</div>
                <div style={{ fontSize: 13, color: form.bgColor === "#1A1A1A" ? "#D1D5DB" : C.textSub, marginBottom: 12 }}>{form.subtitle || "Subtitle text"}</div>
                <button style={{ background: C.orange, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{form.cta || "CTA"}</button>
              </div>
              <div style={{ fontSize: 48 }}>{form.image || "🖼️"}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button className="btn-orange" style={{ flex: 1, padding: "12px", fontSize: 14, opacity: acting || !valid ? 0.6 : 1 }} disabled={acting || !valid}
              onClick={() => onSave(form)}>
              {acting ? "Saving…" : `💾 ${banner ? "Save changes" : "Create banner"}`}
            </button>
            <button className="btn-ghost" style={{ padding: "12px 20px", fontSize: 14 }} onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminCmsScreen() {
  type BannerFilter = "all" | "hero" | "promo-bar" | "seller-cta";

  const [banners, setBanners] = useState<Banner[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<BannerFilter>("all");
  const [modalBanner, setModalBanner] = useState<Banner | null | undefined>(undefined); // undefined=closed, null=create, object=edit
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const filterTabs: { key: BannerFilter; label: string }[] = [
    { key: "all", label: "All banners" },
    { key: "hero", label: "Hero slides" },
    { key: "promo-bar", label: "Promo bars" },
    { key: "seller-cta", label: "Seller CTAs" },
  ];

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/banners");
      const data = await res.json();
      if (data.success) setBanners(data.data.map(fromApi));
      else setToast({ msg: data.error || "Failed to load banners", type: "error" });
    } catch {
      setToast({ msg: "Failed to load banners", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (b: Banner) => {
    const res = await fetch(`/api/admin/banners/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !b.active }),
    });
    const data = await res.json();
    if (data.success) {
      setBanners(prev => prev.map(x => x.id === b.id ? fromApi(data.data) : x));
      setToast({ msg: `Banner ${data.data.active ? "activated" : "deactivated"}`, type: "success" });
    } else {
      setToast({ msg: data.error || "Update failed", type: "error" });
    }
  };

  const handleSaveBanner = async (form: Banner) => {
    setActing(true);
    try {
      const isEdit = !!form.id;
      const res = await fetch(isEdit ? `/api/admin/banners/${form.id}` : "/api/admin/banners", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) {
        setToast({ msg: data.error || "Save failed", type: "error" });
        return;
      }
      const saved = fromApi(data.data);
      setBanners(prev => isEdit ? prev.map(x => x.id === saved.id ? saved : x) : [...prev, saved]);
      setToast({ msg: isEdit ? "Banner updated" : "Banner created", type: "success" });
      setModalBanner(undefined);
    } catch {
      setToast({ msg: "Save failed", type: "error" });
    } finally {
      setActing(false);
    }
  };

  const handleDelete = async (id?: string | number) => {
    if (id === undefined) return;
    if (!window.confirm("Delete this banner? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      setBanners(prev => prev.filter(b => b.id !== id));
      setToast({ msg: "Banner deleted", type: "success" });
    } else {
      setToast({ msg: data.error || "Delete failed", type: "error" });
    }
  };

  const filtered = banners.filter(b => {
    if (filter !== "all" && b.position !== filter) return false;
    if (search && !b.title.toLowerCase().includes(search.toLowerCase()) && !(b.subtitle || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: banners.length,
    hero: banners.filter(b => b.position === "hero").length,
    "promo-bar": banners.filter(b => b.position === "promo-bar").length,
    "seller-cta": banners.filter(b => b.position === "seller-cta").length,
    active: banners.filter(b => b.active).length,
  };

  const totalClicks = banners.reduce((a, b) => a + b.clicks, 0);

  if (loading) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <div className="sdp-admin-scope" style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
          <AdminSidebar />
          <main className="admin-main" style={{ marginLeft: 260, flex: 1, padding: 24, color: C.textSub, fontSize: 14 }}>
            Loading banners…
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 600, background: "#fff", border: `1.5px solid ${toast.type === "error" ? C.redBorder : C.greenBorder}`, color: toast.type === "error" ? C.red : C.green, padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 18px rgba(0,0,0,0.1)" }}>
          {toast.type === "error" ? "⚠️" : "✅"} {toast.msg}
          <button onClick={() => setToast(null)} style={{ marginLeft: 10, background: "none", border: "none", cursor: "pointer", color: C.textLight }}>✕</button>
        </div>
      )}
      {modalBanner !== undefined && (
        <BannerModal banner={modalBanner} onClose={() => setModalBanner(undefined)} onSave={handleSaveBanner} acting={acting} />
      )}
      <div className="sdp-admin-scope" style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
        <AdminSidebar />
        <main className="admin-main" style={{ marginLeft: 260, flex: 1, minWidth: 0 }}>
          <header style={{ height: 64, background: "#fff", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 50 }}>
            <div><h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, fontFamily: FONT }}>CMS & homepage banners</h1></div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button className="btn-ghost" style={{ padding: "8px 16px", fontSize: 13 }}>📥 Export</button>
              <button className="btn-orange" onClick={() => setModalBanner(null)} style={{ padding: "8px 20px", fontSize: 14 }}>+ Add banner</button>
            </div>
          </header>

          <div style={{ padding: "24px", maxWidth: 1200 }}>
            {/* Stats */}
            <div className="stats-row" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { label: "TOTAL BANNERS", value: counts.all, color: C.orange },
                { label: "ACTIVE NOW", value: counts.active, color: C.green },
                { label: "HERO SLIDES", value: counts.hero, color: C.blue },
                { label: "TOTAL CLICKS", value: totalClicks.toLocaleString(), color: C.purple },
              ].map((s, i) => (
                <div key={i} style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
                  <div style={{ fontSize: 11, color: C.textSub, fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: FONT }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${C.border}`, overflowX: "auto" }}>
                {filterTabs.map(tab => (
                  <button key={tab.key} onClick={() => setFilter(tab.key)} style={{ padding: "12px 18px", border: "none", background: "transparent", color: filter === tab.key ? C.orange : C.textSub, fontSize: 14, fontWeight: 600, cursor: "pointer", borderBottom: `2px solid ${filter === tab.key ? C.orange : "transparent"}`, marginBottom: -2, whiteSpace: "nowrap", transition: "all 0.15s" }}>
                    {tab.label}
                    <span style={{ marginLeft: 8, background: filter === tab.key ? C.orange : C.bg, color: filter === tab.key ? "#fff" : C.textSub, fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>{counts[tab.key]}</span>
                  </button>
                ))}
              </div>
              <div style={{ position: "relative", maxWidth: 300, minWidth: 200 }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: C.textLight }}>🔍</span>
                <input className="sdp-input" style={{ paddingLeft: 38 }} placeholder="Search banners..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            {/* Banners table */}
            <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div className="banner-row" style={{ background: C.bg, padding: "10px 16px", fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <div></div><div>Banner</div><div>Position</div><div>Schedule</div><div>Clicks</div><div>Status</div><div style={{ textAlign: "right" }}>Actions</div>
              </div>
              {filtered.map((b, i) => {
                const pc = POSITION_CONFIG[b.position];
                const now = new Date();
                const isExpired = new Date(b.endDate) < now;
                const isScheduled = new Date(b.startDate) > now;
                return (
                  <div key={b.id} className="banner-row fade-up" style={{ animationDelay: `${i * 0.03}s` }}>
                    <div style={{ fontSize: 24, textAlign: "center", background: b.bgColor, borderRadius: 8, width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>{b.image}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{b.title}</div>
                      <div style={{ fontSize: 11, color: C.textSub }}>{b.subtitle}</div>
                      <div style={{ fontSize: 11, color: C.orange, marginTop: 2, fontWeight: 600 }}>→ {b.cta}</div>
                    </div>
                    <div><span className="position-pill" style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.border}` }}>{pc.label}</span></div>
                    <div style={{ fontSize: 12, color: C.textSub }}>
                      <div>{b.startDate} → {b.endDate}</div>
                      {isExpired && <span style={{ fontSize: 10, color: C.red, fontWeight: 700 }}>⚠️ Expired</span>}
                      {isScheduled && <span style={{ fontSize: 10, color: C.amber, fontWeight: 700 }}>⏳ Scheduled</span>}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: FONT }}>{b.clicks.toLocaleString()}</div>
                    <div>
                      <span className="status-pill" style={{ background: b.active ? C.greenLight : C.redLight, color: b.active ? C.green : C.red, border: `1px solid ${b.active ? C.greenBorder : C.redBorder}` }}>
                        {b.active ? "🟢" : "🔴"} {b.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div style={{ textAlign: "right", display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => setModalBanner(b)}>✏️ Edit</button>
                      <button className="switch" onClick={() => handleToggle(b)} style={{ background: b.active ? C.green : "#D1D5DB" }} title={b.active ? "Deactivate" : "Activate"}>
                        <span className="knob" style={{ left: b.active ? 20 : 2 }} />
                      </button>
                      <button className="btn-red" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => handleDelete(b.id)}>🗑️</button>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", color: C.textSub, fontSize: 14 }}>No banners match your filters</div>}
            </div>

            <div style={{ marginTop: 24, background: C.amberLight, border: `1.5px solid ${C.amberBorder}`, borderRadius: 10, padding: 14, fontSize: 13, color: "#92400E", lineHeight: 1.6 }}>
              ⚠️ <strong>Banner scheduling:</strong> Hero slides rotate automatically every 5 seconds. Priority order determines display sequence (1 = first). Promo bars appear as a fixed strip below the navbar. Seller CTAs appear in the "Sell on Shopdroply" section on the homepage. Expired banners are automatically hidden but remain in the archive.
            </div>
          </div>
        </main>
      </div>
    </>
  );
}