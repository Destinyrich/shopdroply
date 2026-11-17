"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin/Sidebar";
import type { Category } from "@/lib/db-interface";

// ─── Types ─────────────────────────────────────────────────────────
/** A category as the page uses it (commission is a percent, not a decimal). */
type CategoryRow = {
  id: string;
  name: string;
  icon: string;
  parent: string | null;
  listings: number;
  commission: number;
  attributes: string[];
  active: boolean;
  featured: boolean;
};
/** The modal's form values — commission is a string while the admin is typing. */
type CategoryForm = Omit<CategoryRow, "commission"> & { commission: number | string };
type FilterKey = "all" | "active" | "inactive" | "featured";
type ApiList = { success: boolean; data?: Category[]; error?: string };
type ApiOne = { success: boolean; data?: Category; error?: string };

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
  .cat-row{display:grid;grid-template-columns:40px 1.5fr 1fr 100px 100px 100px 160px;gap:16px;padding:14px 16px;align-items:center;border-bottom:1px solid #F3F4F6;transition:background 0.15s;}
  .cat-row:hover{background:#F9FAFB;}
  .attr-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:#F3F4F6;color:#4B5563;border:1px solid #E5E7EB;}
  .status-pill{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;}
  @media(max-width:768px){.cat-row{grid-template-columns:1fr!important;gap:8px;padding:12px;}.admin-sidebar{display:none!important;}.admin-main{margin-left:0!important;}.stats-row{grid-template-columns:repeat(2,1fr)!important;}}
`;



function CategoryModal({ category, allCategories, onClose, onSave, saving }: {
  category: CategoryRow | null;
  allCategories: CategoryRow[];
  onClose: () => void;
  onSave: (form: CategoryForm) => Promise<boolean>;
  saving: boolean;
}) {
  const [initial] = useState<CategoryForm>(() => category || {
    id: "", name: "", icon: "", parent: null, commission: 10, attributes: [], active: true, featured: false, listings: 0
  });
  const [form, setForm] = useState(initial);
  const [attrInput, setAttrInput] = useState("");

  // Unsaved-edit guard for backdrop / ✕ / Cancel (Save closes directly)
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const tryClose = () => {
    if (!dirty || window.confirm("Discard your changes?")) onClose();
  };
  // A category that already has subcategories can't itself become a subcategory
  const hasChildren = !!form.id && allCategories.some(c => c.parent === form.id);

  const handleAddAttr = () => {
    if (attrInput.trim() && !form.attributes.includes(attrInput.trim())) {
      setForm(prev => ({ ...prev, attributes: [...prev.attributes, attrInput.trim()] }));
      setAttrInput("");
    }
  };

  const handleRemoveAttr = (attr: string) => {
    setForm(prev => ({ ...prev, attributes: prev.attributes.filter(a => a !== attr) }));
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={tryClose}>
      <div className="scale-in" style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text, fontFamily: FONT }}>{category ? "Edit category" : "Add new category"}</div>
          <button onClick={tryClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textLight }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Category name</label>
              <input className="sdp-input" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Fashion" />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Icon (emoji)</label>
              <input className="sdp-input" value={form.icon} onChange={e => setForm(prev => ({ ...prev, icon: e.target.value }))} placeholder="👗" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Parent category</label>
              <select className="sdp-input" disabled={hasChildren} title={hasChildren ? "This category has subcategories, so it must stay top-level" : undefined} value={form.parent || ""} onChange={e => setForm(prev => ({ ...prev, parent: e.target.value || null }))}>
                <option value="">None (top-level)</option>
                {allCategories.filter(c => c.id !== form.id && !c.parent).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {hasChildren && <div style={{ fontSize: 11, color: C.textSub, marginTop: 4 }}>Has subcategories — must stay top-level</div>}
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Commission rate</label>
              <div style={{ position: "relative" }}>
                <input className="sdp-input" type="number" min="1" max="50" value={form.commission} onChange={e => setForm(prev => ({ ...prev, commission: Number(e.target.value) }))} style={{ paddingRight: 30 }} />
                <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: C.textSub }}>%</span>
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Attributes (filters for buyers)</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input className="sdp-input" value={attrInput} onChange={e => setAttrInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddAttr()} placeholder="e.g. Size, Colour, Brand..." />
              <button className="btn-orange" onClick={handleAddAttr} style={{ padding: "10px 16px", fontSize: 13 }}>+ Add</button>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {form.attributes.map(attr => (
                <span key={attr} className="attr-chip">
                  {attr}
                  <button onClick={() => handleRemoveAttr(attr)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.red, marginLeft: 2 }}>✕</button>
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.textMid }}>Active</span>
              <button
                onClick={() => setForm(prev => ({ ...prev, active: !prev.active }))}
                style={{ width: 40, height: 22, borderRadius: 11, background: form.active ? C.green : C.border, position: "relative", cursor: "pointer", border: "none", transition: "background 0.2s" }}
              >
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: form.active ? 20 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.textMid }}>Featured on homepage</span>
              <button
                onClick={() => setForm(prev => ({ ...prev, featured: !prev.featured }))}
                style={{ width: 40, height: 22, borderRadius: 11, background: form.featured ? C.orange : C.border, position: "relative", cursor: "pointer", border: "none", transition: "background 0.2s" }}
              >
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: form.featured ? 20 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button
              className="btn-orange"
              style={{ flex: 1, padding: "12px", fontSize: 14, opacity: saving ? 0.6 : 1 }}
              disabled={saving}
              onClick={async () => {
                const ok = await onSave(form);
                if (ok) onClose();
              }}
            >
              {saving ? "Saving…" : `💾 ${category ? "Save changes" : "Create category"}`}
            </button>
            <button className="btn-ghost" style={{ padding: "12px 20px", fontSize: 14 }} onClick={tryClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Map API Category (listingCount, commissionRate as decimal) -> UI shape (listings, commission as %)
function fromApi(c: Category): CategoryRow {
  return {
    id: c.id,
    name: c.name,
    icon: c.icon,
    parent: c.parent || null,
    listings: c.listingCount ?? 0,
    commission: Number(((c.commissionRate ?? 0) * 100).toFixed(2)),
    attributes: c.attributes || [],
    active: c.active !== false,
    featured: !!c.featured,
  };
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState<CategoryRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  // auto-dismiss error toasts
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Download the current list as a CSV file
  const exportCsv = () => {
    const rows = [
      ["Name", "Parent", "Commission %", "Listings", "Active", "Featured", "Attributes"],
      ...categories.map(c => [
        c.name,
        categories.find(p => p.id === c.parent)?.name || "",
        c.commission, c.listings, c.active ? "yes" : "no", c.featured ? "yes" : "no",
        c.attributes.join("; "),
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "categories.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/categories");
      const data: ApiList = await res.json();
      if (data.success && data.data) setCategories(data.data.map(fromApi));
      else setToast(data.error || "Failed to load categories");
    } catch {
      setToast("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const openNewModal = () => {
    setModalCategory(null);
    setModalOpen(true);
  };

  const openEditModal = (c: CategoryRow) => {
    setModalCategory(c);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalCategory(null);
  };

  const handleToggle = async (id: string) => {
    const current = categories.find(c => c.id === id);
    if (!current) return;
    const nextActive = !current.active;
    // optimistic update
    setCategories(prev => prev.map(c => c.id === id ? { ...c, active: nextActive } : c));
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextActive }),
      });
      const data = await res.json();
      if (!data.success) {
        setCategories(prev => prev.map(c => c.id === id ? { ...c, active: current.active } : c));
        setToast(data.error || "Failed to update category");
      }
    } catch {
      setCategories(prev => prev.map(c => c.id === id ? { ...c, active: current.active } : c));
      setToast("Failed to update category");
    }
  };

  // Returns true on success (so the modal knows whether to close)
  const handleSaveCategory = async (form: CategoryForm): Promise<boolean> => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        icon: form.icon,
        parent: form.parent || null,
        commission: Number(form.commission),
        attributes: form.attributes,
        active: form.active,
        featured: form.featured,
      };

      const res = modalCategory
        ? await fetch(`/api/admin/categories/${modalCategory.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const data: ApiOne = await res.json();
      if (!data.success || !data.data) {
        setToast(data.error || "Failed to save category");
        return false;
      }

      const savedCat = fromApi(data.data);
      setCategories(prev =>
        modalCategory
          ? prev.map(c => (c.id === savedCat.id ? savedCat : c))
          : [...prev, savedCat]
      );
      flashSaved();
      return true;
    } catch {
      setToast("Failed to save category");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const filtered = categories.filter(c => {
    if (filter === "active" && !c.active) return false;
    if (filter === "inactive" && c.active) return false;
    if (filter === "featured" && !c.featured) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: categories.length,
    active: categories.filter(c => c.active).length,
    inactive: categories.filter(c => !c.active).length,
    featured: categories.filter(c => c.featured).length,
  };

  const totalListings = categories.reduce((a, c) => a + c.listings, 0);

  if (loading) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <div className="sdp-admin-scope" style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
          <AdminSidebar activeTab={""} admin={null} mobileOpen={false} setMobileOpen={function (v: boolean): void {
            throw new Error("Function not implemented.");
          } } />
          <main className="admin-main" style={{ marginLeft: 260, flex: 1, padding: 24, color: C.textSub, fontSize: 14 }}>
            Loading categories…
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 600, background: "#fff", border: `1.5px solid ${C.redBorder}`, color: C.red, padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 18px rgba(0,0,0,0.1)" }}>
          ⚠️ {toast}
          <button onClick={() => setToast("")} style={{ marginLeft: 10, background: "none", border: "none", cursor: "pointer", color: C.textLight }}>✕</button>
        </div>
      )}
      {modalOpen && (
        <CategoryModal category={modalCategory} allCategories={categories} saving={saving} onClose={closeModal} onSave={handleSaveCategory} />
      )}
      <div className="sdp-admin-scope" style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
        <AdminSidebar activeTab={""} admin={null} mobileOpen={false} setMobileOpen={function (v: boolean): void {
          throw new Error("Function not implemented.");
        } } />
        <main className="admin-main" style={{ marginLeft: 260, flex: 1, minWidth: 0 }}>
          <header style={{ height: 64, background: "#fff", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 50 }}>
            <div><h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, fontFamily: FONT }}>Category management</h1></div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {saved && (
                <span style={{ fontSize: 13, fontWeight: 700, color: C.green, background: C.greenLight, border: `1px solid ${C.greenBorder}`, padding: "6px 14px", borderRadius: 20 }}>✅ Saved</span>
              )}
              <button className="btn-ghost" onClick={exportCsv} disabled={categories.length === 0} style={{ padding: "8px 16px", fontSize: 13 }}>📥 Export</button>
              <button className="btn-orange" onClick={openNewModal} style={{ padding: "8px 20px", fontSize: 14 }}>+ Add category</button>
            </div>
          </header>

          <div style={{ padding: "24px", maxWidth: 1200 }}>
            {/* Stats */}
            <div className="stats-row" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
              <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 11, color: C.textSub, fontWeight: 600, marginBottom: 4 }}>TOTAL CATEGORIES</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.orange, fontFamily: FONT }}>{counts.all}</div>
              </div>
              <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 11, color: C.textSub, fontWeight: 600, marginBottom: 4 }}>ACTIVE</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.green, fontFamily: FONT }}>{counts.active}</div>
              </div>
              <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 11, color: C.textSub, fontWeight: 600, marginBottom: 4 }}>FEATURED</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.purple, fontFamily: FONT }}>{counts.featured}</div>
              </div>
              <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 11, color: C.textSub, fontWeight: 600, marginBottom: 4 }}>TOTAL LISTINGS</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.blue, fontFamily: FONT }}>{totalListings.toLocaleString()}</div>
              </div>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${C.border}`, overflowX: "auto" }}>
                {([
                  { key: "all", label: "All categories" },
                  { key: "active", label: "Active" },
                  { key: "inactive", label: "Inactive" },
                  { key: "featured", label: "Featured" },
                ] as const).map(tab => (
                  <button key={tab.key} onClick={() => setFilter(tab.key)} style={{ padding: "12px 18px", border: "none", background: "transparent", color: filter === tab.key ? C.orange : C.textSub, fontSize: 14, fontWeight: 600, cursor: "pointer", borderBottom: `2px solid ${filter === tab.key ? C.orange : "transparent"}`, marginBottom: -2, whiteSpace: "nowrap", transition: "all 0.15s" }}>
                    {tab.label}
                    <span style={{ marginLeft: 8, background: filter === tab.key ? C.orange : C.bg, color: filter === tab.key ? "#fff" : C.textSub, fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>{counts[tab.key]}</span>
                  </button>
                ))}
              </div>
              <div style={{ position: "relative", maxWidth: 300, minWidth: 200 }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: C.textLight }}>🔍</span>
                <input className="sdp-input" style={{ paddingLeft: 38 }} placeholder="Search categories..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            {/* Categories table */}
            <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div className="cat-row" style={{ background: C.bg, padding: "10px 16px", fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <div></div><div>Category</div><div>Parent / Attributes</div><div>Listings</div><div>Commission</div><div>Status</div><div style={{ textAlign: "right" }}>Actions</div>
              </div>
              {filtered.map((c, i) => (
                <div key={c.id} className="cat-row fade-up" style={{ animationDelay: `${i * 0.03}s` }}>
                  <div style={{ fontSize: 22, textAlign: "center" }}>{c.icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
                      {c.name}
                      {c.featured && <span style={{ fontSize: 9, fontWeight: 700, color: C.purple, background: C.purpleLight, padding: "1px 5px", borderRadius: 6 }}>★ Featured</span>}
                    </div>
                    <div style={{ fontSize: 11, color: C.textSub }}>{c.parent ? `Sub of ${categories.find(p => p.id === c.parent)?.name || c.parent}` : "Top-level category"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {c.attributes.slice(0, 3).map(attr => (
                      <span key={attr} className="attr-chip">{attr}</span>
                    ))}
                    {c.attributes.length > 3 && <span className="attr-chip">+{c.attributes.length - 3}</span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: FONT }}>{c.listings.toLocaleString()}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.orange, fontFamily: FONT }}>{c.commission}%</div>
                  <div>
                    <span className="status-pill" style={{ background: c.active ? C.greenLight : C.redLight, color: c.active ? C.green : C.red, border: `1px solid ${c.active ? C.greenBorder : C.redBorder}` }}>
                      {c.active ? "🟢" : "🔴"} {c.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div style={{ textAlign: "right", display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => openEditModal(c)}>✏️</button>
                    <button
                      onClick={() => handleToggle(c.id)}
                      style={{ width: 40, height: 22, borderRadius: 11, background: c.active ? C.green : C.border, position: "relative", cursor: "pointer", border: "none", transition: "background 0.2s" }}
                    >
                      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: c.active ? 20 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                    </button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", color: C.textSub, fontSize: 14 }}>No categories match your filters</div>}
            </div>

            <div style={{ marginTop: 24, background: C.blueLight, border: `1.5px solid ${C.blueBorder}`, borderRadius: 10, padding: 14, fontSize: 13, color: "#1E40AF", lineHeight: 1.6 }}>
              ℹ️ <strong>How categories work:</strong> Top-level categories appear on the homepage navigation. Subcategories (e.g. Phones under Electronics) appear in dropdowns. Attributes define the filters buyers see on search — Size, Colour, Brand, etc. Commission rates here link directly to the Fee & Commission settings screen. Disabling a category hides all listings under it from search.
            </div>
          </div>
        </main>
      </div>
    </>
  );
}