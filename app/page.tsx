"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";

/* ─── Types ─── */
interface Slide {
  tag: string;
  headline: string;
  headline2: string;
  sub: string;
  cta: string;
  cta2: string;
  bg: string;
  accent: string;
  img: string;
  badge: { text: string; icon: string };
}

/* ─── Data ─── */
const HERO_SLIDES: Slide[] = [
  {
    tag: "🔥 Deals ending today",
    headline: "Find it. Bid it.",
    headline2: "Own it.",
    sub: "Nigeria's trusted escrow marketplace — your money is protected until delivery.",
    cta: "Shop now",
    cta2: "Start selling",
    bg: "linear-gradient(120deg,#FFF7ED 0%,#FFEDD5 50%,#FEF3C7 100%)",
    accent: "#F97316",
    img: "🛍️",
    badge: { text: "₦2.4B secured in escrow", icon: "🛡️" },
  },
  {
    tag: "⚡ Live auctions",
    headline: "Bid smart.",
    headline2: "Win big.",
    sub: "Thousands of live auctions closing every hour. Auto-bid keeps you winning while you're away.",
    cta: "Browse auctions",
    cta2: "List an auction",
    bg: "linear-gradient(120deg,#EFF6FF 0%,#DBEAFE 50%,#E0F2FE 100%)",
    accent: "#2563EB",
    img: "⚡",
    badge: { text: "18,000+ live auctions", icon: "⚡" },
  },
  {
    tag: "✅ Verified sellers",
    headline: "Shop with",
    headline2: "total confidence.",
    sub: "Every seller identity verified via NIN & BVN. Escrow holds your funds until you confirm delivery.",
    cta: "Start shopping",
    cta2: "Become a seller",
    bg: "linear-gradient(120deg,#F0FDF4 0%,#DCFCE7 50%,#D1FAE5 100%)",
    accent: "#16A34A",
    img: "✅",
    badge: { text: "98K+ verified sellers", icon: "✅" },
  },
];

const STATS = [
  { val: "420K+", label: "Active listings" },
  { val: "98K+", label: "Verified sellers" },
  { val: "₦2.4B+", label: "Secured in escrow" },
  { val: "99.2%", label: "Successful deliveries" },
];

const HOW_IT_WORKS = [
  { n: "01", icon: "🔍", title: "Find your item", body: "Search 420,000+ listings. Filter by location, price, seller rating, listing type." },
  { n: "02", icon: "💳", title: "Pay into escrow", body: "Pay by card, bank transfer, USSD or wallet. Your money is held — not sent to seller yet." },
  { n: "03", icon: "🚚", title: "Tracked delivery", body: "Seller ships via GIG, Fez or DHL. You get live SMS updates at every step of the journey." },
  { n: "04", icon: "✅", title: "Confirm & release", body: "You confirm delivery. Escrow releases funds to seller. Done. Every transaction, every time." },
];

/* ─── Components ─── */

