"use client";

import { useState, useEffect } from "react";

/* ─── Types ─────────────────────────────────────────────────────── */
interface Notification {
  id: string;
  userId: string;
  icon: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  createdAt: string;
}

/* ─── Design tokens ─────────────────────────────────────────────── */
const C = {
  orange: "#F97316", orangeHov: "#EA6C0A", orangeLight: "#FFF7ED", orangeBdr: "#FED7AA",
  green: "#16A34A", greenLight: "#F0FDF4", greenBdr: "#BBF7D0",
  red: "#DC2626", redLight: "#FEF2F2", redBdr: "#FECACA",
  amber: "#D97706", amberLight: "#FFFBEB", amberBdr: "#FDE68A",
  blue: "#2563EB", blueLight: "#EFF6FF", blueBdr: "#BFDBFE",
  bg: "#F9FAFB", surface: "#FFFFFF", border: "#E5E7EB",
  text: "#111827", textMid: "#374151", textSub: "#6B7280", textLight: "#9CA3AF",
};

/* ─── Helpers ───────────────────────────────────────────────────── */
function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

/* ─── Toast ─────────────────────────────────────────────────────── */
function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
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

/* ─── Notification Row ──────────────────────────────────────────── */
function NotificationRow({
  notif,
  onRead,
  reading,
}: {
  notif: Notification;
  onRead: (id: string) => void;
  reading: boolean;
}) {
  return (
    <div
      className={`flex gap-3 items-start p-4 rounded-[12px] border transition-all ${
        notif.unread
          ? "bg-white border-[#E5E7EB] hover:border-[#F97316] hover:shadow-[0_2px_12px_rgba(0,0,0,0.05)]"
          : "bg-[#F9FAFB] border-transparent hover:bg-white hover:border-[#E5E7EB]"
      }`}
    >
      {/* Icon */}
      <div
        className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-xl shrink-0 border ${
          notif.unread ? "bg-[#FFF7ED] border-[#FED7AA]" : "bg-white border-[#E5E7EB]"
        }`}
      >
        {notif.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${notif.unread ? "text-[#111827]" : "text-[#374151]"}`}>
                {notif.title}
              </span>
              {notif.unread && (
                <span className="w-2 h-2 rounded-full bg-[#F97316] shrink-0" />
              )}
            </div>
            <div className={`text-[13px] mt-0.5 leading-relaxed ${notif.unread ? "text-[#374151]" : "text-[#6B7280]"}`}>
              {notif.body}
            </div>
          </div>
          <span className="text-[11px] text-[#9CA3AF] shrink-0 whitespace-nowrap">{formatDate(notif.createdAt)}</span>
        </div>
      </div>

      {/* Mark read */}
      {notif.unread && (
        <button
          onClick={() => onRead(notif.id)}
          disabled={reading}
          className="shrink-0 text-[11px] font-semibold text-[#F97316] hover:text-[#EA6C0A] hover:underline transition-all cursor-pointer disabled:opacity-50 bg-transparent border-none"
        >
          {reading ? "..." : "Mark read"}
        </button>
      )}
    </div>
  );
}

/* ─── Empty State ───────────────────────────────────────────────── */
function EmptyState({ filter }: { filter: string }) {
  const msgs: Record<string, { icon: string; title: string; body: string }> = {
    all: { icon: "🔔", title: "No notifications", body: "When something happens with your orders, bids, or account, you'll see it here." },
    unread: { icon: "📭", title: "All caught up!", body: "You have no unread notifications." },
    read: { icon: "📖", title: "No read notifications", body: "Notifications you mark as read will show here." },
  };
  const m = msgs[filter] || msgs.all;

  return (
    <div className="text-center py-20 px-6 bg-white rounded-[14px] border border-[#E5E7EB]">
      <div className="text-[52px] mb-3">{m.icon}</div>
      <div className="text-lg font-bold text-[#111827] mb-1.5">{m.title}</div>
      <div className="text-sm text-[#6B7280] mb-5 max-w-[320px] mx-auto">{m.body}</div>
    </div>
  );
}

/* ─── Skeleton Row ──────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <div className="flex gap-3 items-start p-4 rounded-[12px] border border-[#E5E7EB] bg-white animate-pulse">
      <div className="w-10 h-10 bg-[#E5E7EB] rounded-[10px] shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-1/3 bg-[#E5E7EB] rounded" />
        <div className="h-3 w-3/4 bg-[#E5E7EB] rounded" />
      </div>
      <div className="h-3 w-12 bg-[#E5E7EB] rounded shrink-0" />
    </div>
  );
}

/* ─── Main Export ───────────────────────────────────────────────── */
export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [readingId, setReadingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchNotifs();
  }, []);

  const fetchNotifs = async () => {
    try {
      const res = await fetch("/api/buyer/notifications");
      const json = await res.json();
      if (json.success) {
        setNotifs(json.data);
      }
    } catch (err) {
      console.error("Failed to load notifications", err);
      setToast({ msg: "❌ Failed to load notifications", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    setReadingId(id);
    try {
      const res = await fetch("/api/buyer/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifId: id }),
      });
      if (res.ok) {
        setNotifs((prev) =>
          prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
        );
      } else {
        throw new Error();
      }
    } catch {
      setToast({ msg: "❌ Failed to mark as read", type: "error" });
    } finally {
      setReadingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      const res = await fetch("/api/buyer/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })));
        setToast({ msg: "✅ All notifications marked as read", type: "success" });
      } else {
        throw new Error();
      }
    } catch {
      setToast({ msg: "❌ Failed to mark all as read", type: "error" });
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifs.filter((n) => n.unread).length;

  const filtered = notifs.filter((n) => {
    if (filter === "unread") return n.unread;
    if (filter === "read") return !n.unread;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-[680px] mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-[22px] font-extrabold text-[#111827]">Notifications</h1>
              {unreadCount > 0 && (
                <span className="bg-[#F97316] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="bg-white border border-[#E5E7EB] text-[#374151] rounded-[10px] px-4 py-2 text-[13px] font-semibold hover:border-[#F97316] hover:text-[#F97316] hover:bg-[#FFF7ED] transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto"
              >
                {markingAll ? "Marking..." : "✓ Mark all as read"}
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 mt-4 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { key: "all", label: "All", count: notifs.length },
              { key: "unread", label: "Unread", count: unreadCount },
              { key: "read", label: "Read", count: notifs.length - unreadCount },
            ].map((tab) => {
              const active = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as typeof filter)}
                  className={`px-3.5 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                    active
                      ? "bg-[#F97316] text-white border-[#F97316]"
                      : "bg-white text-[#374151] border-[#E5E7EB] hover:border-[#F97316] hover:text-[#F97316]"
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full ${active ? "bg-white/20" : "bg-[#F3F4F6] text-[#6B7280]"}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[680px] mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((notif) => (
              <NotificationRow
                key={notif.id}
                notif={notif}
                onRead={handleMarkRead}
                reading={readingId === notif.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}