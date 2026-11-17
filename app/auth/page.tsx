"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── Design tokens ─────────────────────────────────────────────────
const C = {
  orange: "#F97316",
  orangeHover: "#EA6C0A",
  orangeLight: "#FFF7ED",
  orangeBdr: "#FED7AA",
  green: "#16A34A",
  greenLight: "#F0FDF4",
  greenBdr: "#BBF7D0",
  red: "#DC2626",
  redLight: "#FEF2F2",
  redBdr: "#FECACA",
  bg: "#FFFFFF",
  surface: "#F9FAFB",
  border: "#E5E7EB",
  borderFocus: "#F97316",
  text: "#111827",
  textMid: "#374151",
  textSub: "#6B7280",
  textLight: "#9CA3AF",
  panelBg: "#111827",
};
const FONT = "'Plus Jakarta Sans', sans-serif";

// ─── Global CSS ────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  .sdp-wrap *{box-sizing:border-box;margin:0;padding:0;}
  .sdp-wrap button,input,select{font-family:'Plus Jakarta Sans',sans-serif;}
  @keyframes fadeInUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
  @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
  @keyframes slideInLeft{from{opacity:0;transform:translateX(-24px);}to{opacity:1;transform:translateX(0);}}
  @keyframes shake{0%,100%{transform:translateX(0);}20%{transform:translateX(-6px);}40%{transform:translateX(6px);}60%{transform:translateX(-4px);}80%{transform:translateX(4px);}}
  .fade-up{animation:fadeInUp 0.45s cubic-bezier(.22,.68,0,1.2) both;}
  .fade-in{animation:fadeIn 0.35s ease both;}
  .slide-left{animation:slideInLeft 0.4s cubic-bezier(.22,.68,0,1.2) both;}
  .shake{animation:shake 0.4s ease;}
  .btn-orange{
    background:#F97316;color:#fff;border:none;border-radius:10px;
    font-weight:700;cursor:pointer;transition:background 0.15s,transform 0.12s,box-shadow 0.15s;
    font-family:'Plus Jakarta Sans',sans-serif;
  }
  .btn-orange:hover{background:#EA6C0A;transform:translateY(-1px);box-shadow:0 4px 16px rgba(249,115,22,0.35);}
  .btn-orange:active{transform:translateY(0);}
  .btn-orange:disabled{opacity:0.6;cursor:not-allowed;transform:none;box-shadow:none;}
  .btn-ghost{
    background:transparent;border:1.5px solid #E5E7EB;border-radius:10px;
    color:#374151;font-weight:600;cursor:pointer;transition:all 0.15s;
    font-family:'Plus Jakarta Sans',sans-serif;
  }
  .btn-ghost:hover{border-color:#F97316;color:#F97316;background:#FFF7ED;}
  .sdp-input{
    width:100%;padding:11px 14px;border:1.5px solid #E5E7EB;border-radius:10px;
    font-size:14px;color:#111827;outline:none;transition:border-color 0.15s,box-shadow 0.15s;
    font-family:'Plus Jakarta Sans',sans-serif;background:#fff;
  }
  .sdp-input:focus{border-color:#F97316;box-shadow:0 0 0 3px rgba(249,115,22,0.12);}
  .sdp-input.error{border-color:#DC2626;box-shadow:0 0 0 3px rgba(220,38,38,0.1);}
  .sdp-input.success{border-color:#16A34A;box-shadow:0 0 0 3px rgba(22,163,74,0.1);}
  .sdp-label{font-size:13px;font-weight:600;color:#374151;margin-bottom:5px;display:block;}
  .social-btn{
    width:100%;padding:11px;border:1.5px solid #E5E7EB;border-radius:10px;
    background:#fff;cursor:pointer;font-size:14px;font-weight:600;color:#374151;
    display:flex;align-items:center;justify-content:center;gap:8px;
    transition:all 0.15s;font-family:'Plus Jakarta Sans',sans-serif;
  }
  .social-btn:hover{border-color:#D1D5DB;background:#F9FAFB;transform:translateY(-1px);}
  .tab-btn{
    flex:1;padding:10px;border:none;background:transparent;
    font-size:14px;font-weight:700;cursor:pointer;
    border-bottom:2px solid transparent;transition:all 0.18s;
    font-family:'Plus Jakarta Sans',sans-serif;color:#9CA3AF;
  }
  .tab-btn.active{color:#F97316;border-bottom-color:#F97316;}
  .strength-bar{height:4px;border-radius:2px;transition:all 0.3s;}
  @media(max-width:768px){
    .auth-grid{grid-template-columns:1fr!important;}
    .auth-panel{display:none!important;}
    .auth-form-col{padding:24px 20px!important;}
  }
`;

// ─── Helpers ───────────────────────────────────────────────────────
function getPasswordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "#DC2626", "#D97706", "#2563EB", "#16A34A"];
  return { score, label: labels[score] || "", color: colors[score] || "" };
}

function FieldError({ msg }: { msg?: string }) {
  return msg ? (
    <div
      style={{
        fontSize: 12,
        color: C.red,
        marginTop: 4,
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span>⚠</span> {msg}
    </div>
  ) : null;
}

function FieldSuccess({ msg }: { msg?: string }) {
  return msg ? (
    <div
      style={{
        fontSize: 12,
        color: C.green,
        marginTop: 4,
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span>✓</span> {msg}
    </div>
  ) : null;
}

function InputRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <label className="sdp-label">{label}</label>
      {children}
      {hint && (
        <div style={{ fontSize: 11, color: C.textLight, marginTop: 4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "20px 0",
      }}
    >
      <div style={{ flex: 1, height: 1, background: C.border }} />
      <span style={{ fontSize: 12, color: C.textLight, fontWeight: 500 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

// ─── Dev OTP helper ────────────────────────────────────────────────
function DevOtpDisplay({ phone }: { phone: string }) {
  return (
    <div
      style={{
        background: C.orangeLight,
        border: `1px solid ${C.orangeBdr}`,
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 20,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#92400E",
          marginBottom: 4,
        }}
      >
        🔧 Development Mode
      </div>
      <div style={{ fontSize: 12, color: "#A16207", lineHeight: 1.6 }}>
        OTP code has been printed in your server terminal.
        <br />
        Check the console where{" "}
        <code
          style={{
            background: C.orangeBdr,
            padding: "1px 4px",
            borderRadius: 4,
          }}
        >
          npm run dev
        </code>{" "}
        is running.
      </div>
      <div style={{ fontSize: 11, color: C.textLight, marginTop: 6 }}>
        Phone: {phone}
      </div>
    </div>
  );
}

// ─── Left decorative panel ─────────────────────────────────────────
function AuthPanel({ mode }: { mode: string }) {
  const isLogin = mode === "login";
  const bullets = isLogin
    ? [
        {
          icon: "🛡️",
          t: "Escrow protection",
          s: "Your money is held until delivery confirmed",
        },
        {
          icon: "✅",
          t: "Verified sellers",
          s: "NIN + BVN identity on every seller",
        },
        {
          icon: "🚚",
          t: "Live delivery tracking",
          s: "GIG, Fez & DHL Nigeria integrated",
        },
        {
          icon: "⚡",
          t: "Live auctions",
          s: "Bid on thousands of items right now",
        },
      ]
    : [
        { icon: "🆓", t: "Free to join", s: "No sign-up fees, ever" },
        {
          icon: "🛡️",
          t: "Escrow on every order",
          s: "Funds protected until you confirm delivery",
        },
        {
          icon: "📦",
          t: "Sell in 5 minutes",
          s: "List an item and reach buyers nationwide",
        },
        {
          icon: "💳",
          t: "Fast payouts",
          s: "Earnings hit your bank in 24 hours",
        },
      ];

  return (
    <div
      className="auth-panel"
      style={{
        background: C.panelBg,
        padding: "48px 40px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -80,
          right: -80,
          width: 280,
          height: 280,
          borderRadius: "50%",
          background: "rgba(249,115,22,0.12)",
          filter: "blur(60px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -60,
          left: -60,
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: "rgba(249,115,22,0.08)",
          filter: "blur(50px)",
        }}
      />

      <div style={{ marginBottom: 48, position: "relative" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#fff",
              fontFamily: FONT,
              letterSpacing: "-0.5px",
            }}
          >
            shop<span style={{ color: C.orange }}>droply</span>
          </div>
        </Link>
        <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
          Nigeria&apos;s trusted escrow marketplace
        </div>
      </div>

      <h2
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: "#fff",
          fontFamily: FONT,
          letterSpacing: "-0.8px",
          lineHeight: 1.2,
          marginBottom: 10,
          whiteSpace: "pre-line",
        }}
      >
        {isLogin
          ? "Welcome back.\nYou're safe here."
          : "Buy. Sell. Trust.\nEverything secured."}
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "#9CA3AF",
          lineHeight: 1.7,
          marginBottom: 36,
        }}
      >
        {isLogin
          ? "Log back in to track your orders, manage listings, and continue bidding on live auctions."
          : "Join 420,000+ Nigerians buying and selling with full escrow protection on every transaction."}
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          position: "relative",
        }}
      >
        {bullets.map((b, i) => (
          <div
            key={b.t}
            className="slide-left"
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              animationDelay: `${i * 0.07}s`,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(249,115,22,0.15)",
                border: "1px solid rgba(249,115,22,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              {b.icon}
            </div>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: 2,
                }}
              >
                {b.t}
              </div>
              <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>
                {b.s}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 40,
          padding: "14px 16px",
          background: "rgba(249,115,22,0.1)",
          border: "1px solid rgba(249,115,22,0.2)",
          borderRadius: 12,
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: C.orange,
            marginBottom: 6,
          }}
        >
          🔒 Your money is always protected
        </div>
        <div style={{ fontSize: 12, color: "#9CA3AF", lineHeight: 1.6 }}>
          Shopdroply holds your payment in escrow until delivery is confirmed.
          No cash on delivery — all digital, all traceable.
        </div>
      </div>
    </div>
  );
}

// ─── Sign Up Form ─────────────────────────────────────────────────
function SignUpForm({ onSwitch }: { onSwitch: () => void }) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    agree: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const router = useRouter();

  const strength = getPasswordStrength(form.password);
  const set = (k: string, v: string | boolean) =>
    setForm((p) => ({ ...p, [k]: v }));

  const validate2 = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "First name is required";
    if (!form.lastName.trim()) e.lastName = "Last name is required";
    if (!form.email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email))
      e.email = "Enter a valid email address";
    if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 10)
      e.phone = "Enter a valid Nigerian phone number";
    if (form.password.length < 8)
      e.password = "Password must be at least 8 characters";
    if (form.password !== form.confirm) e.confirm = "Passwords do not match";
    if (!form.agree) e.agree = "You must agree to the terms";
    return e;
  };

  const goStep2 = () => {
    if (!role) {
      setShakeKey((k) => k + 1);
      return;
    }
    setApiError("");
    setStep(2);
  };

  const handleSignup = async () => {
    const e = validate2();
    if (Object.keys(e).length) {
      setErrors(e);
      setShakeKey((k) => k + 1);
      return;
    }
    setErrors({});
    setApiError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone.trim(),
          role,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setApiError(data.error || "Signup failed");
        setShakeKey((k) => k + 1);
        setSubmitting(false);
        return;
      }
      setStep(3);
    } catch {
      setApiError("Network error — please try again");
      setShakeKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtp = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
  };

  const handleOtpKey = (
    i: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[i] && i > 0)
      document.getElementById(`otp-${i - 1}`)?.focus();
  };

  const handleVerify = async () => {
    setApiError("");
    const code = otp.join("");
    if (code.length !== 6) {
      setApiError("Please enter the 6-digit OTP code");
      setShakeKey((k) => k + 1);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim(), code }),
        credentials: "include",
      });
      const data = await res.json();
      if (!data.success) {
        setApiError(data.error || "Verification failed");
        setShakeKey((k) => k + 1);
        setSubmitting(false);
        return;
      }
      const role = data.data?.user?.role || "buyer";
      if (role === "seller") {
        router.push("/seller/onboarding");
      } else {
        router.push("/buyer/dashboard");
      }
    } catch {
      setApiError("Network error — please try again");
      setShakeKey((k) => k + 1);
      setSubmitting(false);
    }
  };

  if (step === 1)
    return (
      <div className="fade-up" key="step1">
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: C.text,
            fontFamily: FONT,
            letterSpacing: "-0.6px",
            marginBottom: 6,
          }}
        >
          Create your account
        </h1>
        <p style={{ fontSize: 14, color: C.textSub, marginBottom: 28 }}>
          Already have an account?{" "}
          <span
            onClick={onSwitch}
            style={{ color: C.orange, fontWeight: 700, cursor: "pointer" }}
          >
            Sign in
          </span>
        </p>

        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: C.textMid,
            marginBottom: 12,
          }}
        >
          I want to:
        </div>

        <div
          key={shakeKey}
          className={shakeKey ? "shake" : ""}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 28,
          }}
        >
          {[
            {
              k: "buyer",
              icon: "🛒",
              t: "Buy items",
              s: "Browse listings, bid on auctions, buy safely with escrow protection",
            },
            {
              k: "seller",
              icon: "🏪",
              t: "Buy & sell items",
              s: "Everything buyers get, plus list items and earn with fast payouts",
            },
          ].map((opt) => (
            <div
              key={opt.k}
              onClick={() => setRole(opt.k)}
              style={{
                border: `2px solid ${role === opt.k ? C.orange : C.border}`,
                borderRadius: 12,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                cursor: "pointer",
                background: role === opt.k ? C.orangeLight : "#fff",
                transition: "all 0.15s",
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: role === opt.k ? C.orange : C.surface,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  flexShrink: 0,
                  transition: "all 0.15s",
                }}
              >
                {opt.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                  {opt.t}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: C.textSub,
                    marginTop: 2,
                    lineHeight: 1.4,
                  }}
                >
                  {opt.s}
                </div>
              </div>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  border: `2px solid ${role === opt.k ? C.orange : C.border}`,
                  background: role === opt.k ? C.orange : "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.15s",
                }}
              >
                {role === opt.k && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#fff",
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {apiError && (
          <div
            style={{
              fontSize: 12,
              color: C.red,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>⚠</span> {apiError}
          </div>
        )}
        {!role && shakeKey > 0 && !apiError && (
          <div
            style={{
              fontSize: 12,
              color: C.red,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>⚠</span> Please select an account type to continue
          </div>
        )}

        <button
          className="btn-orange"
          onClick={goStep2}
          style={{ width: "100%", padding: "13px", fontSize: 15 }}
        >
          Continue →
        </button>

        <Divider label="or sign up with" />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            className="social-btn"
            onClick={() => alert("Google OAuth coming soon")}
          >
            <span style={{ fontSize: 18 }}>🌐</span> Continue with Google
          </button>
          <button
            className="social-btn"
            onClick={() => alert("Facebook OAuth coming soon")}
          >
            <span style={{ fontSize: 18 }}>📘</span> Continue with Facebook
          </button>
        </div>

        <p
          style={{
            fontSize: 12,
            color: C.textLight,
            textAlign: "center",
            marginTop: 20,
            lineHeight: 1.6,
          }}
        >
          By signing up you agree to our{" "}
          <span style={{ color: C.orange, cursor: "pointer" }}>
            Terms of Service
          </span>{" "}
          and{" "}
          <span style={{ color: C.orange, cursor: "pointer" }}>
            Privacy Policy
          </span>
        </p>
      </div>
    );

  if (step === 2)
    return (
      <div className="fade-up" key="step2">
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: n <= step ? C.orange : C.border,
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>

        <button
          onClick={() => setStep(1)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            color: C.textSub,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          ← Back
        </button>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: C.text,
            fontFamily: FONT,
            letterSpacing: "-0.6px",
            marginBottom: 6,
          }}
        >
          Your details
        </h1>
        <p style={{ fontSize: 13, color: C.textSub, marginBottom: 24 }}>
          Step 2 of 3 — personal information
        </p>

        {apiError && (
          <div
            style={{
              fontSize: 13,
              color: C.red,
              marginBottom: 16,
              padding: "10px 12px",
              background: C.redLight,
              border: `1px solid ${C.redBdr}`,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>⚠</span> {apiError}
          </div>
        )}

        <div
          key={shakeKey}
          className={shakeKey ? "shake" : ""}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <InputRow label="First name">
              <input
                className={`sdp-input ${errors.firstName ? "error" : form.firstName ? "success" : ""}`}
                placeholder="Emeka"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
              />
              <FieldError msg={errors.firstName} />
            </InputRow>
            <InputRow label="Last name">
              <input
                className={`sdp-input ${errors.lastName ? "error" : form.lastName ? "success" : ""}`}
                placeholder="Okafor"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
              />
              <FieldError msg={errors.lastName} />
            </InputRow>
          </div>

          <InputRow label="Email address">
            <input
              className={`sdp-input ${errors.email ? "error" : form.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email) ? "success" : ""}`}
              type="email"
              placeholder="emeka@example.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
            <FieldError msg={errors.email} />
            {!errors.email &&
              form.email &&
              /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email) && (
                <FieldSuccess msg="Looks good!" />
              )}
          </InputRow>

          <InputRow
            label="Phone number"
            hint="We'll send a verification OTP to this number"
          >
            <div style={{ display: "flex", gap: 0 }}>
              <div
                style={{
                  padding: "11px 12px",
                  border: `1.5px solid ${errors.phone ? C.red : C.border}`,
                  borderRight: "none",
                  borderRadius: "10px 0 0 10px",
                  fontSize: 14,
                  color: C.textMid,
                  background: C.surface,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  whiteSpace: "nowrap",
                }}
              >
                🇳🇬 +234
              </div>
              <input
                className={`sdp-input ${errors.phone ? "error" : ""}`}
                style={{ borderRadius: "0 10px 10px 0" }}
                placeholder="803 000 0000"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
            <FieldError msg={errors.phone} />
          </InputRow>

          <InputRow label="Password">
            <div style={{ position: "relative" }}>
              <input
                className={`sdp-input ${errors.password ? "error" : ""}`}
                type={showPw ? "text" : "password"}
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 16,
                  color: C.textLight,
                }}
              >
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>
            {form.password && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="strength-bar"
                      style={{
                        flex: 1,
                        background:
                          n <= strength.score ? strength.color : C.border,
                      }}
                    />
                  ))}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: strength.color,
                    fontWeight: 600,
                  }}
                >
                  {strength.label}
                </div>
              </div>
            )}
            <FieldError msg={errors.password} />
          </InputRow>

          <InputRow label="Confirm password">
            <div style={{ position: "relative" }}>
              <input
                className={`sdp-input ${errors.confirm ? "error" : form.confirm && form.confirm === form.password ? "success" : ""}`}
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter password"
                value={form.confirm}
                onChange={(e) => set("confirm", e.target.value)}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 16,
                  color: C.textLight,
                }}
              >
                {showConfirm ? "🙈" : "👁️"}
              </button>
            </div>
            <FieldError msg={errors.confirm} />
            {!errors.confirm &&
              form.confirm &&
              form.confirm === form.password && (
                <FieldSuccess msg="Passwords match!" />
              )}
          </InputRow>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={form.agree}
              onChange={(e) => set("agree", e.target.checked)}
              style={{
                width: 16,
                height: 16,
                marginTop: 2,
                accentColor: C.orange,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>
              I agree to Shopdroply&apos;s{" "}
              <span style={{ color: C.orange, cursor: "pointer" }}>
                Terms of Service
              </span>
              ,{" "}
              <span style={{ color: C.orange, cursor: "pointer" }}>
                Privacy Policy
              </span>
              , and{" "}
              <span style={{ color: C.orange, cursor: "pointer" }}>
                Escrow Agreement
              </span>
            </span>
          </label>
          {errors.agree && <FieldError msg={errors.agree} />}
        </div>

        <button
          className="btn-orange"
          onClick={handleSignup}
          disabled={submitting}
          style={{
            width: "100%",
            padding: "13px",
            fontSize: 15,
            marginTop: 20,
          }}
        >
          {submitting ? "Creating account..." : "Create account →"}
        </button>
      </div>
    );

  return (
    <div className="fade-up" key="step3">
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: n <= step ? C.orange : C.border,
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>

      <button
        onClick={() => setStep(2)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 13,
          color: C.textSub,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        ← Back
      </button>

      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 52, marginBottom: 14 }}>📱</div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: C.text,
            fontFamily: FONT,
            letterSpacing: "-0.5px",
            marginBottom: 8,
          }}
        >
          Verify your phone
        </h1>
        <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.6 }}>
          We sent a 6-digit code to{" "}
          <span style={{ fontWeight: 700, color: C.text }}>
            +234 {form.phone}
          </span>
        </p>
      </div>

      <DevOtpDisplay phone={form.phone} />

      {apiError && (
        <div
          style={{
            fontSize: 13,
            color: C.red,
            marginBottom: 16,
            padding: "10px 12px",
            background: C.redLight,
            border: `1px solid ${C.redBdr}`,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>⚠</span> {apiError}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 10,
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        {otp.map((v, i) => (
          <input
            key={i}
            id={`otp-${i}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={v}
            onChange={(e) => handleOtp(i, e.target.value)}
            onKeyDown={(e) => handleOtpKey(i, e)}
            style={{
              width: 46,
              height: 54,
              textAlign: "center",
              fontSize: 22,
              fontWeight: 700,
              color: C.text,
              border: `2px solid ${v ? C.orange : C.border}`,
              borderRadius: 10,
              outline: "none",
              background: v ? C.orangeLight : "#fff",
              transition: "all 0.15s",
              fontFamily: FONT,
            }}
          />
        ))}
      </div>

      <button
        className="btn-orange"
        onClick={handleVerify}
        disabled={submitting}
        style={{ width: "100%", padding: "13px", fontSize: 15 }}
      >
        {submitting ? "Verifying..." : "Verify & create account ✓"}
      </button>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <div style={{ fontSize: 13, color: C.textSub }}>
          Didn&apos;t receive it?
        </div>
        <button
          style={{
            background: "none",
            border: "none",
            color: C.orange,
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 13,
            marginTop: 4,
          }}
        >
          Resend code · 00:58
        </button>
      </div>

      <div
        style={{
          marginTop: 24,
          padding: "12px 14px",
          background: C.greenLight,
          border: `1px solid ${C.greenBdr}`,
          borderRadius: 10,
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
        }}
      >
        <span style={{ fontSize: 15, color: C.green, flexShrink: 0 }}>🛡️</span>
        <span style={{ fontSize: 12, color: "#166534", lineHeight: 1.5 }}>
          Phone verification keeps your account secure and confirms your
          identity for buyer protection.
        </span>
      </div>
    </div>
  );
}

// ─── Login Form ────────────────────────────────────────────────────
function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const router = useRouter();

  const set = (k: string, v: string | boolean) =>
    setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email.trim()) e.email = "Email is required";
    if (!form.password) e.password = "Password is required";
    return e;
  };

  const handleSubmit = async () => {
    setApiError("");
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      setShakeKey((k) => k + 1);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
        credentials: "include",
      });
      const data = await res.json();
      if (!data.success) {
        setApiError(data.error || "Login failed");
        setShakeKey((k) => k + 1);
        setSubmitting(false);
        return;
      }
      const role = data.data?.user?.role || "buyer";
      if (role === "seller") {
        router.push("/seller/dashboard");
      } else {
        router.push("/buyer/dashboard");
      }
    } catch {
      setApiError("Network error — please try again");
      setShakeKey((k) => k + 1);
      setSubmitting(false);
    }
  };

  const handleForgot = async () => {
    setApiError("");
    if (!forgotEmail.trim()) {
      setApiError("Please enter your email");
      setShakeKey((k) => k + 1);
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        setApiError(data.error || "Request failed");
        setShakeKey((k) => k + 1);
        setForgotLoading(false);
        return;
      }
      setForgotSent(true);
    } catch {
      setApiError("Network error — please try again");
      setShakeKey((k) => k + 1);
    } finally {
      setForgotLoading(false);
    }
  };

  if (forgotMode)
    return (
      <div className="fade-up">
        <button
          onClick={() => {
            setForgotMode(false);
            setApiError("");
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            color: C.textSub,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          ← Back to login
        </button>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>🔑</div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: C.text,
              fontFamily: FONT,
              letterSpacing: "-0.5px",
              marginBottom: 8,
            }}
          >
            Reset your password
          </h1>
          <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.6 }}>
            Enter your email and we&apos;ll send you a reset link — or an OTP to
            your registered phone number.
          </p>
        </div>

        {apiError && (
          <div
            style={{
              fontSize: 13,
              color: C.red,
              marginBottom: 16,
              padding: "10px 12px",
              background: C.redLight,
              border: `1px solid ${C.redBdr}`,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>⚠</span> {apiError}
          </div>
        )}

        {!forgotSent ? (
          <>
            <InputRow label="Email address">
              <input
                className="sdp-input"
                type="email"
                placeholder="your@email.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
            </InputRow>
            <button
              className="btn-orange"
              onClick={handleForgot}
              disabled={forgotLoading}
              style={{
                width: "100%",
                padding: "13px",
                fontSize: 15,
                marginTop: 20,
              }}
            >
              {forgotLoading ? "Sending..." : "Send reset link →"}
            </button>
          </>
        ) : (
          <div
            style={{
              background: C.greenLight,
              border: `1px solid ${C.greenBdr}`,
              borderRadius: 12,
              padding: "20px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#166534",
                marginBottom: 6,
              }}
            >
              Reset link sent!
            </div>
            <div style={{ fontSize: 13, color: "#166534", lineHeight: 1.6 }}>
              Check your email at <strong>{forgotEmail}</strong>. Link expires
              in 15 minutes.
            </div>
            <button
              onClick={() => setForgotMode(false)}
              className="btn-orange"
              style={{ marginTop: 16, padding: "10px 24px", fontSize: 14 }}
            >
              Back to login
            </button>
          </div>
        )}
      </div>
    );

  return (
    <div className="fade-up">
      <h1
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: C.text,
          fontFamily: FONT,
          letterSpacing: "-0.6px",
          marginBottom: 6,
        }}
      >
        Sign in to Shopdroply
      </h1>
      <p style={{ fontSize: 14, color: C.textSub, marginBottom: 28 }}>
        Don&apos;t have an account?{" "}
        <span
          onClick={onSwitch}
          style={{ color: C.orange, fontWeight: 700, cursor: "pointer" }}
        >
          Create one free
        </span>
      </p>

      {apiError && (
        <div
          style={{
            fontSize: 13,
            color: C.red,
            marginBottom: 16,
            padding: "10px 12px",
            background: C.redLight,
            border: `1px solid ${C.redBdr}`,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>⚠</span> {apiError}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <button
          className="social-btn"
          onClick={() => alert("Google OAuth coming soon")}
        >
          <span style={{ fontSize: 18 }}>🌐</span> Continue with Google
        </button>
        <button
          className="social-btn"
          onClick={() => alert("Facebook OAuth coming soon")}
        >
          <span style={{ fontSize: 18 }}>📘</span> Continue with Facebook
        </button>
      </div>

      <Divider label="or sign in with email" />

      <div
        key={shakeKey}
        className={shakeKey ? "shake" : ""}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          marginTop: 20,
        }}
      >
        <InputRow label="Email address">
          <input
            className={`sdp-input ${errors.email ? "error" : ""}`}
            type="email"
            placeholder="your@email.com"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
          <FieldError msg={errors.email} />
        </InputRow>

        <InputRow label="Password">
          <div style={{ position: "relative" }}>
            <input
              className={`sdp-input ${errors.password ? "error" : ""}`}
              type={showPw ? "text" : "password"}
              placeholder="Your password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              style={{ paddingRight: 44 }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 16,
                color: C.textLight,
              }}
            >
              {showPw ? "🙈" : "👁️"}
            </button>
          </div>
          <FieldError msg={errors.password} />
        </InputRow>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={form.remember}
              onChange={(e) => set("remember", e.target.checked)}
              style={{ accentColor: C.orange, width: 15, height: 15 }}
            />
            <span style={{ fontSize: 13, color: C.textSub }}>Remember me</span>
          </label>
          <button
            onClick={() => {
              setForgotMode(true);
              setApiError("");
            }}
            style={{
              background: "none",
              border: "none",
              color: C.orange,
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Forgot password?
          </button>
        </div>
      </div>

      <button
        className="btn-orange"
        onClick={handleSubmit}
        disabled={submitting}
        style={{ width: "100%", padding: "13px", fontSize: 15, marginTop: 20 }}
      >
        {submitting ? "Signing in..." : "Sign in →"}
      </button>

      <div
        style={{
          marginTop: 20,
          padding: "12px 14px",
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 20 }}>📲</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid }}>
            No smartphone? Access via USSD
          </div>
          <div style={{ fontSize: 11, color: C.textSub }}>
            Dial *737*SDP# on any phone to access your account
          </div>
        </div>
      </div>

      <p
        style={{
          fontSize: 12,
          color: C.textLight,
          textAlign: "center",
          marginTop: 20,
          lineHeight: 1.6,
        }}
      >
        Protected by Shopdroply Escrow · NDPR Compliant · CAC Registered
      </p>
    </div>
  );
}

