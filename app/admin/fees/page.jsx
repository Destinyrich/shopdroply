"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin/Sidebar";

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
  .sdp-admin-scope button,.sdp-admin-scope input,.sdp-admin-scope select{font-family:'Plus Jakarta Sans',sans-serif;}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
  .fade-up{animation:fadeUp 0.35s ease both;}
  .btn-orange{background:#F97316;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;transition:all 0.15s;display:inline-flex;align-items:center;justify-content:center;gap:8px;}
  .btn-orange:hover{background:#EA6C0A;transform:translateY(-1px);box-shadow:0 4px 18px rgba(249,115,22,0.28);}
  .btn-ghost{background:#fff;border:1.5px solid #E5E7EB;border-radius:10px;color:#374151;font-weight:600;cursor:pointer;transition:all 0.15s;display:inline-flex;align-items:center;justify-content:center;gap:6px;}
  .btn-ghost:hover{border-color:#F97316;color:#F97316;background:#FFF7ED;}
  .sdp-input{width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:14px;color:#1A1A1A;outline:none;transition:border-color 0.15s,box-shadow 0.15s;background:#fff;}
  .sdp-input:focus{border-color:#F97316;box-shadow:0 0 0 3px rgba(249,115,22,0.1);}
  .slider{-webkit-appearance:none;width:100%;height:6px;border-radius:3px;background:#E5E7EB;outline:none;}
  .slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:18px;height:18px;border-radius:50%;background:#F97316;cursor:pointer;box-shadow:0 2px 6px rgba(249,115,22,0.3);}
  .slider::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#F97316;cursor:pointer;border:none;box-shadow:0 2px 6px rgba(249,115,22,0.3);}
  @media(max-width:768px){.admin-sidebar{display:none!important;}.admin-main{margin-left:0!important;}.fee-grid{grid-template-columns:1fr!important;}}
`;



function FeeCard({ fee, onChange, delay }) {
  const [localRate, setLocalRate] = useState(fee.rate);
  const examplePrice = 50000;
  const commission = Math.min(Math.round(examplePrice * (localRate / 100)), fee.cap);
  const sellerReceives = examplePrice - commission;

  return (
    <div className="fade-up" style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 20, animationDelay: `${delay}s` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{fee.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: C.orange, fontFamily: FONT }}>{localRate}%</span>
          <button
            onClick={() => onChange(fee.id, "active", !fee.active)}
            style={{
              width: 40, height: 22, borderRadius: 11, background: fee.active ? C.green : C.border,
              position: "relative", cursor: "pointer", border: "none", transition: "background 0.2s",
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: "50%", background: "#fff",
              position: "absolute", top: 2, left: fee.active ? 20 : 2,
              transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textSub, marginBottom: 6 }}>
          <span>Commission rate</span>
          <span>{localRate}%</span>
        </div>
        <input
          type="range" min="1" max="25" value={localRate}
          className="slider"
          onChange={e => { setLocalRate(Number(e.target.value)); onChange(fee.id, "rate", Number(e.target.value)); }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div style={{ background: C.bg, borderRadius: 8, padding: 10 }}>
          <div style={{ fontSize: 10, color: C.textSub, fontWeight: 600, marginBottom: 2 }}>FEE CAP</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: FONT }}>₦{fee.cap.toLocaleString()}</div>
        </div>
        <div style={{ background: C.bg, borderRadius: 8, padding: 10 }}>
          <div style={{ fontSize: 10, color: C.textSub, fontWeight: 600, marginBottom: 2 }}>MIN FEE</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: FONT }}>₦{fee.min.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ background: C.orangeLight, border: `1px solid ${C.orangeBorder}`, borderRadius: 8, padding: 10 }}>
        <div style={{ fontSize: 11, color: "#92400E", fontWeight: 600, marginBottom: 4 }}>Example: ₦50,000 sale</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: "#92400E" }}>Shopdroply keeps</span>
          <span style={{ color: C.orange, fontWeight: 700, fontFamily: FONT }}>₦{commission.toLocaleString()}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: "#92400E" }}>Seller receives</span>
          <span style={{ color: C.green, fontWeight: 700, fontFamily: FONT }}>₦{sellerReceives.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// Map API Category -> fee-card UI shape
function feeFromApi(c) {
  return {
    id: c.id,
    name: c.name,
    rate: Math.round((c.commissionRate ?? 0) * 100),
    cap: c.feeCap ?? 50000,
    min: c.feeMin ?? 500,
    active: c.active !== false,
  };
}

export default function CommissionFeeSettingsScreen() {
  const [fees, setFees] = useState([]);
  const [settings, setSettings] = useState({ paymentProcessingFee: 1.5, minimumPayout: 1000, payoutSchedule: "Tuesday & Friday (bi-weekly)" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [catRes, setRes] = await Promise.all([
        fetch("/api/admin/categories"),
        fetch("/api/admin/settings"),
      ]);
      const catData = await catRes.json();
      const setData = await setRes.json();
      if (catData.success) setFees(catData.data.map(feeFromApi));
      else setToast(catData.error || "Failed to load categories");
      if (setData.success) setSettings(setData.data);
      else setToast(setData.error || "Failed to load settings");
    } catch {
      setToast("Failed to load fee settings");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (id, field, value) => {
    setFees(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const handleSettingChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const results = await Promise.all([
        ...fees.map(f =>
          fetch(`/api/admin/categories/${f.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ commission: f.rate, active: f.active }),
          }).then(r => r.json())
        ),
        fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        }).then(r => r.json()),
      ]);
      const failed = results.find(r => !r.success);
      if (failed) {
        setToast(failed.error || "Some changes failed to save");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setToast("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const avgRate = fees.length ? Math.round(fees.reduce((a, f) => a + f.rate, 0) / fees.length) : 0;
  const activeCategories = fees.filter(f => f.active).length;

  if (loading) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <div className="sdp-admin-scope" style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
          <AdminSidebar />
          <main className="admin-main" style={{ marginLeft: 260, flex: 1, padding: 24, color: C.textSub, fontSize: 14 }}>
            Loading fee settings…
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
      <div className="sdp-admin-scope" style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
        <AdminSidebar />
        <main className="admin-main" style={{ marginLeft: 260, flex: 1, minWidth: 0 }}>
          <header style={{ height: 64, background: "#fff", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 50 }}>
            <div><h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, fontFamily: FONT }}>Commission & fee settings</h1></div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {saved && (
                <span style={{ fontSize: 13, fontWeight: 700, color: C.green, background: C.greenLight, border: `1px solid ${C.greenBorder}`, padding: "6px 14px", borderRadius: 20 }}>
                  ✅ Saved
                </span>
              )}
              <button className="btn-orange" onClick={handleSave} disabled={saving} style={{ padding: "8px 20px", fontSize: 14, opacity: saving ? 0.6 : 1 }}>
                {saving ? "Saving…" : "💾 Save all changes"}
              </button>
            </div>
          </header>

          <div style={{ padding: "24px", maxWidth: 1100 }}>
            {/* Summary bar */}
            <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
              <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
                <div style={{ fontSize: 12, color: C.textSub, fontWeight: 600, marginBottom: 4 }}>AVG COMMISSION RATE</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.orange, fontFamily: FONT }}>{avgRate}%</div>
              </div>
              <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
                <div style={{ fontSize: 12, color: C.textSub, fontWeight: 600, marginBottom: 4 }}>ACTIVE CATEGORIES</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.green, fontFamily: FONT }}>{activeCategories} / {fees.length}</div>
              </div>
              <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
                <div style={{ fontSize: 12, color: C.textSub, fontWeight: 600, marginBottom: 4 }}>PLATFORM FEE (PAYMENT)</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.blue, fontFamily: FONT }}>{settings.paymentProcessingFee}%</div>
                <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>Passed through Paystack/Flutterwave</div>
              </div>
            </div>

            {/* Global settings */}
            <div className="fade-up" style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 24, animationDelay: "0.1s" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>Global settings</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Payment processing fee</label>
                  <div style={{ position: "relative" }}>
                    <input className="sdp-input" type="number" step="0.1" min="0" max="10" value={settings.paymentProcessingFee} onChange={e => handleSettingChange("paymentProcessingFee", Number(e.target.value))} style={{ paddingRight: 30 }} />
                    <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: C.textSub }}>%</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}>Absorbed by platform or passed to buyer</div>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Minimum payout</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, fontWeight: 700, color: C.textMid }}>₦</span>
                    <input className="sdp-input" type="number" min="0" style={{ paddingLeft: 28 }} value={settings.minimumPayout} onChange={e => handleSettingChange("minimumPayout", Number(e.target.value))} />
                  </div>
                  <div style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}>Lowest amount a seller can withdraw</div>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Payout schedule</label>
                  <select className="sdp-input" value={settings.payoutSchedule} onChange={e => handleSettingChange("payoutSchedule", e.target.value)}>
                    <option>Tuesday & Friday (bi-weekly)</option>
                    <option>Daily</option>
                    <option>Weekly (Fridays)</option>
                    <option>Monthly</option>
                  </select>
                  <div style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}>When sellers receive their earnings</div>
                </div>
              </div>
            </div>

            {/* Category fees */}
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>Category commission rates</div>
            <div className="fee-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              {fees.map((fee, i) => (
                <FeeCard key={fee.id} fee={fee} onChange={handleChange} delay={i * 0.05} />
              ))}
            </div>

            {/* Note */}
            <div style={{ marginTop: 24, background: C.amberLight, border: `1.5px solid ${C.amberBorder}`, borderRadius: 10, padding: 14, fontSize: 13, color: "#92400E", lineHeight: 1.6 }}>
              ⚠️ <strong>Important:</strong> Changes to commission rates apply only to new orders. Existing escrow transactions use the rate that was active at the time of purchase. Always notify sellers 7 days before increasing rates.
            </div>
          </div>
        </main>
      </div>
    </>
  );
}