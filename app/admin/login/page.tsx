"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        router.push("/admin/dashboard");
        router.refresh();
      } else {
        setError(data.error || "Login failed — please try again");
        setLoading(false);
      }
    } catch {
      setError("Network error — please check your connection");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F9FAFB]">
      {/* ── Left branding panel (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#1A1A1A] flex-col justify-between p-12">
        <div>
          <div className="text-2xl font-extrabold text-white">
            shop<span className="text-[#F97316]">droply</span>
          </div>
          <div className="text-xs text-[#9CA3AF] font-semibold mt-1">
            Admin Control Center
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-extrabold text-white leading-tight mb-4">
            Marketplace operations,
            <br />
            <span className="text-[#F97316]">under control.</span>
          </h2>
          <p className="text-sm text-[#9CA3AF] leading-relaxed max-w-sm mb-8">
            Manage users, verify sellers, monitor escrow, resolve disputes and
            keep Nigeria&apos;s escrow-first marketplace running smoothly.
          </p>

          <div className="flex flex-col gap-3">
            {[
              { icon: "🛡️", text: "Escrow protection on every transaction" },
              { icon: "🪪", text: "NIN/BNV seller identity verification" },
              { icon: "📈", text: "Real-time GMV and commission analytics" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[rgba(249,115,22,0.15)] flex items-center justify-center text-sm">
                  {item.icon}
                </div>
                <span className="text-[13px] text-[#D1D5DB] font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[11px] text-[#6B7280]">
          © 2026 Shopdroply · Restricted access — authorized personnel only
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[400px] animate-[fadeUp_0.4s_ease_both]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="text-2xl font-extrabold text-[#111827]">
              shop<span className="text-[#F97316]">droply</span>
            </div>
            <div className="text-[11px] text-[#6B7280] font-semibold mt-1">
              Admin Control Center
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-[16px] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
            <div className="w-12 h-12 rounded-[12px] bg-[#1A1A1A] flex items-center justify-center text-xl mb-4">
              🔐
            </div>
            <h1 className="text-xl font-extrabold text-[#111827] mb-1">
              Admin sign in
            </h1>
            <p className="text-[13px] text-[#6B7280] mb-6">
              Enter your admin credentials to continue.
            </p>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-[10px] text-[13px] font-semibold bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] animate-[fadeUp_0.25s_ease_both]">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <label className="block text-[13px] font-semibold text-[#374151] mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@shopdroply.ng"
                  className="w-full px-3.5 py-2.5 border-[1.5px] border-[#E5E7EB] rounded-[10px] text-sm outline-none bg-white focus:border-[#F97316] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.1)] transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#374151] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 pr-11 border-[1.5px] border-[#E5E7EB] rounded-[10px] text-sm outline-none bg-white focus:border-[#F97316] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.1)] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-[#9CA3AF] hover:text-[#F97316] cursor-pointer text-sm transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full mt-2 py-3 rounded-[10px] text-sm font-bold text-white bg-[#F97316] hover:bg-[#EA6C0A] transition-all cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  "Sign in →"
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-[11px] text-[#9CA3AF] mt-6">
            No admin account? Contact your Super Admin for an invite. ·{" "}
            <a href="/" className="text-[#F97316] font-semibold no-underline hover:underline">
              Back to site
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}