"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchSidebar from "@/components/search/SearchSidebar";
import SearchListingCard from "@/components/search/SearchListingCard";
import ActiveFilterChips from "@/components/search/ActiveFilterChips";
import Pagination from "@/components/search/Pagination";
import MobileFilterDrawer from "@/components/search/MobileFilterDrawer";
import { SORT_OPTIONS } from "@/lib/search-data";
import { SearchFilters, SortOption, ViewMode, SearchListing } from "@/types/search";

const PER_PAGE = 8;

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>({
    category: "All",
    type: "all",
    locations: [],
    conditions: [],
    rating: 0,
    freeShipping: false,
    priceMin: 0,
    priceMax: 20000000,
  });
  const [sort, setSort] = useState<SortOption>("relevance");
  const [view, setView] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [allListings, setAllListings] = useState<SearchListing[]>([]);

  // Fetch live listings once on mount
  useEffect(() => {
    setLoading(true);
    fetch("/api/listings")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const transformed: SearchListing[] = res.data.map((l: any) => ({
            id: l.id,
            title: l.title,
            price: l.price,
            originalPrice: l.price,
            type: l.type,
            image: l.images?.[0] || "📦",
            category: l.category,
            location: l.location,
            seller: l.sellerName,
            rating: l.sellerRating,
            reviews: l.sellerReviews,
            badge: l.sellerBadge,
            shipping: l.shippingFee === 0 ? "Free" : `₦${l.shippingFee?.toLocaleString()}`,
            condition: l.condition,
            bids: l.bids,
            endTime: l.endTime,
          }));
          setAllListings(transformed);
        }
      })
      .catch(() => setAllListings([]))
      .finally(() => setLoading(false));
  }, []);

  // Simulate loading on filter change
  useEffect(() => {
    setPage(1);
  }, [query, filters, sort]);

  const filtered = useMemo(() => {
    let results = allListings.filter((item) => {
      if (filters.category !== "All" && item.category !== filters.category) return false;
      if (filters.type !== "all" && item.type !== filters.type) return false;
      if (filters.locations.length && !filters.locations.includes("All Nigeria") && !filters.locations.includes(item.location))
        return false;
      if (filters.conditions.length && !filters.conditions.includes(item.condition)) return false;
      if (filters.rating > 0 && item.rating < filters.rating) return false;
      if (filters.freeShipping && item.shipping !== "Free") return false;
      if (item.price < filters.priceMin || item.price > filters.priceMax) return false;
      if (query) {
        const q = query.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchCat = item.category.toLowerCase().includes(q);
        const matchSeller = item.seller.toLowerCase().includes(q);
        if (!matchTitle && !matchCat && !matchSeller) return false;
      }
      return true;
    });

    switch (sort) {
      case "price_asc":
        results.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        results.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        results.sort((a, b) => b.rating - a.rating);
        break;
      case "bids":
        results.sort((a, b) => (b.bids || 0) - (a.bids || 0));
        break;
      default:
        break;
    }

    return results;
  }, [query, filters, sort, allListings]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSearch = () => {
    setQuery(searchInput);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category !== "All") count++;
    if (filters.type !== "all") count++;
    count += filters.locations.length;
    count += filters.conditions.length;
    if (filters.rating > 0) count++;
    if (filters.freeShipping) count++;
    if (filters.priceMin > 0 || filters.priceMax < 20000000) count++;
    return count;
  }, [filters]);

  return (
    <>
      <Navbar />
      <MobileFilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} filters={filters} onChange={setFilters} />

      <main className="pt-[110px] bg-gray-50 min-h-screen">
        <div className="max-w-[1320px] mx-auto px-4 pb-12">
          <nav className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 mb-3">
            <span className="text-orange-500 cursor-pointer hover:underline">Home</span>
            <span>›</span>
            <span className="text-orange-500 cursor-pointer hover:underline">Search</span>
            {query && (
              <>
                <span>›</span>
                <span className="text-gray-900 font-semibold">&quot;{query}&quot;</span>
              </>
            )}
          </nav>

          <div className="mb-4">
            <div className="flex gap-2 max-w-xl">
              <div className="flex-1 relative">
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search for anything..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-5 py-2.5 bg-orange-500 text-white rounded-lg font-bold text-sm hover:bg-orange-600 transition-colors cursor-pointer"
              >
                🔍
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div>
              <h1 className="text-lg font-extrabold text-gray-900">
                {loading ? "Searching..." : `${filtered.length.toLocaleString()} results${query ? ` for "${query}"` : ""}`}
              </h1>
            </div>

            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-orange-500 hover:text-orange-500 transition-colors cursor-pointer"
            >
              🔽 Filters
              {activeFilterCount > 0 && (
                <span className="w-[18px] h-[18px] bg-orange-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="hidden lg:flex items-center gap-2 ml-auto">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="px-3 py-2 pr-8 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 outline-none cursor-pointer appearance-none focus:border-orange-500"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%236B7280' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 10px center",
                }}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                {[
                  { v: "grid" as const, i: "⊞" },
                  { v: "list" as const, i: "☰" },
                ].map(({ v, i }) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`w-9 h-9 flex items-center justify-center text-sm cursor-pointer transition-colors ${
                      view === v ? "bg-orange-500 text-white" : "bg-white text-gray-500 hover:text-orange-500"
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ActiveFilterChips filters={filters} onChange={setFilters} />

          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 mt-4">
            <div className="hidden lg:block">
              <SearchSidebar filters={filters} onChange={setFilters} />
            </div>

            <div>
              {loading ? (
                <div
                  className={
                    view === "grid"
                      ? "grid grid-cols-2 md:grid-cols-3 gap-3.5"
                      : "flex flex-col gap-2"
                  }
                >
                  {Array(6)
                    .fill(0)
                    .map((_, i) => (
                      <div
                        key={i}
                        className="bg-white rounded-xl overflow-hidden border border-gray-200"
                      >
                        <div className="h-40 bg-gray-100 animate-pulse" />
                        <div className="p-3 flex flex-col gap-2">
                          <div className="h-3 bg-gray-100 rounded w-3/5 animate-pulse" />
                          <div className="h-3.5 bg-gray-100 rounded animate-pulse" />
                          <div className="h-3.5 bg-gray-100 rounded w-4/5 animate-pulse" />
                          <div className="h-5 bg-gray-100 rounded w-2/5 animate-pulse" />
                        </div>
                      </div>
                    ))}
                </div>
              ) : visible.length === 0 ? (
                <div className="text-center py-16 px-6 bg-white rounded-xl border border-gray-200">
                  <div className="text-5xl mb-4">🔍</div>
                  <div className="text-lg font-bold text-gray-900 mb-2">No results found</div>
                  <div className="text-sm text-gray-500 mb-6">
                    Try different keywords or adjust your filters
                  </div>
                  <button
                    onClick={() => {
                      setQuery("");
                      setSearchInput("");
                      setFilters({
                        category: "All",
                        type: "all",
                        locations: [],
                        conditions: [],
                        rating: 0,
                        freeShipping: false,
                        priceMin: 0,
                        priceMax: 20000000,
                      });
                    }}
                    className="px-6 py-2.5 bg-orange-500 text-white rounded-lg font-bold text-sm hover:bg-orange-600 transition-colors cursor-pointer"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <>
                  {view === "grid" ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
                      {visible.map((item) => (
                        <SearchListingCard key={item.id} item={item} view="grid" />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {visible.map((item) => (
                        <SearchListingCard key={item.id} item={item} view="list" />
                      ))}
                    </div>
                  )}

                  <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

                  <div className="text-center mt-3 text-xs text-gray-400">
                    Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of{" "}
                    {filtered.length} results
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="pt-[110px] bg-gray-50 min-h-screen flex items-center justify-center">
      <div className="text-orange-500 font-bold">Loading search...</div>
    </div>}>
      <SearchContent />
    </Suspense>
  );
}