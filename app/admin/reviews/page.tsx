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
                ] as const).map(tab => (
  .sdp-admin-scope button,.sdp-admin-scope input,.sdp-admin-scope textarea{font-family:'Plus Jakarta Sans',sans-serif;}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
  @keyframes scaleIn{from{opacity:0;transform:scale(0.92);}to{opacity:1;transform:scale(1);}}
  .fade-up{animation:fadeUp 0.35s ease both;}
  .scale-in{animation:scaleIn 0.3s ease both;}
  .btn-orange{background:#F97316;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;transition:all 0.15s;display:inline-flex;align-items:center;justify-content:center;gap:8px;}
  .btn-orange:hover{background:#EA6C0A;transform:translateY(-1px);box-shadow:0 4px 18px rgba(249,115,22,0.28);}
  .btn-green{background:#16A34A;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;transition:all 0.15s;display:inline-flex;align-items:center;justify-content:center;gap:8px;}
  .btn-green:hover{background:#15803D;transform:translateY(-1px);}
  .btn-red{background:#FEF2F2;color:#DC2626;border:1.5px solid #FECACA;border-radius:10px;font-weight:600;cursor:pointer;transition:all 0.15s;display:inline-flex;align-items:center;justify-content:center;gap:6px;}
  .btn-red:hover{background:#DC2626;color:#fff;}
  .btn-ghost{background:#fff;border:1.5px solid #E5E7EB;border-radius:10px;color:#374151;font-weight:600;cursor:pointer;transition:all 0.15s;display:inline-flex;align-items:center;justify-content:center;gap:6px;}
  .btn-ghost:hover{border-color:#F97316;color:#F97316;background:#FFF7ED;}
  .sdp-input{width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:14px;color:#1A1A1A;outline:none;transition:border-color 0.15s,box-shadow 0.15s;background:#fff;}
  .sdp-input:focus{border-color:#F97316;box-shadow:0 0 0 3px rgba(249,115,22,0.1);}
  .review-row{display:grid;grid-template-columns:2fr 1fr 80px 1.5fr 120px 120px 160px;gap:16px;padding:14px 16px;align-items:center;border-bottom:1px solid #F3F4F6;transition:background 0.15s;}
  .review-row:hover{background:#F9FAFB;}
  .status-pill{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;}
  .star{display:inline-block;color:#FBBF24;font-size:14px;}
  .star-empty{display:inline-block;color:#E5E7EB;font-size:14px;}
  @media(max-width:900px){.review-row{grid-template-columns:1fr!important;gap:8px;padding:12px;}.admin-sidebar{display:none!important;}.admin-main{margin-left:0!important;}.stats-row{grid-template-columns:repeat(2,1fr)!important;}}
`;

const STATUS_CONFIG = {
  approved: { label: "Approved", color: C.green, bg: C.greenLight, border: C.greenBorder, icon: "✅" },
  pending:  { label: "Pending",  color: C.amber, bg: C.amberLight, border: C.amberBorder, icon: "⏳" },
  flagged:  { label: "Flagged",  color: C.red,   bg: C.redLight,   border: C.redBorder,   icon: "🚩" },
  rejected: { label: "Rejected", color: C.textSub, bg: C.bg,        border: C.border,       icon: "🗑️" },
};

function Stars({ rating }: { rating: number }) {
  return (
    <span>
      {[1,2,3,4,5].map(s => (
        <span key={s} className={s <= rating ? "star" : "star-empty"}>★</span>
      ))}
    </span>
  );
}

function AdminSidebar({ flaggedCount }: { flaggedCount: number }) {
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
          { id: "reviews", label: "Reviews", icon: "⭐", active: true },
          { id: "cms", label: "CMS & Banners", icon: "🎨" },
          { id: "reports", label: "Reports", icon: "📈" },
          { id: "roles", label: "Roles", icon: "🔐" },
        ].map(item => (
          <button key={item.id} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 20px", border: "none", background: item.active ? "rgba(249,115,22,0.15)" : "transparent", color: item.active ? C.orange : "#9CA3AF", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", textAlign: "left", borderRight: item.active ? `3px solid ${C.orange}` : "3px solid transparent" }}>
            <span style={{ fontSize: 15 }}>{item.icon}</span>{item.label}
            {item.id === "reviews" && flaggedCount > 0 && <span style={{ marginLeft: "auto", background: C.red, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>{flaggedCount}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}

type ReviewDetail = {
  id: string;
  productName: string;
  sellerName: string;
  buyerName: string;
  rating: number;
  text: string;
  status: keyof typeof STATUS_CONFIG;
  time: string;
  helpful?: number;
  photos?: number;
  sellerResponse?: string;
  adminNotes?: string;
};

type ReviewDetailModalProps = {
  review: ReviewDetail | null;
  onClose: () => void;
  onApprove: (id: string, notes: string) => Promise<boolean>;
  onReject: (id: string, notes: string) => Promise<boolean>;
  onFlag: (id: string, notes: string) => Promise<boolean>;
  acting: boolean;
};

function ReviewDetailModal({ review, onClose, onApprove, onReject, onFlag, acting }: ReviewDetailModalProps) {
  const [notes, setNotes] = useState(review?.adminNotes || "");
  if (!review) return null;
  const sc = STATUS_CONFIG[review.status];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div className="scale-in" style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.text, fontFamily: FONT }}>Review detail</div>
            <div style={{ fontSize: 12, color: C.textSub }}>{review.id} · {review.time}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textLight }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <div style={{ background: sc.bg, border: `1.5px solid ${sc.border}`, borderRadius: 10, padding: "8px 14px", display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 16 }}>{sc.icon}</span><span style={{ fontSize: 12, fontWeight: 700, color: sc.color }}>{sc.label}</span>
          </div>
          <div style={{ background: C.amberLight, border: `1.5px solid ${C.amberBorder}`, borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700, color: C.amber }}>
            👍 {review.helpful || 0} found helpful
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 20, padding: 14, background: C.bg, borderRadius: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>{review.productName}</div>
            <div style={{ fontSize: 13, color: C.textSub }}>{review.sellerName}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.orange, fontFamily: FONT }}>{review.rating}.0</div>
            <div><Stars rating={review.rating} /></div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Buyer review</div>
          <div style={{ background: C.bg, borderRadius: 8, padding: "12px 14px", fontSize: 14, color: C.text, lineHeight: 1.6 }}>
            <span style={{ fontWeight: 700, color: C.text }}>{review.buyerName}</span> — {review.text}
          </div>
        </div>

        {(review.photos || 0) > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Photos ({review.photos})</div>
            <div style={{ display: "flex", gap: 8 }}>
              {Array.from({ length: Math.min(review.photos || 0, 4) }).map((_, i) => (
                <div key={i} style={{ width: 80, height: 80, borderRadius: 8, background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: C.textLight, border: `1.5px solid ${C.border}` }}>
                  🖼️
                </div>
              ))}
            </div>
          </div>
        )}

        {review.sellerResponse && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Seller response</div>
            <div style={{ background: C.blueLight, border: `1px solid ${C.blueBorder}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, color: C.blue, fontWeight: 600, lineHeight: 1.5 }}>
              {review.sellerResponse}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Admin notes (internal)</label>
          <textarea className="sdp-input" style={{ minHeight: 80, resize: "vertical" }} placeholder="Document your moderation decision..."
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {review.status !== "approved" && (
            <button className="btn-green" style={{ flex: 1, padding: "12px", fontSize: 14, opacity: acting ? 0.6 : 1 }} disabled={acting}
              onClick={async () => { const ok = await onApprove(review.id, notes); if (ok) onClose(); }}>
              {acting ? "Working…" : "✅ Approve review"}
            </button>
          )}
          {review.status !== "flagged" && (
            <button className="btn-red" style={{ flex: 1, padding: "12px", fontSize: 14, opacity: acting ? 0.6 : 1 }} disabled={acting}
              onClick={async () => { const ok = await onFlag(review.id, notes); if (ok) onClose(); }}>
              {acting ? "Working…" : "🚩 Flag review"}
            </button>
          )}
          {review.status !== "rejected" && (
            <button className="btn-ghost" style={{ padding: "12px 20px", fontSize: 14, opacity: acting ? 0.6 : 1 }} disabled={acting}
              onClick={async () => { const ok = await onReject(review.id, notes); if (ok) onClose(); }}>
              {acting ? "Working…" : "🗑️ Reject & hide"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diffMs / 3600000);
  if (hrs < 1) return "Just now";
  if (hrs < 24) return `Today ${new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function fromApi(r : { id: string; buyerId: string; buyerName?: string; sellerId: string; sellerName?: string; listingId: string; productName: string; rating: number; text: string; status: string; photos?: number; helpful?: number; sellerResponse?: string; adminNotes?: string; createdAt: string }) {
  return {
    id: r.id,
    buyerId: r.buyerId,
    buyerName: r.buyerName || r.buyerId,
    sellerId: r.sellerId,
    sellerName: r.sellerName || r.sellerId,
    listingId: r.listingId,
    productName: r.productName,
    rating: r.rating,
    text: r.text,
    status: r.status as keyof typeof STATUS_CONFIG,
    photos: r.photos || 0,
    helpful: r.helpful || 0,
    sellerResponse: r.sellerResponse || "",
    adminNotes: r.adminNotes || "",
    createdAt: r.createdAt,
    time: timeAgo(r.createdAt),
  };
}

type Review = ReturnType<typeof fromApi>;

export default function AdminReviewsScreen() {
  const [reviews, setReviews] = useState<Review[]>([]);
  type ReviewFilter = "all" | "approved" | "pending" | "flagged" | "rejected";
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/reviews");
      const data = await res.json();
      if (data.success) setReviews(data.data.map(fromApi));
      else setToast({ msg: data.error || "Failed to load reviews", type: "error" });
    } catch {
      setToast({ msg: "Failed to load reviews", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (id: string, status: string, notes?: string) => {
    setActing(true);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes: notes || undefined }),
      });
      const data = await res.json();
      if (!data.success) {
        setToast({ msg: data.error || "Action failed", type: "error" });
        return false;
      }
      const updated = fromApi(data.data);
      setReviews(prev => prev.map(r => r.id === id ? { ...updated, buyerName: r.buyerName, sellerName: r.sellerName, time: r.time } : r));
      setToast({ msg: `Review ${status}`, type: "success" });
      return true;
    } catch {
      setToast({ msg: "Action failed", type: "error" });
      return false;
    } finally {
      setActing(false);
    }
  };

  const handleApprove = (id: string, notes?: string) => runAction(id, "approved", notes);
  const handleReject = (id: string, notes?: string) => runAction(id, "rejected", notes);
  const handleFlag = (id: string, notes?: string) => runAction(id, "flagged", notes);

  const filtered = reviews.filter(r => {
    if (filter !== "all" && r.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hit = r.buyerName.toLowerCase().includes(q)
        || r.sellerName.toLowerCase().includes(q)
        || r.productName.toLowerCase().includes(q)
        || r.text.toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });

  const counts = {
    all: reviews.length,
    approved: reviews.filter(r => r.status === "approved").length,
    pending: reviews.filter(r => r.status === "pending").length,
    flagged: reviews.filter(r => r.status === "flagged").length,
    rejected: reviews.filter(r => r.status === "rejected").length,
  };

  const approvedReviews = reviews.filter(r => r.status === "approved");
  const avgRating = approvedReviews.length
    ? (approvedReviews.reduce((a, r) => a + r.rating, 0) / approvedReviews.length).toFixed(1)
    : "0.0";

  if (loading) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <div className="sdp-admin-scope" style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
          <AdminSidebar flaggedCount={0} />
          <main className="admin-main" style={{ marginLeft: 260, flex: 1, padding: 24, color: C.textSub, fontSize: 14 }}>
            Loading reviews…
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
      {selectedReview && (
        <ReviewDetailModal review={selectedReview} onClose={() => setSelectedReview(null)}
          onApprove={handleApprove} onReject={handleReject} onFlag={handleFlag} acting={acting} />
      )}
      <div className="sdp-admin-scope" style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
        <AdminSidebar flaggedCount={counts.flagged} />
        <main className="admin-main" style={{ marginLeft: 260, flex: 1, minWidth: 0 }}>
          <header style={{ height: 64, background: "#fff", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 50 }}>
            <div><h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, fontFamily: FONT }}>Reviews moderation</h1></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-ghost" style={{ padding: "8px 16px", fontSize: 13 }}>📥 Export</button>
              <button className="btn-orange" style={{ padding: "8px 16px", fontSize: 13 }}>⚙️ Review settings</button>
            </div>
          </header>

          <div style={{ padding: "24px", maxWidth: 1300 }}>
            {/* Stats */}
            <div className="stats-row" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { label: "TOTAL REVIEWS", value: counts.all, color: C.text },
                { label: "APPROVED", value: counts.approved, color: C.green },
                { label: "PENDING", value: counts.pending, color: C.amber },
                { label: "FLAGGED", value: counts.flagged, color: C.red },
                { label: "AVG RATING", value: `${avgRating} ★`, color: C.orange },
              ].map((s, i) => (
                <div key={i} style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
                  <div style={{ fontSize: 11, color: C.textSub, fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: FONT }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Filters + Search */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${C.border}`, overflowX: "auto" }}>
                {[
                  { key: "all", label: "All reviews" },
                  { key: "approved", label: "Approved" },
                  { key: "pending", label: "Pending" },
                  { key: "flagged", label: "Flagged" },
                  { key: "rejected", label: "Rejected" },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setFilter(tab.key as ReviewFilter)} style={{ padding: "12px 18px", border: "none", background: "transparent", color: filter === tab.key ? C.orange : C.textSub, fontSize: 14, fontWeight: 600, cursor: "pointer", borderBottom: `2px solid ${filter === tab.key ? C.orange : "transparent"}`, marginBottom: -2, whiteSpace: "nowrap", transition: "all 0.15s" }}>
                    {tab.label}
                    <span style={{ marginLeft: 8, background: filter === tab.key ? C.orange : C.bg, color: filter === tab.key ? "#fff" : C.textSub, fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>{counts[tab.key]}</span>
                  </button>
                ))}
              </div>
              <div style={{ position: "relative", maxWidth: 300, minWidth: 200 }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: C.textLight }}>🔍</span>
                <input className="sdp-input" style={{ paddingLeft: 38 }} placeholder="Search by product, buyer, or seller..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            {/* Reviews table */}
            <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div className="review-row" style={{ background: C.bg, padding: "10px 16px", fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <div>Product & Buyer</div><div>Seller</div><div>Rating</div><div>Review</div><div>Status</div><div>Date</div><div style={{ textAlign: "right" }}>Actions</div>
              </div>
              {filtered.map((r, i) => {
                const sc = STATUS_CONFIG[r.status];
                return (
                  <div key={r.id} className="review-row fade-up" style={{ animationDelay: `${i * 0.03}s`, cursor: "pointer" }} onClick={() => setSelectedReview(r)}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.productName}</div>
                      <div style={{ fontSize: 11, color: C.textSub }}>{r.buyerName} · 👍 {r.helpful}</div>
                    </div>
                    <div style={{ fontSize: 12, color: C.textSub }}>{r.sellerName}</div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: C.orange, fontFamily: FONT }}>{r.rating}.0</div>
                      <div><Stars rating={r.rating} /></div>
                    </div>
                    <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {r.status === "rejected" ? "[Review removed by moderator]" : r.text}
                    </div>
                    <div><span className="status-pill" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{sc.icon} {sc.label}</span></div>
                    <div style={{ fontSize: 12, color: C.textSub }}>{r.time}</div>
                    <div style={{ textAlign: "right" }} onClick={e => e.stopPropagation()}>
                      {r.status === "pending" && (
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button className="btn-green" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => handleApprove(r.id)}>✅</button>
                          <button className="btn-red" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => handleReject(r.id)}>🗑️</button>
                        </div>
                      )}
                      {r.status === "approved" && (
                        <button className="btn-red" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => handleFlag(r.id)}>🚩</button>
                      )}
                      {r.status === "flagged" && (
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button className="btn-green" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => handleApprove(r.id)}>✅</button>
                          <button className="btn-red" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => handleReject(r.id)}>🗑️</button>
                        </div>
                      )}
                      {r.status === "rejected" && (
                        <button className="btn-ghost" style={{ padding: "5px 12px", fontSize: 11 }} onClick={() => setSelectedReview(r)}>View</button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", color: C.textSub, fontSize: 14 }}>No reviews match your filters</div>}
            </div>

            <div style={{ marginTop: 24, background: C.blueLight, border: `1.5px solid ${C.blueBorder}`, borderRadius: 10, padding: 14, fontSize: 13, color: "#1E40AF", lineHeight: 1.6 }}>
              ℹ️ <strong>Moderation policy:</strong> All reviews go through automatic screening for profanity and spam before appearing. 1-star and 2-star reviews are held for manual approval to prevent fake negative attacks. Flagged reviews are investigated within 24 hours. Sellers can respond to reviews, but cannot edit or delete them.
            </div>
          </div>
        </main>
      </div>
    </>
  );
}