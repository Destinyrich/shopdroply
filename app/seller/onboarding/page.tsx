"use client";

// import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════════════
//  Shopdroply — Seller Onboarding Screen (5 Steps)
//  Design: White bg, Orange #F97316 buttons, Near-black #1A1A1A text
//  Stack: React.js + inline styles (no external CSS needed)
// ═══════════════════════════════════════════════════════════════════

// ─── Design Tokens ─────────────────────────────────────────────────
const C = {
  orange: "#F97316",
  orangeHover: "#EA580C",
  orangeLight: "#FFF7ED",
  orangeBorder: "#FED7AA",
  green: "#16A34A",
  greenLight: "#F0FDF4",
  greenBorder: "#BBF7D0",
  red: "#DC2626",
  redLight: "#FEF2F2",
  redBorder: "#FECACA",
  amber: "#D97706",
  amberLight: "#FFFBEB",
  blue: "#2563EB",
  blueLight: "#EFF6FF",
  bg: "#F9FAFB",
  border: "#E5E7EB",
  text: "#1A1A1A",
  textMid: "#374151",
  textSub: "#6B7280",
  textLight: "#9CA3AF",
};

const FONT = "'Plus Jakarta Sans', sans-serif";
const BANKS = [
  "Kuda",
  "Moniepoint",
  "PalmPay",
  "OPay",
  "GTBank",
  "UBA",
  "Zenith",
  "First Bank",
  "Access",
  "FCMB",
];

