"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setUser(json.data);
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    window.location.href = "/";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <nav className="bg-white border-b border-[#F3F4F6] sticky top-0 z-50">
        {/* Trust banner */}
        <div className="bg-[#F97316] py-[5px] text-center">
          <span className="text-xs text-white font-semibold">
            🛡️ Every purchase protected by Shopdroply Escrow
          </span>
        </div>

        <div className="max-w-[1280px] mx-auto px-4 flex items-center gap-3 h-[60px]">
          {/* Mobile hamburger */}
          <button className="lg:hidden text-xl" onClick={() => setMobileMenu(!mobileMenu)}>☰</button>

          {/* Logo */}
          <Link href="/" className="text-[19px] font-extrabold text-[#1A1A1A] tracking-tight whitespace-nowrap no-underline">
            shop<span className="text-[#F97316]">droply</span>
          </Link>

          {/* Search */}
          <div className="hidden lg:block flex-1 max-w-[420px] relative">
            <input
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search items..."
              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-[10px] px-4 py-2 pr-11 text-sm text-[#1A1A1A] placeholder-[#9CA3AF] outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base"><Link href={`/search?q=${encodeURIComponent(searchVal)}`}>
              <button className="btn-orange">🔍</button>
            </Link>{" "}</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4 ml-auto">
            {user ? (
              <>
                <Link href="/buyer/watchlist" className="hidden lg:block text-sm font-medium text-[#6B7280] no-underline hover:text-[#F97316]">Watchlist</Link>
                <Link href="/buyer/cart" className="hidden lg:block text-sm font-medium text-[#6B7280] no-underline hover:text-[#F97316]">Cart</Link>
                <Link href="/buyer/orders" className="hidden lg:block text-sm font-medium text-[#6B7280] no-underline hover:text-[#F97316]">Orders</Link>
                <div className="relative">
                  <button onClick={() => setMenuOpen(!menuOpen)} className="w-9 h-9 rounded-full bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] cursor-pointer font-bold text-[#1A1A1A] text-sm">
                    {getInitials(user.name)}
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-11 bg-white border border-[#F3F4F6] rounded-[10px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] p-2 min-w-[180px] z-[60]">
                      <div className="px-3 py-2 mb-1">
                        <div className="text-sm font-bold text-[#111827]">{user.name}</div>
                        <div className="text-[11px] text-[#6B7280] truncate">{user.email}</div>
                      </div>
                      <div className="h-px bg-[#F3F4F6] my-1" />
                      <Link href="/buyer/dashboard" className="block px-3 py-2.5 rounded-md text-[#1A1A1A] no-underline text-[13px] font-medium hover:bg-[#F9FAFB]">Dashboard</Link>
                      <Link href="/buyer/settings" className="block px-3 py-2.5 rounded-md text-[#1A1A1A] no-underline text-[13px] font-medium hover:bg-[#F9FAFB]">Settings</Link>
                      <div className="h-px bg-[#F3F4F6] my-1" />
                      <button onClick={handleLogout} className="block w-full text-left px-3 py-2.5 rounded-md text-[#DC2626] bg-transparent border-none cursor-pointer text-[13px] font-medium hover:bg-[#FEF2F2]">Sign Out</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/auth" className="hidden lg:block text-sm font-medium text-[#6B7280] no-underline hover:text-[#F97316]">Log in</Link>
                <Link href="/auth?tab=signup" className="bg-[#F97316] text-white text-sm font-semibold px-4 py-2 rounded-[10px] no-underline hover:bg-[#EA580C] transition-colors">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Category strip */}
        <div className="border-t border-[#E5E7EB] bg-white">
          <div className="max-w-[1280px] mx-auto px-4 flex gap-0.5 overflow-x-auto">
            {["All categories","Phones","Fashion","Electronics","Vehicles","Home","Beauty","Books","Sports","Gaming","⚡ Auctions"].map((cat, i) => (
              <button key={cat} className={`py-2 px-3.5 bg-transparent border-none text-[13px] whitespace-nowrap cursor-pointer transition-all border-b-2 ${i===0?"text-[#F97316] border-b-[#F97316] font-bold":"text-[#374151] border-b-transparent font-medium hover:text-[#F97316]"}`}>{cat}</button>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenu && (
        <div className="fixed inset-0 z-[300] bg-black/50" onClick={() => setMobileMenu(false)}>
          <div className="bg-white w-[280px] h-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-extrabold">shop<span className="text-[#F97316]">droply</span></span>
              <button onClick={() => setMobileMenu(false)} className="bg-transparent border-none text-[22px] cursor-pointer">✕</button>
            </div>

            {user ? (
              <>
                <div className="mb-3 px-1">
                  <div className="text-sm font-bold text-[#111827]">{user.name}</div>
                  <div className="text-[11px] text-[#6B7280]">{user.email}</div>
                </div>
                {["Dashboard","Cart","Orders","Watchlist","Settings"].map((l) => (
                  <Link key={l} href={`/buyer/${l.toLowerCase()}`} className="block py-3 text-[#1A1A1A] no-underline text-sm font-semibold border-b border-[#F3F4F6]">{l}</Link>
                ))}
                <button onClick={handleLogout} className="block w-full text-left py-3 text-[#DC2626] bg-transparent border-none text-sm font-semibold">Sign Out</button>
              </>
            ) : (
              <>
                <Link href="/auth" className="block py-3 text-[#1A1A1A] no-underline text-sm font-semibold border-b border-[#F3F4F6]">Log in</Link>
                <Link href="/auth?tab=signup" className="block py-3 text-[#F97316] no-underline text-sm font-semibold border-b border-[#F3F4F6]">Sign up</Link>
                <Link href="/seller/onboarding" className="block py-3 text-[#1A1A1A] no-underline text-sm font-semibold">Start selling</Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}