"use client";

import { SearchFilters } from "@/types/search";
import { CATEGORIES, LOCATIONS, CONDITIONS, getCategoryCounts, formatPrice } from "@/lib/search-data";
import { useState } from "react";

interface Props {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  className?: string;
}

export default function SearchSidebar({ filters, onChange, className = "" }: Props) {
  const [openSections, setOpenSections] = useState({
    category: true,
    type: true,
    price: true,
    location: true,
    condition: true,
    rating: true,
    shipping: false,
  });

  const counts = getCategoryCounts();

  const toggle = (key: keyof typeof openSections) => {
    setOpenSections((p) => ({ ...p, [key]: !p[key] }));
  };

  const setFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const toggleArray = (key: "locations" | "conditions", value: string) => {
    const arr = filters[key];
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    onChange({ ...filters, [key]: next });
  };

  const Section = ({
    title,
    open,
    onToggle,
    children,
  }: {
    title: string;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }) => (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-transparent border-none cursor-pointer"
      >
        <span className="text-[13px] font-bold text-gray-900">{title}</span>
        <span
          className={`text-[11px] text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );

  return (
    <aside
      className={`bg-white border border-gray-200 rounded-xl overflow-hidden sticky top-[110px] h-fit max-h-[calc(100vh-130px)] overflow-y-auto ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <span className="text-sm font-bold text-gray-900">🔽 Filters</span>
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
          className="text-xs font-semibold text-orange-500 bg-transparent border-none cursor-pointer hover:text-orange-600"
        >
          Clear all
        </button>
      </div>

      {/* Category */}
      <Section title="Category" open={openSections.category} onToggle={() => toggle("category")}>
        <div className="flex flex-col gap-1">
          {CATEGORIES.map((c) => (
            <label key={c} className="flex items-center gap-2.5 py-1 cursor-pointer">
              <input
                type="radio"
                name="cat"
                className="w-[15px] h-[15px] accent-orange-500 cursor-pointer flex-shrink-0"
                checked={filters.category === c}
                onChange={() => setFilter("category", c)}
              />
              <span className="text-[13px] text-gray-700 flex-1">{c}</span>
              <span className="text-[11px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">
                {counts[c] || 0}
              </span>
            </label>
          ))}
        </div>
      </Section>

      {/* Listing type */}
      <Section title="Listing type" open={openSections.type} onToggle={() => toggle("type")}>
        <div className="flex flex-col gap-1">
          {[
            { v: "all", l: "All listings" },
            { v: "fixed", l: "Buy now" },
            { v: "auction", l: "⚡ Auction only" },
          ].map(({ v, l }) => (
            <label key={v} className="flex items-center gap-2.5 py-1 cursor-pointer">
              <input
                type="radio"
                name="type"
                className="w-[15px] h-[15px] accent-orange-500 cursor-pointer"
                checked={filters.type === v}
                onChange={() => setFilter("type", v as SearchFilters["type"])}
              />
              <span className="text-[13px] text-gray-700">{l}</span>
            </label>
          ))}
        </div>
      </Section>

      {/* Price range */}
      <Section title="Price range" open={openSections.price} onToggle={() => toggle("price")}>
        <div className="flex gap-2 mb-3.5">
          <div className="flex-1">
            <div className="text-[11px] text-gray-400 mb-1">Min</div>
            <input
              type="number"
              placeholder="0"
              value={filters.priceMin || ""}
              onChange={(e) => setFilter("priceMin", Number(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-orange-500 transition-colors"
            />
          </div>
          <div className="flex-1">
            <div className="text-[11px] text-gray-400 mb-1">Max</div>
            <input
              type="number"
              placeholder="Any"
              value={filters.priceMax === 20000000 ? "" : filters.priceMax}
              onChange={(e) =>
                setFilter("priceMax", Number(e.target.value) || 20000000)
              }
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-orange-500 transition-colors"
            />
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={20000000}
          step={5000}
          value={filters.priceMax}
          onChange={(e) => setFilter("priceMax", Number(e.target.value))}
          className="w-full h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-orange-500"
        />
        <div className="flex justify-between mt-1">
          <span className="text-[11px] text-gray-400">{formatPrice(filters.priceMin)}</span>
          <span className="text-[11px] text-gray-400">
            {filters.priceMax === 20000000 ? "Any" : formatPrice(filters.priceMax)}
          </span>
        </div>
        {/* Quick chips */}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {[
            { l: "Under ₦50K", max: 50000 },
            { l: "₦50K–₦200K", min: 50000, max: 200000 },
            { l: "₦200K–₦1M", min: 200000, max: 1000000 },
            { l: "Over ₦1M", min: 1000000 },
          ].map((r) => (
            <button
              key={r.l}
              onClick={() => {
                setFilter("priceMin", r.min || 0);
                setFilter("priceMax", r.max || 20000000);
              }}
              className="px-2 py-0.5 rounded-full border border-gray-200 bg-white text-[11px] text-gray-600 hover:border-orange-500 hover:text-orange-500 transition-colors cursor-pointer"
            >
              {r.l}
            </button>
          ))}
        </div>
      </Section>

      {/* Location */}
      <Section title="Location" open={openSections.location} onToggle={() => toggle("location")}>
        <div className="flex flex-col gap-1">
          {LOCATIONS.map((l) => (
            <label key={l} className="flex items-center gap-2.5 py-1 cursor-pointer">
              <input
                type="checkbox"
                className="w-[15px] h-[15px] accent-orange-500 cursor-pointer"
                checked={filters.locations.includes(l)}
                onChange={() => toggleArray("locations", l)}
              />
              <span className="text-[13px] text-gray-700">📍 {l}</span>
            </label>
          ))}
        </div>
      </Section>

      {/* Condition */}
      <Section title="Condition" open={openSections.condition} onToggle={() => toggle("condition")}>
        <div className="flex flex-col gap-1">
          {CONDITIONS.map((c) => (
            <label key={c} className="flex items-center gap-2.5 py-1 cursor-pointer">
              <input
                type="checkbox"
                className="w-[15px] h-[15px] accent-orange-500 cursor-pointer"
                checked={filters.conditions.includes(c)}
                onChange={() => toggleArray("conditions", c)}
              />
              <span className="text-[13px] text-gray-700">{c}</span>
            </label>
          ))}
        </div>
      </Section>

      {/* Rating */}
      <Section title="Seller rating" open={openSections.rating} onToggle={() => toggle("rating")}>
        <div className="flex flex-col gap-1">
          {[4.5, 4.0, 3.5, 0].map((r) => (
            <label key={r} className="flex items-center gap-2.5 py-1 cursor-pointer">
              <input
                type="radio"
                name="rating"
                className="w-[15px] h-[15px] accent-orange-500 cursor-pointer"
                checked={filters.rating === r}
                onChange={() => setFilter("rating", r)}
              />
              <span className="text-[13px] text-gray-700">
                {r === 0 ? "Any rating" : `${r}+ ⭐`}
              </span>
            </label>
          ))}
        </div>
      </Section>

      {/* Shipping */}
      <Section title="Shipping" open={openSections.shipping} onToggle={() => toggle("shipping")}>
        <label className="flex items-center gap-2.5 py-1 cursor-pointer">
          <input
            type="checkbox"
            className="w-[15px] h-[15px] accent-orange-500 cursor-pointer"
            checked={filters.freeShipping}
            onChange={(e) => setFilter("freeShipping", e.target.checked)}
          />
          <span className="text-[13px] text-gray-700">Free shipping only</span>
        </label>
      </Section>
    </aside>
  );
}