function HeroBanner() {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setActive((p) => (p + 1) % HERO_SLIDES.length), 5000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const slide = HERO_SLIDES[active];

  const goTo = useCallback(
    (index: number) => {
      setActive(index);
      startTimer();
    },
    [startTimer]
  );

  const goPrev = useCallback(() => {
    setActive((p) => (p - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
    startTimer();
  }, [startTimer]);

  const goNext = useCallback(() => {
    setActive((p) => (p + 1) % HERO_SLIDES.length);
    startTimer();
  }, [startTimer]);

  return (
    <section className="mt-[20px] px-4 max-w-[1280px] mx-auto">
      <div
        className="rounded-2xl overflow-hidden border border-[#E5E7EB] relative min-h-[340px] transition-colors duration-500"
        style={{ background: slide.bg }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center min-h-[340px]">
          <div className="p-8 lg:p-10 xl:p-12 relative z-10" key={active}>
            <div className="animate-fade-in-up inline-flex items-center gap-1.5 bg-white/70 backdrop-blur-sm border border-black/5 px-3 py-1 rounded-full mb-4">
              <span className="text-xs font-bold text-[#374151]">{slide.tag}</span>
            </div>
            <h1
              className="animate-fade-in-up text-3xl lg:text-[42px] font-extrabold leading-[1.1] text-[#1A1A1A] tracking-tight mb-1.5"
              style={{ animationDelay: "0.05s" }}
            >
              {slide.headline}
              <br />
              <span style={{ color: slide.accent }}>{slide.headline2}</span>
            </h1>
            <p
              className="animate-fade-in-up text-[15px] text-[#6B7280] leading-relaxed max-w-[400px] mb-7 mt-3"
              style={{ animationDelay: "0.1s" }}
            >
              {slide.sub}
            </p>
            <div className="animate-fade-in-up flex flex-wrap gap-3" style={{ animationDelay: "0.15s" }}>
              <Link href="/search" className="sdp-btn-orange px-7 py-3 text-[15px] rounded-[10px] no-underline inline-block">
                {slide.cta}
              </Link>
              <Link href="/auth?seller=1" className="sdp-btn-white px-7 py-3 text-[15px] rounded-[10px] no-underline inline-block">
                {slide.cta2}
              </Link>
            </div>
            <div className="inline-flex items-center gap-1.5 mt-6 bg-white/80 border border-black/5 px-3.5 py-1.5 rounded-lg">
              <span>{slide.badge.icon}</span>
              <span className="text-xs font-semibold text-[#374151]">{slide.badge.text}</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center justify-center text-[140px] opacity-20 select-none">{slide.img}</div>

          <div className="hidden xl:flex flex-col gap-2.5 absolute right-12 top-1/2 -translate-y-1/2">
            {[
              { icon: "🛡️", t: "Escrow protected", s: "Funds held until delivery" },
              { icon: "✅", t: "Verified sellers", s: "NIN + BVN confirmed" },
              { icon: "🚚", t: "Tracked delivery", s: "GIG, Fez, DHL Nigeria" },
            ].map((c) => (
              <div
                key={c.t}
                className="bg-white/85 backdrop-blur-sm border border-white/90 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] w-[230px]"
              >
                <span className="text-xl">{c.icon}</span>
                <div>
                  <div className="text-xs font-bold text-[#1A1A1A]">{c.t}</div>
                  <div className="text-[11px] text-[#6B7280]">{c.s}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-4 left-8 lg:left-12 flex gap-1.5">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="h-2 rounded-full border-none cursor-pointer transition-all duration-300 p-0"
              style={{
                width: i === active ? 28 : 8,
                background: i === active ? slide.accent : "rgba(0,0,0,0.2)",
              }}
            />
          ))}
        </div>

        <button
          onClick={goPrev}
          aria-label="Previous slide"
          className="absolute top-1/2 -translate-y-1/2 left-3 w-9 h-9 rounded-full bg-white/80 border border-black/10 text-base cursor-pointer hidden lg:flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:bg-white transition-colors"
        >
          ←
        </button>
        <button
          onClick={goNext}
          aria-label="Next slide"
          className="absolute top-1/2 -translate-y-1/2 right-3 w-9 h-9 rounded-full bg-white/80 border border-black/10 text-base cursor-pointer hidden lg:flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:bg-white transition-colors"
        >
          →
        </button>
      </div>
    </section>
  );
}

function StatsBar() {
  return (
    <section className="bg-[#F97316] py-4 mt-6">
      <div className="max-w-[1280px] mx-auto px-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-xl font-extrabold text-white">{s.val}</div>
            <div className="text-xs text-white/85">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CategoryGrid() {
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((res) => setCategories(res.data || []))
      .catch(() => setCategories([]));
  }, []);

  return (
    <section className="max-w-[1280px] mx-auto px-4 pt-9">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-extrabold text-[#1A1A1A] tracking-tight">Shop by category</h2>
        <Link href="/search" className="sdp-btn-outline px-3.5 py-1.5 text-[13px] no-underline inline-block">
          See all categories
        </Link>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-10 gap-2">
        {categories.map((cat: any) => (
          <Link key={cat.id} href={`/search?category=${cat.slug}`} className="no-underline">
            <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl py-3.5 px-1.5 text-center cursor-pointer transition-all hover:border-[#F97316] hover:bg-[#FFF7ED] group">
              <div className="text-[28px] mb-1.5 transition-transform group-hover:scale-110">{cat.icon}</div>
              <div className="text-[11px] font-semibold text-[#374151] leading-tight group-hover:text-[#F97316]">{cat.name}</div>
              <div className="text-[10px] text-[#9CA3AF] mt-0.5">{cat.listingCount?.toLocaleString()}+</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ListingSkeleton() {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/4" />
      </div>
    </div>
  );
}

function ListingsSection() {
  const [tab, setTab] = useState<"all" | "fixed" | "auction">("all");
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const url = tab === "all" ? "/api/listings" : `/api/listings?type=${tab}`;
    fetch(url)
      .then((r) => r.json())
      .then((res) => {
        if (!cancelled) setListings(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setListings([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <section className="max-w-[1280px] mx-auto px-4 pt-9">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2.5">
        <h2 className="text-xl font-extrabold text-[#1A1A1A] tracking-tight">Today's picks</h2>
        <div className="flex gap-1.5">
          {[
            { k: "all" as const, l: "All listings" },
            { k: "fixed" as const, l: "Buy now" },
            { k: "auction" as const, l: "⚡ Auctions" },
          ].map(({ k, l }) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold cursor-pointer border-[1.5px] transition-colors ${
                tab === k
                  ? "bg-[#F97316] text-white border-[#F97316]"
                  : "bg-transparent text-[#6B7280] border-[#E5E7EB] hover:border-[#F97316] hover:text-[#F97316]"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <ListingSkeleton key={i} />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12 text-[#6B7280] text-sm">No listings found.</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {listings.map((item) => (
            <ListingCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <div className="text-center mt-7">
        <Link href="/search" className="sdp-btn-outline px-9 py-3 text-sm no-underline inline-block">
          View all listings →
        </Link>
      </div>
    </section>
  );
}

function AuctionsBanner() {
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch("/api/listings?type=auction")
      .then((r) => r.json())
      .then((res) => {
        if (!cancelled) setAuctions(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setAuctions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5] border-y border-[#FED7AA] py-9 mt-9">
      <div className="max-w-[1280px] mx-auto px-4">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#F97316] text-white text-xs font-bold px-3 py-1 rounded-md tracking-wider">⚡ LIVE AUCTIONS</div>
            <h2 className="text-xl font-extrabold text-[#1A1A1A]">Ending soon — bid now</h2>
          </div>
          <Link href="/search?type=auction" className="sdp-btn-orange px-5 py-2 text-[13px] no-underline inline-block">
            All auctions →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <ListingSkeleton key={i} />
            ))}
          </div>
        ) : auctions.length === 0 ? (
          <div className="text-center py-8 text-[#6B7280] text-sm">No active auctions right now.</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {auctions.map((item) => (
              <ListingCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="max-w-[1280px] mx-auto px-4 pt-12">
      <div className="text-center mb-8">
        <div className="text-[11px] font-bold text-[#F97316] tracking-widest mb-2 uppercase">How it works</div>
        <h2 className="text-[26px] font-extrabold text-[#1A1A1A] tracking-tight">Your money is always protected</h2>
        <p className="text-sm text-[#6B7280] mt-2">Escrow on every single transaction — no exceptions, no cash on delivery.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {HOW_IT_WORKS.map((step) => (
          <div key={step.n} className="bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] rounded-[14px] p-5 relative">
            <div className="text-[11px] font-bold text-[#9CA3AF] mb-2.5">{step.n}</div>
            <div className="text-3xl mb-3">{step.icon}</div>
            <div className="text-sm font-bold text-[#1A1A1A] mb-1.5">{step.title}</div>
            <div className="text-[13px] text-[#6B7280] leading-relaxed">{step.body}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SellerCTA() {
  return (
    <section className="bg-[#F97316] py-[52px] px-4 mt-12">
      <div className="max-w-[720px] mx-auto text-center">
        <div className="text-[44px] mb-3.5">🏪</div>
        <h2 className="text-[28px] font-extrabold text-white tracking-tight mb-3.5">Start selling on Shopdroply</h2>
        <p className="text-[15px] text-white/88 leading-relaxed mb-7 max-w-[500px] mx-auto">
          Join 98,000+ verified sellers. List your first item in minutes. We handle payments, escrow, and nationwide logistics.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/auth?seller=1"
            className="px-8 py-3.5 rounded-[10px] text-[15px] font-bold bg-white text-[#F97316] no-underline inline-block hover:shadow-lg transition-shadow"
          >
            Get started — it's free
          </Link>
          <button className="px-8 py-3.5 rounded-[10px] text-[15px] font-bold bg-transparent text-white border-2 border-white/50 cursor-pointer hover:bg-white/10">
            View seller fees
          </button>
        </div>
        <div className="flex flex-wrap gap-5 justify-center mt-6">
          {["✅ No listing fees", "✅ Commission only on sales", "✅ Payout in 24 hours"].map((f) => (
            <span key={f} className="text-[13px] text-white/90 font-medium">
              {f}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="bg-white min-h-screen">
      <Navbar />
      <main>
        <HeroBanner />
        <StatsBar />
        <CategoryGrid />
        <ListingsSection />
        <AuctionsBanner />
        <HowItWorks />
        <SellerCTA />
      </main>
      <Footer />
    </div>
  );
}