// ─── Auth Shell ────────────────────────────────────────────────────
function AuthShell({
  initialMode = "signup",
}: {
  initialMode?: "signup" | "login";
}) {
  const [mode, setMode] = useState<"signup" | "login">(initialMode);

  return (
    <div className="sdp-wrap" style={{ minHeight: "100vh", display: "flex" }}>
      <style>{CSS}</style>

      <div
        style={{ flex: "0 0 42%", position: "sticky", top: 0, height: "100vh" }}
      >
        <AuthPanel mode={mode} />
      </div>

      <div
        className="auth-form-col"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "40px 48px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 36,
          }}
        >
          <Link href="/" style={{ textDecoration: "none" }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: C.text,
                fontFamily: FONT,
              }}
            >
              shop<span style={{ color: C.orange }}>droply</span>
            </div>
          </Link>
          <div
            style={{ display: "flex", borderBottom: `2px solid ${C.border}` }}
          >
            <button
              className={`tab-btn${mode === "signup" ? " active" : ""}`}
              onClick={() => setMode("signup")}
            >
              Sign up
            </button>
            <button
              className={`tab-btn${mode === "login" ? " active" : ""}`}
              onClick={() => setMode("login")}
            >
              Login
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 440, width: "100%", margin: "0 auto" }}>
          {mode === "signup" ? (
            <SignUpForm onSwitch={() => setMode("login")} />
          ) : (
            <LoginForm onSwitch={() => setMode("signup")} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Auth Page ──────────────────────────────────────────────
export default function AuthPage() {
  return <AuthShell initialMode="signup" />;
}
