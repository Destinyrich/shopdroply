"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

/* ─── Types ─────────────────────────────────────────────────────── */
interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: "buyer" | "seller" | "admin";
  isVerified: boolean;
  createdAt: string;
}

interface NotifPrefs {
  orderUpdates: boolean;
  bidAlerts: boolean;
  priceDrops: boolean;
  marketing: boolean;
  smsAlerts: boolean;
}

/* ─── Design tokens ─────────────────────────────────────────────── */
const C = {
  orange: "#F97316", orangeLight: "#FFF7ED", orangeBdr: "#FED7AA",
  green: "#16A34A", greenLight: "#F0FDF4", greenBdr: "#BBF7D0",
  red: "#DC2626", redLight: "#FEF2F2", redBdr: "#FECACA",
  bg: "#F9FAFB", border: "#E5E7EB",
  text: "#111827", textMid: "#374151", textSub: "#6B7280", textLight: "#9CA3AF",
};

/* ─── Helpers ───────────────────────────────────────────────────── */
function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
}

/* ─── Toast ─────────────────────────────────────────────────────── */
function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-[fadeUp_0.3s_ease_both]">
      <div
        className={`px-5 py-3 rounded-[10px] text-sm font-semibold shadow-[0_4px_24px_rgba(0,0,0,0.12)] border ${
          type === "success"
            ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]"
            : "bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]"
        }`}
      >
        {msg}
      </div>
    </div>
  );
}

