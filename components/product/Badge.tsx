"use client";

interface Props {
  type: string;
}

const STYLES: Record<string, { bg: string; color: string; border: string; icon: string }> = {
  Verified: { bg: "bg-green-50", color: "text-green-600", border: "border-green-200", icon: "✅" },
  "Top rated": { bg: "bg-orange-50", color: "text-orange-600", border: "border-orange-200", icon: "⭐" },
  "CAC verified": { bg: "bg-blue-50", color: "text-blue-600", border: "border-blue-200", icon: "🏢" },
  "Business seller": { bg: "bg-violet-50", color: "text-violet-600", border: "border-violet-200", icon: "🏢" },
};

export default function Badge({ type }: Props) {
  const s = STYLES[type] || STYLES.Verified;
  return (
    <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border ${s.bg} ${s.color} ${s.border}`}>
      {s.icon} {type}
    </span>
  );
}