// ─── Global CSS (injected via <style>) ─────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Plus Jakarta Sans', sans-serif; background: #fff; color: #1A1A1A; -webkit-font-smoothing: antialiased; }
  button, input, select, textarea { font-family: 'Plus Jakarta Sans', sans-serif; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  @keyframes slideLeft { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }

  .fade-up { animation: fadeUp 0.4s cubic-bezier(0.19,1,0.22,1) both; }
  .scale-in { animation: scaleIn 0.35s cubic-bezier(0.19,1,0.22,1) both; }
  .slide-left { animation: slideLeft 0.35s cubic-bezier(0.19,1,0.22,1) both; }

  .sdp-btn-orange {
    background: #F97316; color: #fff; border: none; border-radius: 10px;
    font-weight: 700; font-size: 14px; cursor: pointer;
    transition: all 0.15s; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 12px 24px;
  }
  .sdp-btn-orange:hover { background: #EA580C; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(249,115,22,0.25); }
  .sdp-btn-orange:active { transform: translateY(0); }
  .sdp-btn-orange:disabled { background: #D1D5DB; cursor: not-allowed; transform: none; box-shadow: none; }

  .sdp-btn-ghost {
    background: #fff; border: 1.5px solid #E5E7EB; border-radius: 10px; color: #374151;
    font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.15s;
    display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 12px 20px;
  }
  .sdp-btn-ghost:hover { border-color: #F97316; color: #F97316; background: #FFF7ED; }

  .sdp-input {
    width: 100%; padding: 12px 14px; border: 1.5px solid #E5E7EB; border-radius: 10px;
    font-size: 15px; color: #1A1A1A; outline: none; transition: all 0.15s; background: #fff;
  }
  .sdp-input:focus { border-color: #F97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }
  .sdp-input::placeholder { color: #9CA3AF; }
  .sdp-input.error { border-color: #DC2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.08); animation: shake 0.3s ease; }

  .tier-card {
    border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 20px; cursor: pointer;
    transition: all 0.2s; background: #fff; position: relative;
  }
  .tier-card:hover { border-color: #FED7AA; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
  .tier-card.selected { border-color: #F97316; background: #FFF7ED; box-shadow: 0 0 0 3px rgba(249,115,22,0.08); }

  .bank-chip {
    border: 1.5px solid #E5E7EB; border-radius: 8px; padding: 8px 12px; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; color: #374151; background: #fff;
  }
  .bank-chip:hover { border-color: #F97316; color: #F97316; background: #FFF7ED; }
  .bank-chip.selected { border-color: #F97316; background: #FFF7ED; color: #F97316; }

  @media (max-width: 640px) {
    .tier-grid { grid-template-columns: 1fr !important; }
    .form-grid { grid-template-columns: 1fr !important; }
  }
`;

// ═══════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function SellerOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [tier, setTier] = useState(null);
  const [nin, setNin] = useState("");
  const [bvn, setBvn] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [bank, setBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [resendSec, setResendSec] = useState(0);
  const otpRefs = useRef([]);

  const [apiError, setApiError] = useState<string | null>(null);

  // ─── Redirect if already a seller ───
  useEffect(() => {
    fetch("/api/seller/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) router.push("/seller/dashboard");
      })
      .catch(() => {});
  }, [router]);

  // ─── Validation Helpers ──────────────────────────────────────────
  const validateStep2 = () => {
    const e = {};
    if (nin.length !== 11 || !/^\d+$/.test(nin))
      e.nin = "NIN must be exactly 11 digits";
    if (bvn.length !== 11 || !/^\d+$/.test(bvn))
      e.bvn = "BVN must be exactly 11 digits";
    if (!dob) e.dob = "Date of birth is required";
    if (!phone || phone.length < 10)
      e.phone = "Enter a valid Nigerian phone number";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // const handleStep2Next = () => {
  //   if (!validateStep2()) return;
  //   setLoading(true);
  //   setTimeout(() => { setLoading(false); setStep(3); setResendSec(59); }, 1500);
  // };

  // const handleStep3Next = () => {
  //   const code = otp.join("");
  //   if (code.length !== 6) { setErrors({ otp: "Enter all 6 digits" }); return; }
  //   setErrors({}); setStep(4);

  // };

  const handleStep2Next = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch("/api/seller/onboarding/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!data.success) {
        setErrors({ phone: data.error || "Failed to send OTP" });
        setLoading(false);
        return;
      }
      setLoading(false);
      setStep(3);
      setResendSec(59);
    } catch {
      setErrors({ phone: "Network error. Check your terminal for the OTP." });
      setLoading(false);
    }
  };

  const handleStep3Next = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setErrors({ otp: "Enter all 6 digits" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/seller/onboarding/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!data.success) {
        setErrors({ otp: data.error || "Invalid code" });
        setLoading(false);
        return;
      }
      setErrors({});
      setLoading(false);
      setStep(4);
    } catch {
      setErrors({ otp: "Network error" });
      setLoading(false);
    }
  };

  const handleAccountInput = (val) => {
    const clean = val.replace(/\D/g, "").slice(0, 10);
    setAccountNumber(clean);
    setErrors((prev) => ({ ...prev, accountNumber: null }));
    if (clean.length === 10 && bank) {
      setTimeout(() => setAccountName("Adebayo Chioma Emeka"), 600);
    } else {
      setAccountName("");
    }
  };

  // const handleStep4Next = () => {
  //   const e = {};
  //   if (!bank) e.accountNumber = "Select a bank";
  //   if (accountNumber.length !== 10) e.accountNumber = "Account number must be 10 digits";
  //   if (Object.keys(e).length > 0) { setErrors(e); return; }
  //   setLoading(true);
  //   setTimeout(() => { setLoading(false); setStep(5); }, 1200);
  // };

  const handleStep4Next = async () => {
    const e: Record<string, string> = {};
    if (!bank) e.accountNumber = "Select a bank";
    if (accountNumber.length !== 10)
      e.accountNumber = "Account number must be 10 digits";
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch("/api/seller/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          nin,
          bvn,
          dob,
          phone,
          bank,
          accountNumber,
          accountName,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setApiError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      setLoading(false);
      setStep(5);
    } catch {
      setApiError("Network error. Please check your connection.");
      setLoading(false);
    }
  };

  // ─── OTP Auto-focus ──────────────────────────────────────────────
  const handleOtpChange = (idx, val) => {
    const clean = val.replace(/\D/g, "").slice(0, 1);
    const next = [...otp];
    next[idx] = clean;
    setOtp(next);
    if (clean && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  // ─── Resend Timer ────────────────────────────────────────────────
  useEffect(() => {
    if (resendSec <= 0) return;
    const t = setInterval(() => setResendSec((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendSec]);

  // ─── Render Step Indicator ───────────────────────────────────────
  const steps = [
    { num: 1, label: "Account" },
    { num: 2, label: "Verify ID" },
    { num: 3, label: "Confirm" },
    { num: 4, label: "Bank" },
    { num: 5, label: "Done" },
  ];

  const renderStepIndicator = () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 8px",
      }}
    >
      {steps.map((s, i) => {
        const isActive = step === s.num;
        const isDone = step > s.num;
        const isLast = i === steps.length - 1;
        return (
          <div
            key={s.num}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flex: isLast ? 0 : 1,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 800,
                flexShrink: 0,
                background: isDone ? C.green : isActive ? C.orange : "#fff",
                color: isDone || isActive ? "#fff" : C.textLight,
                border: `2px solid ${isDone ? C.green : isActive ? C.orange : C.border}`,
              }}
            >
              {isDone ? "✓" : s.num}
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: isActive ? C.orange : isDone ? C.green : C.textLight,
                whiteSpace: "nowrap",
              }}
            >
              {s.label}
            </span>
            {!isLast && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: isDone ? C.green : C.border,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  // ─── STEP 1: Account Type ────────────────────────────────────────
  const renderStep1 = () => {
    const tiers = [
      {
        id: "individual",
        icon: "👤",
        title: "Individual",
        desc: "Sell personal items. NIN only. Lower limits.",
        badge: "NIN required",
        badgeColor: C.textSub,
        features: [
          "Up to 50 listings",
          "₦100K daily withdrawal",
          "Basic seller badge",
          "No CAC needed",
        ],
      },
      {
        id: "verified",
        icon: "✅",
        title: "Verified Seller",
        desc: "NIN + BVN verified. Higher trust & limits.",
        badge: "NIN + BVN",
        badgeColor: C.orange,
        features: [
          "Unlimited listings",
          "₦500K daily withdrawal",
          "Verified badge on listings",
          "Priority support",
        ],
        recommended: true,
      },
      {
        id: "business",
        icon: "🏢",
        title: "Business",
        desc: "Registered business. CAC + BVN required.",
        badge: "CAC + BVN",
        badgeColor: C.green,
        features: [
          "Unlimited everything",
          "₦2M daily withdrawal",
          "Business storefront",
          "Top search placement",
        ],
      },
    ];
    return (
      <div className="fade-up">
        <h2
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: C.text,
            marginBottom: 4,
          }}
        >
          Choose your seller account
        </h2>
        <p style={{ fontSize: 14, color: C.textSub, marginBottom: 24 }}>
          Select the tier that matches how you plan to sell on Shopdroply.
        </p>
        <div
          className="tier-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          {tiers.map((t) => (
            <div
              key={t.id}
              className={`tier-card ${tier === t.id ? "selected" : ""}`}
              onClick={() => {
                setTier(t.id);
                setErrors({});
              }}
            >
              {t.recommended && (
                <div
                  style={{
                    position: "absolute",
                    top: -1,
                    right: 12,
                    background: C.orange,
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: "0 0 8px 8px",
                  }}
                >
                  RECOMMENDED
                </div>
              )}
              <div style={{ fontSize: 28, marginBottom: 10 }}>{t.icon}</div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: C.text,
                  marginBottom: 2,
                }}
              >
                {t.title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: C.textSub,
                  marginBottom: 10,
                  lineHeight: 1.4,
                }}
              >
                {t.desc}
              </div>
              <span
                style={{
                  display: "inline-block",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 20,
                  background: t.badgeColor + "15",
                  color: t.badgeColor,
                  border: `1px solid ${t.badgeColor}30`,
                  marginBottom: 12,
                }}
              >
                {t.badge}
              </span>
              <div
                style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}
              >
                {t.features.map((f, fi) => (
                  <div
                    key={fi}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 0",
                      fontSize: 14,
                      color: C.textMid,
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        background:
                          t.id === "individual"
                            ? C.bg
                            : t.id === "verified"
                              ? C.orangeLight
                              : C.greenLight,
                        color:
                          t.id === "individual"
                            ? C.textSub
                            : t.id === "verified"
                              ? C.orange
                              : C.green,
                      }}
                    >
                      ✓
                    </span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}
        >
          <button
            className="sdp-btn-orange"
            disabled={!tier}
            onClick={() => {
              setStep(2);
              setErrors({});
            }}
          >
            Continue →
          </button>
        </div>
      </div>
    );
  };

  // ─── STEP 2: NIN + BVN ───────────────────────────────────────────
  const renderStep2 = () => (
    <div className="fade-up">
      <h2
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: C.text,
          marginBottom: 4,
        }}
      >
        Verify your identity
      </h2>
      <p style={{ fontSize: 14, color: C.textSub, marginBottom: 24 }}>
        We verify every seller to protect buyers. Your data is encrypted and
        never shared.
      </p>

      <div
        className="form-grid"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
      >
        <div style={{ gridColumn: "1 / -1" }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 700,
              color: C.text,
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            National Identity Number (NIN)
          </label>
          <input
            className={`sdp-input ${errors.nin ? "error" : ""}`}
            placeholder="Enter 11-digit NIN"
            maxLength={11}
            value={nin}
            onChange={(e) => setNin(e.target.value.replace(/\D/g, ""))}
          />
          {errors.nin ? (
            <div style={{ fontSize: 12, color: C.red, marginTop: 4 }}>
              {errors.nin}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: C.textLight, marginTop: 4 }}>
              Dial *346# on your registered phone to retrieve your NIN
            </div>
          )}
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 700,
              color: C.text,
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Bank Verification Number (BVN)
          </label>
          <input
            className={`sdp-input ${errors.bvn ? "error" : ""}`}
            placeholder="Enter 11-digit BVN"
            maxLength={11}
            value={bvn}
            onChange={(e) => setBvn(e.target.value.replace(/\D/g, ""))}
          />
          {errors.bvn ? (
            <div style={{ fontSize: 12, color: C.red, marginTop: 4 }}>
              {errors.bvn}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: C.textLight, marginTop: 4 }}>
              Dial *565*0# to check your BVN
            </div>
          )}
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 700,
              color: C.text,
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Date of Birth
          </label>
          <input
            className="sdp-input"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 700,
              color: C.text,
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Phone Number
          </label>
          <input
            className={`sdp-input ${errors.phone ? "error" : ""}`}
            placeholder="0803 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {errors.phone && (
            <div style={{ fontSize: 12, color: C.red, marginTop: 4 }}>
              {errors.phone}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
          padding: 14,
          background: C.blueLight,
          border: "1px solid #BFDBFE",
          borderRadius: 10,
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <span style={{ fontSize: 18 }}>🛡️</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.blue }}>
            Why we need this
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#1e40af",
              lineHeight: 1.5,
              marginTop: 2,
            }}
          >
            NIN verifies your identity via NIMC. BVN confirms your bank
            identity. Both must match your date of birth. This prevents fraud
            and builds buyer trust.
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 24,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <button
          className="sdp-btn-ghost"
          onClick={() => {
            setStep(1);
            setErrors({});
          }}
        >
          ← Back
        </button>
        <button
          className="sdp-btn-orange"
          disabled={loading}
          onClick={handleStep2Next}
        >
          {loading ? (
            <span style={{ animation: "pulse 1s infinite" }}>Verifying...</span>
          ) : (
            "Continue →"
          )}
        </button>
      </div>
    </div>
  );

  // ─── STEP 3: OTP ─────────────────────────────────────────────────
  const renderStep3 = () => (
    <div className="fade-up" style={{ maxWidth: 420, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div
          style={{
            width: 64,
            height: 64,
            background: C.orangeLight,
            border: `2px solid ${C.orangeBorder}`,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            margin: "0 auto 14px",
          }}
        >
          📱
        </div>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: C.text,
            marginBottom: 4,
          }}
        >
          Enter verification code
        </h2>
        <p style={{ fontSize: 14, color: C.textSub }}>
          We sent a 6-digit code to <strong>{phone || "0803 **** 4567"}</strong>
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <input
            key={i}
            ref={(el) => (otpRefs.current[i] = el)}
            className="sdp-input"
            maxLength={1}
            value={otp[i]}
            onChange={(e) => handleOtpChange(i, e.target.value)}
            onKeyDown={(e) => handleOtpKeyDown(i, e)}
            style={{
              width: 48,
              height: 56,
              textAlign: "center",
              fontSize: 20,
              fontWeight: 800,
              padding: 0,
            }}
          />
        ))}
      </div>

      {errors.otp && (
        <div
          style={{
            textAlign: "center",
            fontSize: 13,
            color: C.red,
            marginBottom: 12,
          }}
        >
          {errors.otp}
        </div>
      )}

      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <span style={{ fontSize: 13, color: C.textSub }}>
          Didn&apos;t receive it?{" "}
        </span>
        <button
          disabled={resendSec > 0}
          onClick={() => {
            setOtp(["", "", "", "", "", ""]);
            setResendSec(59);
          }}
          style={{
            background: "none",
            border: "none",
            color: C.orange,
            fontWeight: 700,
            fontSize: 13,
            cursor: resendSec > 0 ? "not-allowed" : "pointer",
            opacity: resendSec > 0 ? 0.5 : 1,
            fontFamily: "inherit",
          }}
        >
          Resend code
        </button>
        {resendSec > 0 && (
          <span style={{ fontSize: 12, color: C.textLight, marginLeft: 6 }}>
            ({resendSec}s)
          </span>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button
          className="sdp-btn-ghost"
          onClick={() => {
            setStep(2);
            setErrors({});
          }}
        >
          ← Back
        </button>
        <button className="sdp-btn-orange" onClick={handleStep3Next}>
          Continue →
        </button>
      </div>
    </div>
  );

  // ─── STEP 4: Bank Account ────────────────────────────────────────
  const renderStep4 = () => (
    <div className="fade-up">
      <h2
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: C.text,
          marginBottom: 4,
        }}
      >
        Link your bank account
      </h2>
      <p style={{ fontSize: 14, color: C.textSub, marginBottom: 24 }}>
        This is where your earnings will be sent when escrow releases.
      </p>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 700,
            color: C.text,
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Select your bank
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {BANKS.map((b) => (
            <div
              key={b}
              className={`bank-chip ${bank === b ? "selected" : ""}`}
              onClick={() => setBank(b)}
            >
              {b}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 700,
            color: C.text,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Account Number
        </label>
        <input
          className={`sdp-input ${errors.accountNumber ? "error" : ""}`}
          placeholder="Enter 10-digit account number"
          maxLength={10}
          value={accountNumber}
          onChange={(e) => handleAccountInput(e.target.value)}
        />
        {errors.accountNumber && (
          <div style={{ fontSize: 12, color: C.red, marginTop: 4 }}>
            {errors.accountNumber}
          </div>
        )}
      </div>

      {accountName && (
        <div
          className="slide-left"
          style={{
            marginBottom: 20,
            padding: 14,
            background: C.greenLight,
            border: `1px solid ${C.greenBorder}`,
            borderRadius: 10,
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 20 }}>✅</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>
              Account verified
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
              {accountName}
            </div>
          </div>
        </div>
      )}
      {apiError && (
        <div
          style={{
            marginTop: 16,
            padding: "12px 14px",
            background: C.redLight,
            border: `1px solid ${C.redBorder}`,
            borderRadius: 10,
            fontSize: 13,
            color: C.red,
            fontWeight: 600,
          }}
        >
          ⚠️ {apiError}
        </div>
      )}
      <div
        style={{
          marginTop: 24,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <button
          className="sdp-btn-ghost"
          onClick={() => {
            setStep(3);
            setErrors({});
          }}
        >
          ← Back
        </button>
        <button
          className="sdp-btn-orange"
          disabled={!accountName || loading}
          onClick={handleStep4Next}
        >
          {loading ? (
            <span style={{ animation: "pulse 1s infinite" }}>Verifying...</span>
          ) : (
            "Complete setup →"
          )}
        </button>
      </div>
    </div>
  );

  // ─── STEP 5: Approved ────────────────────────────────────────────
  const renderStep5 = () => {
    const tierConfig = {
      individual: {
        icon: "👤",
        title: "Individual Seller",
        badge: "Basic",
        badgeColor: C.textSub,
      },
      verified: {
        icon: "✅",
        title: "Verified Seller",
        badge: "Verified",
        badgeColor: C.green,
      },
      business: {
        icon: "🏢",
        title: "Business Seller",
        badge: "Business",
        badgeColor: C.orange,
      },
    };
    const t = tierConfig[tier] || tierConfig.verified;
    return (
      <div
        className="fade-up"
        style={{ textAlign: "center", padding: "20px 0" }}
      >
        <div
          className="scale-in"
          style={{
            width: 80,
            height: 80,
            background: C.greenLight,
            border: `3px solid ${C.greenBorder}`,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            margin: "0 auto 20px",
          }}
        >
          🎉
        </div>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: C.text,
            marginBottom: 6,
          }}
        >
          You&apos;re all set!
        </h2>
        <p style={{ fontSize: 15, color: C.textSub, marginBottom: 28 }}>
          Your seller account has been approved. Start listing and selling
          today.
        </p>

        <div
          style={{
            maxWidth: 360,
            margin: "0 auto 28px",
            background: "#fff",
            border: `1.5px solid ${C.border}`,
            borderRadius: 14,
            padding: 20,
            textAlign: "left",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              marginBottom: 16,
              paddingBottom: 16,
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: C.orange,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 20,
              }}
            >
              {t.icon}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
                Chioma Adebayo
              </div>
              <span
                style={{
                  display: "inline-block",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 10px",
                  borderRadius: 20,
                  background: t.badgeColor + "15",
                  color: t.badgeColor,
                  border: `1px solid ${t.badgeColor}30`,
                  marginTop: 2,
                }}
              >
                {t.badge}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "Identity verified via NIMC",
              "BVN confirmed",
              "Phone number verified",
              "Bank account linked",
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: 0,
                  fontSize: 14,
                  color: C.textMid,
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    background: C.greenLight,
                    color: C.green,
                  }}
                >
                  ✓
                </span>
                {item}
              </div>
            ))}
            {tier === "business" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: 0,
                  fontSize: 14,
                  color: C.textMid,
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    background: C.amberLight,
                    color: C.amber,
                  }}
                >
                  ⏳
                </span>
                CAC document review pending
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            className="sdp-btn-orange"
            style={{ padding: "14px 28px", fontSize: 15 }}
            onClick={() => router.push("/listings/new")}
          >
            📦 Create first listing
          </button>
          <button
            className="sdp-btn-ghost"
            style={{ padding: "14px 24px", fontSize: 15 }}
            onClick={() => router.push("/seller/dashboard")}
          >
            📊 Go to dashboard
          </button>
        </div>
      </div>
    );
  };

  // ─── Main Render ─────────────────────────────────────────────────
  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: C.text,
              letterSpacing: -0.5,
            }}
          >
            shop<span style={{ color: C.orange }}>droply</span>
          </div>
          <div
            style={{
              fontSize: 11,
              color: C.textSub,
              fontWeight: 600,
              marginTop: 2,
            }}
          >
            SELLER ONBOARDING
          </div>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        <div style={{ marginTop: 28 }}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
        </div>
      </div>
    </>
  );
}
// const C = {
//   orange: "#F97316", orangeLight: "#FFF7ED", orangeBdr: "#FED7AA",
//   green: "#16A34A", greenLight: "#F0FDF4", greenBdr: "#BBF7D0",
//   bg: "#F9FAFB", surface: "#FFFFFF", border: "#E5E7EB",
//   text: "#1A1A1A", textMid: "#374151", textSub: "#6B7280", textLight: "#9CA3AF",
// };

// const CSS = `
//   @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
//   .onboarding-wrap *{box-sizing:border-box;margin:0;padding:0;font-family:'Plus Jakarta Sans',sans-serif;}
//   .btn-orange{background:#F97316;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;transition:all 0.15s;font-family:'Plus Jakarta Sans',sans-serif;}
//   .btn-orange:hover{background:#EA6C0A;transform:translateY(-1px);box-shadow:0 4px 16px rgba(249,115,22,0.3);}
//   .btn-orange:disabled{opacity:0.5;cursor:not-allowed;transform:none;box-shadow:none;}
//   .btn-ghost{background:#fff;border:1.5px solid #E5E7EB;border-radius:10px;color:#374151;font-weight:600;cursor:pointer;transition:all 0.15s;}
//   .btn-ghost:hover{border-color:#F97316;color:#F97316;background:#FFF7ED;}
//   .input{width:100%;padding:11px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:14px;outline:none;transition:all 0.15s;}
//   .input:focus{border-color:#F97316;box-shadow:0 0 0 3px rgba(249,115,22,0.12);}
//   .input.error{border-color:#DC2626;box-shadow:0 0 0 3px rgba(220,38,38,0.1);}
//   @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
//   .fade-up{animation:fadeUp 0.4s ease both;}
//   @media(max-width:768px){.onboarding-grid{grid-template-columns:1fr!important;}}
// `;

// function StepIndicator({ step, total }: { step: number; total: number }) {
//   return (
//     <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
//       {Array.from({ length: total }).map((_, i) => (
//         <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i + 1 <= step ? C.orange : C.border, transition: "background 0.3s" }} />
//       ))}
//     </div>
//   );
// }

// export default function SellerOnboarding() {
//   const [step, setStep] = useState(1);
//   const [tier, setTier] = useState<"individual" | "verified" | "business">("individual");
//   const [form, setForm] = useState({ nin: "", bvn: "", dob: "", bank: "", accountNumber: "", accountName: "" });
//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const [submitting, setSubmitting] = useState(false);
//   const [verified, setVerified] = useState(false);
//   const router = useRouter();

//   const banks = [
//     "Access Bank", "GTBank", "First Bank", "UBA", "Zenith Bank",
//     "Fidelity Bank", "Ecobank", "Stanbic IBTC", "Kuda", "Moniepoint", "OPay", "PalmPay",
//   ];

//   const validate = () => {
//     const e: Record<string, string> = {};
//     if (step === 2) {
//       if (!form.nin || form.nin.length !== 11) e.nin = "NIN must be 11 digits";
//       if (tier !== "individual" && (!form.bvn || form.bvn.length !== 11)) e.bvn = "BVN must be 11 digits";
//       if (!form.dob) e.dob = "Date of birth is required";
//     }
//     if (step === 3) {
//       if (!form.bank) e.bank = "Select a bank";
//       if (!form.accountNumber || form.accountNumber.length !== 10) e.accountNumber = "Account number must be 10 digits";
//     }
//     return e;
//   };

//   const next = () => {
//     const e = validate();
//     if (Object.keys(e).length) { setErrors(e); return; }
//     setErrors({});
//     if (step < 4) setStep(step + 1);
//   };

//   const verifyBank = () => {
//     setSubmitting(true);
//     setTimeout(() => {
//       setForm(p => ({ ...p, accountName: "Adebayo Chukwuemeka Okafor" }));
//       setVerified(true);
//       setSubmitting(false);
//     }, 1200);
//   };

//   const finish = () => {
//     setSubmitting(true);
//     setTimeout(() => {
//       router.push("/seller/dashboard");
//     }, 800);
//   };

//   return (
//     <div className="onboarding-wrap" style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
//       <style>{CSS}</style>
//       <div className="onboarding-grid" style={{ display: "grid", gridTemplateColumns: "1fr 480px", gap: 40, maxWidth: 900, width: "100%", alignItems: "start" }}>

//         {/* Left panel */}
//         <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 40 }}>
//           <Link href="/" style={{ textDecoration: "none" }}>
//             <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>shop<span style={{ color: C.orange }}>droply</span></div>
//           </Link>
//           <h1 style={{ fontSize: 32, fontWeight: 800, color: C.text, lineHeight: 1.2, letterSpacing: "-0.8px" }}>
//             Start selling with<br />confidence
//           </h1>
//           <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.7 }}>
//             Verify your identity, link your bank account, and start listing items in minutes. Shopdroply protects every transaction with escrow.
//           </p>
//           <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
//             {[
//               { icon: "🛡️", t: "Escrow on every sale", s: "Your buyers' payments are held safely until delivery is confirmed." },
//               { icon: "✅", t: "Verified seller badge", s: "Get a trust badge that increases buyer confidence and sales." },
//               { icon: "💳", t: "Fast payouts", s: "Funds hit your bank account within 24 hours of delivery confirmation." },
//               { icon: "🚚", t: "Nationwide logistics", s: "GIG, Fez, Kwik, DHL — all integrated via API." },
//             ].map(b => (
//               <div key={b.t} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
//                 <div style={{ width: 36, height: 36, borderRadius: 10, background: C.orangeLight, border: `1px solid ${C.orangeBdr}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{b.icon}</div>
//                 <div>
//                   <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{b.t}</div>
//                   <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5 }}>{b.s}</div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Right form */}
//         <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 16, padding: "28px 32px" }}>
//           <StepIndicator step={step} total={4} />

//           {step === 1 && (
//             <div className="fade-up">
//               <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 6 }}>Choose your seller tier</h2>
//               <p style={{ fontSize: 13, color: C.textSub, marginBottom: 20 }}>Select the account type that fits how you plan to sell.</p>

//               <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
//                 {[
//                   { k: "individual" as const, icon: "👤", t: "Individual seller", s: "NIN only. Lower limits. Perfect for casual sellers.", limits: "Max 50 listings · ₦500K/month payout" },
//                   { k: "verified" as const, icon: "✅", t: "Verified seller", s: "NIN + BVN. Higher limits. Verified badge on all listings.", limits: "Max 200 listings · ₦2M/month payout" },
//                   { k: "business" as const, icon: "🏢", t: "Business seller", s: "CAC + BVN. Unlimited listings. Business storefront.", limits: "Unlimited listings · Unlimited payout" },
//                 ].map(opt => (
//                   <div key={opt.k} onClick={() => setTier(opt.k)} style={{
//                     border: `2px solid ${tier === opt.k ? C.orange : C.border}`,
//                     borderRadius: 12, padding: "14px 16px", cursor: "pointer",
//                     background: tier === opt.k ? C.orangeLight : "#fff", transition: "all 0.15s",
//                   }}>
//                     <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
//                       <div style={{ fontSize: 20 }}>{opt.icon}</div>
//                       <div style={{ fontSize: 14, fontWeight: 700, color: C.text, flex: 1 }}>{opt.t}</div>
//                       {tier === opt.k && <div style={{ width: 20, height: 20, borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12 }}>✓</div>}
//                     </div>
//                     <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5, paddingLeft: 32 }}>{opt.s}</div>
//                     <div style={{ fontSize: 11, color: C.orange, fontWeight: 600, marginTop: 6, paddingLeft: 32 }}>{opt.limits}</div>
//                   </div>
//                 ))}
//               </div>

//               <button className="btn-orange" onClick={next} style={{ width: "100%", padding: "13px", fontSize: 15, marginTop: 20 }}>
//                 Continue →
//               </button>
//             </div>
//           )}

//           {step === 2 && (
//             <div className="fade-up">
//               <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 6 }}>Identity verification</h2>
//               <p style={{ fontSize: 13, color: C.textSub, marginBottom: 20 }}>
//                 {tier === "individual" ? "Enter your NIN to verify your identity via NIMC." : "Enter your NIN and BVN. We verify against NIMC and CBN records."}
//               </p>

//               <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
//                 <div>
//                   <label style={{ fontSize: 13, fontWeight: 600, color: C.textMid, marginBottom: 5, display: "block" }}>National Identity Number (NIN)</label>
//                   <input className={`input ${errors.nin ? "error" : ""}`} placeholder="12345678901" maxLength={11} value={form.nin} onChange={e => setForm(p => ({ ...p, nin: e.target.value.replace(/\D/g, "") }))} />
//                   {errors.nin && <div style={{ fontSize: 12, color: "#DC2626", marginTop: 4 }}>⚠ {errors.nin}</div>}
//                 </div>

//                 {tier !== "individual" && (
//                   <div>
//                     <label