/* ─── Toggle Switch ─────────────────────────────────────────────── */
function Toggle({
  checked,
  onChange,
  label,
  sub,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1">
        <div className="text-[13px] font-semibold text-[#111827]">{label}</div>
        {sub && <div className="text-[11px] text-[#6B7280] mt-0.5">{sub}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-all cursor-pointer shrink-0 ${
          checked ? "bg-[#F97316]" : "bg-[#E5E7EB]"
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

/* ─── Section Card ──────────────────────────────────────────────── */
function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#E5E7EB] flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-bold text-[#111827]">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ─── Label ─────────────────────────────────────────────────────── */
function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[13px] font-semibold text-[#374151] mb-1.5 block">
      {children}{required && <span className="text-[#DC2626] ml-0.5">*</span>}
    </label>
  );
}

/* ─── Field Error ───────────────────────────────────────────────── */
function FieldError({ msg }: { msg?: string }) {
  return msg ? (
    <div className="text-xs text-[#DC2626] mt-1 flex items-center gap-1">⚠ {msg}</div>
  ) : null;
}

/* ─── Skeleton ──────────────────────────────────────────────────── */
function SkeletonSettings() {
  return (
    <div className="max-w-[720px] mx-auto px-4 py-6 animate-pulse space-y-4">
      <div className="h-24 bg-white border border-[#E5E7EB] rounded-[14px]" />
      <div className="h-80 bg-white border border-[#E5E7EB] rounded-[14px]" />
      <div className="h-64 bg-white border border-[#E5E7EB] rounded-[14px]" />
    </div>
  );
}

/* ─── Main Export ───────────────────────────────────────────────── */
export default function SettingsPage() {
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  /* Profile form */
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  /* Password form */
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState(false);

  /* Notification prefs */
  const [prefs, setPrefs] = useState<NotifPrefs>({
    orderUpdates: true,
    bidAlerts: true,
    priceDrops: true,
    marketing: false,
    smsAlerts: true,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const json = await res.json();
      if (json.success && json.data) {
        const u: UserProfile = json.data;
        setUser(u);
        setFirstName(u.firstName || "");
        setLastName(u.lastName || "");
        setPhone(u.phone || "");
      }
    } catch (err) {
      console.error("Failed to load profile", err);
      setToast({ msg: "❌ Failed to load profile", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const validateProfile = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "First name is required";
    if (!lastName.trim()) e.lastName = "Last name is required";
    if (phone && !/^\d{10,11}$/.test(phone.replace(/\s/g, ""))) {
      e.phone = "Enter a valid Nigerian phone number";
    }
    return e;
  };

  const handleSaveProfile = async () => {
    const e = validateProfile();
    if (Object.keys(e).length) {
      setProfileErrors(e);
      return;
    }
    setProfileErrors({});
    setSavingProfile(true);

    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, phone }),
      });
      if (res.ok) {
        setToast({ msg: "✅ Profile updated successfully", type: "success" });
        setUser((prev) => prev ? { ...prev, firstName, lastName, phone } : prev);
      } else {
        throw new Error();
      }
    } catch {
      setToast({ msg: "❌ Failed to update profile", type: "error" });
    } finally {
      setSavingProfile(false);
    }
  };

  const validatePassword = () => {
    const e: Record<string, string> = {};
    if (!currentPassword) e.currentPassword = "Current password is required";
    if (!newPassword) e.newPassword = "New password is required";
    else if (newPassword.length < 8) e.newPassword = "Must be at least 8 characters";
    if (newPassword !== confirmPassword) e.confirmPassword = "Passwords do not match";
    return e;
  };

  const handleChangePassword = async () => {
    const e = validatePassword();
    if (Object.keys(e).length) {
      setPasswordErrors(e);
      return;
    }
    setPasswordErrors({});
    setSavingPassword(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setToast({ msg: "🔐 Password changed successfully", type: "success" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const json = await res.json().catch(() => ({}));
        setToast({ msg: json.error || "❌ Failed to change password", type: "error" });
      }
    } catch {
      setToast({ msg: "❌ Network error. Try again.", type: "error" });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/auth");
    } catch {
      setToast({ msg: "❌ Failed to logout", type: "error" });
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone. All your data, orders, and listings will be permanently removed."
    );
    if (!confirmed) return;

    try {
      const res = await fetch("/api/auth/me", { method: "DELETE" });
      if (res.ok) {
        router.push("/auth");
      } else {
        setToast({ msg: "❌ Failed to delete account. Contact support.", type: "error" });
      }
    } catch {
      setToast({ msg: "❌ Network error. Try again.", type: "error" });
    }
  };

  if (loading) return <SkeletonSettings />;
  if (!user) return null;

  const initials = `${(user.firstName?.[0] || "").toUpperCase()}${(user.lastName?.[0] || "").toUpperCase()}`;

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-[720px] mx-auto px-4 py-4">
          <h1 className="text-[22px] font-extrabold text-[#111827]">Account Settings</h1>
          <p className="text-[13px] text-[#6B7280] mt-0.5">
            Manage your profile, security, and preferences
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[720px] mx-auto px-4 py-6 space-y-4">
        {/* Profile header card */}
        <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#F97316] text-white flex items-center justify-center text-xl font-extrabold shrink-0">
            {initials || "👤"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-bold text-[#111827]">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-[13px] text-[#6B7280] truncate">{user.email}</div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]">
                {user.isVerified ? "✓ Verified" : "⏳ Unverified"}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                👤 {user.role}
              </span>
              <span className="text-[11px] text-[#9CA3AF]">Member since {formatDate(user.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Profile info */}
        <SectionCard title="Profile Information" icon="👤">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label required>First name</Label>
                <input
                  className={`w-full px-3.5 py-2.5 border rounded-[10px] text-sm text-[#111827] outline-none transition-all bg-white placeholder:text-[#9CA3AF] ${
                    profileErrors.firstName ? "border-[#DC2626]" : "border-[#E5E7EB] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
                  }`}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Emeka"
                />
                <FieldError msg={profileErrors.firstName} />
              </div>
              <div>
                <Label required>Last name</Label>
                <input
                  className={`w-full px-3.5 py-2.5 border rounded-[10px] text-sm text-[#111827] outline-none transition-all bg-white placeholder:text-[#9CA3AF] ${
                    profileErrors.lastName ? "border-[#DC2626]" : "border-[#E5E7EB] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
                  }`}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Okafor"
                />
                <FieldError msg={profileErrors.lastName} />
              </div>
            </div>
            <div>
              <Label>Email address</Label>
              <input
                className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-[10px] text-sm text-[#9CA3AF] outline-none bg-[#F9FAFB] cursor-not-allowed"
                value={user.email}
                disabled
              />
              <div className="text-[11px] text-[#9CA3AF] mt-1">Email cannot be changed. Contact support if needed.</div>
            </div>
            <div>
              <Label>Phone number</Label>
              <div className="flex gap-0">
                <div className="px-3 py-2.5 border border-r-0 border-[#E5E7EB] rounded-l-[10px] text-[13px] text-[#374151] bg-[#F9FAFB] flex items-center gap-1 whitespace-nowrap">
                  🇳🇬 +234
                </div>
                <input
                  className={`w-full px-3.5 py-2.5 border rounded-r-[10px] text-sm text-[#111827] outline-none transition-all bg-white placeholder:text-[#9CA3AF] ${
                    profileErrors.phone ? "border-[#DC2626]" : "border-[#E5E7EB] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
                  }`}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="803 000 0000"
                />
              </div>
              <FieldError msg={profileErrors.phone} />
            </div>
            <div className="pt-1">
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="bg-[#F97316] text-white rounded-[10px] px-6 py-2.5 text-sm font-bold hover:bg-[#EA6C0A] hover:-translate-y-px hover:shadow-[0_4px_18px_rgba(249,115,22,0.3)] transition-all cursor-pointer disabled:bg-[#D1D5DB] disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                {savingProfile ? "Saving..." : "💾 Save changes"}
              </button>
            </div>
          </div>
        </SectionCard>

        {/* Security */}
        <SectionCard title="Security" icon="🔐">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label required>Current password</Label>
                <input
                  type={showPasswords ? "text" : "password"}
                  className={`w-full px-3.5 py-2.5 border rounded-[10px] text-sm text-[#111827] outline-none transition-all bg-white placeholder:text-[#9CA3AF] ${
                    passwordErrors.currentPassword ? "border-[#DC2626]" : "border-[#E5E7EB] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
                  }`}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <FieldError msg={passwordErrors.currentPassword} />
              </div>
              <div />
              <div>
                <Label required>New password</Label>
                <input
                  type={showPasswords ? "text" : "password"}
                  className={`w-full px-3.5 py-2.5 border rounded-[10px] text-sm text-[#111827] outline-none transition-all bg-white placeholder:text-[#9CA3AF] ${
                    passwordErrors.newPassword ? "border-[#DC2626]" : "border-[#E5E7EB] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
                  }`}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                />
                <FieldError msg={passwordErrors.newPassword} />
              </div>
              <div>
                <Label required>Confirm new password</Label>
                <input
                  type={showPasswords ? "text" : "password"}
                  className={`w-full px-3.5 py-2.5 border rounded-[10px] text-sm text-[#111827] outline-none transition-all bg-white placeholder:text-[#9CA3AF] ${
                    passwordErrors.confirmPassword ? "border-[#DC2626]" : "border-[#E5E7EB] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
                  }`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <FieldError msg={passwordErrors.confirmPassword} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-[13px] text-[#6B7280] cursor-pointer select-none">
              <input
                type="checkbox"
                className="accent-[#F97316] w-4 h-4 cursor-pointer"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
              />
              Show passwords
            </label>
            <div className="pt-1">
              <button
                onClick={handleChangePassword}
                disabled={savingPassword}
                className="bg-[#111827] text-white rounded-[10px] px-6 py-2.5 text-sm font-bold hover:bg-[#1F2937] transition-all cursor-pointer disabled:bg-[#D1D5DB] disabled:cursor-not-allowed"
              >
                {savingPassword ? "Updating..." : "🔐 Change password"}
              </button>
            </div>
          </div>
        </SectionCard>

        {/* Notification preferences */}
        <SectionCard title="Notification Preferences" icon="🔔">
          <div className="flex flex-col divide-y divide-[#E5E7EB]">
            <Toggle
              label="Order updates"
              sub="Get notified when your order status changes (shipped, delivered, etc.)"
              checked={prefs.orderUpdates}
              onChange={(v) => setPrefs((p) => ({ ...p, orderUpdates: v }))}
            />
            <Toggle
              label="Bid alerts"
              sub="Get notified when you're outbid or when an auction you're watching ends"
              checked={prefs.bidAlerts}
              onChange={(v) => setPrefs((p) => ({ ...p, bidAlerts: v }))}
            />
            <Toggle
              label="Price drops"
              sub="Get notified when items in your watchlist drop in price"
              checked={prefs.priceDrops}
              onChange={(v) => setPrefs((p) => ({ ...p, priceDrops: v }))}
            />
            <Toggle
              label="SMS alerts"
              sub="Receive important updates via SMS to your registered phone number"
              checked={prefs.smsAlerts}
              onChange={(v) => setPrefs((p) => ({ ...p, smsAlerts: v }))}
            />
            <Toggle
              label="Marketing & promotions"
              sub="Receive deals, discounts, and marketplace news"
              checked={prefs.marketing}
              onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
            />
          </div>
          <div className="pt-4 mt-2 border-t border-[#E5E7EB]">
            <button
              onClick={() => setToast({ msg: "✅ Preferences saved", type: "success" })}
              className="bg-[#F97316] text-white rounded-[10px] px-6 py-2.5 text-sm font-bold hover:bg-[#EA6C0A] hover:-translate-y-px hover:shadow-[0_4px_18px_rgba(249,115,22,0.3)] transition-all cursor-pointer"
            >
              💾 Save preferences
            </button>
          </div>
        </SectionCard>

        {/* Danger zone */}
        <SectionCard title="Danger Zone" icon="⚠️">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-sm font-bold text-[#111827]">Log out</div>
                <div className="text-[11px] text-[#6B7280]">Sign out of your account on this device</div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-white border border-[#E5E7EB] text-[#374151] rounded-[10px] px-5 py-2 text-sm font-semibold hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all cursor-pointer"
              >
                🚪 Log out
              </button>
            </div>
            <div className="border-t border-[#E5E7EB] pt-3 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-sm font-bold text-[#DC2626]">Delete account</div>
                <div className="text-[11px] text-[#6B7280]">Permanently delete your account and all associated data</div>
              </div>
              <button
                onClick={handleDeleteAccount}
                className="bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] rounded-[10px] px-5 py-2 text-sm font-semibold hover:bg-[#DC2626] hover:text-white hover:border-[#DC2626] transition-all cursor-pointer"
              >
                🗑 Delete account
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}