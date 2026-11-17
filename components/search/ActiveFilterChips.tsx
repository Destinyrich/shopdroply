"use client";

import { SearchFilters } from "@/types/search";

interface Props {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
}

export default function ActiveFilterChips({ filters, onChange }: Props) {
  const chips: { label: string; remove: () => void }[] = [];

  if (filters.category !== "All") {
    chips.push({
      label: filters.category,
      remove: () => onChange({ ...filters, category: "All" }),
    });
  }
  if (filters.type !== "all") {
    chips.push({
      label: filters.type === "fixed" ? "Buy now" : "Auction",
      remove: () => onChange({ ...filters, type: "all" }),
    });
  }
  filters.locations.forEach((l) =>
    chips.push({
      label: `📍 ${l}`,
      remove: () => onChange({ ...filters, locations: filters.locations.filter((x) => x !== l) }),
    })
  );
  filters.conditions.forEach((c) =>
    chips.push({
      label: c,
      remove: () => onChange({ ...filters, conditions: filters.conditions.filter((x) => x !== c) }),
    })
  );
  if (filters.rating > 0) {
    chips.push({
      label: `${filters.rating}+ ⭐`,
      remove: () => onChange({ ...filters, rating: 0 }),
    });
  }
  if (filters.freeShipping) {
    chips.push({
      label: "Free shipping",
      remove: () => onChange({ ...filters, freeShipping: false }),
    });
  }
  if (filters.priceMin > 0 || filters.priceMax < 20000000) {
    const min = filters.priceMin;
    const max = filters.priceMax === 20000000 ? undefined : filters.priceMax;
    chips.push({
      label: max ? `₦${min.toLocaleString()} - ₦${max.toLocaleString()}` : `From ₦${min.toLocaleString()}`,
      remove: () => onChange({ ...filters, priceMin: 0, priceMax: 20000000 }),
    });
  }

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {chips.map((c, i) => (
        <div
          key={i}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs font-semibold text-orange-600"
        >
          {c.label}
          <button
            onClick={c.remove}
            className="bg-transparent border-none cursor-pointer text-orange-600 text-sm leading-none hover:text-orange-700"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          onChange({
            category: "All",
            type: "all",
            locations: [],
            conditions: [],
            rating: 0,
            freeShipping: false,
            priceMin: 0,
            priceMax: 20000000,
          })
        }
        className="bg-transparent border-none text-xs font-semibold text-red-500 cursor-pointer hover:text-red-600"
      >
        Clear all
      </button>
    </div>
  );
}