"use client";

import Link from "next/link";

interface SellerProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  sellerTier?: string;
  sellerStatus?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
}

interface SidebarProps {
  activeTab: string;
  seller: SellerProfile | null;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

export default function SellerSidebar({ activeTab, seller, mobileOpen, setMobileOpen }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊", href: "/seller/dashboard" },
    { id: "listings", label: "My Listings", icon: "📦", href: "/seller/listings" },
    { id: "orders", label: "Orders", icon: "🛒", href: "/seller/orders" },
    { id: "offers", label: "Offers & Bids", icon: "💬", href: "/seller/offers" },
    { id: "earnings", label: "Earnings", icon: "💰", href: "/seller/earnings" },
    { id: "analytics", label: "Analytics", icon: "📈", href: "/seller/analytics" },
    { id: "settings", label: "Settings", icon: "⚙️", href: "/seller/settings" },
  ];

  const nameParts = seller?.name?.split(" ") || ["S", "E"];
  const initials = `${nameParts[0]?.[0] || ""}${nameParts[1]?.[0] || ""}`.toUpperCase();

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[90] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-[100] bg-white border-r border-[#E5E7EB] w-[260px] transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[#E5E7EB]">
          <Link href="/" className="text-xl font-extrabold text-[#111827] no-underline">
            shop<span className="text-[#F97316]">droply</span>
          </Link>
          <div className="text-[11px] text-[#6B7280] font-semibold mt-0.5">Seller Center</div>
        </div>

        {/* Profile mini */}
        <div className="px-5 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F97316] text-white flex items-center justify-center text-sm font-extrabold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-[#111827] truncate">
                {seller?.name}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[#16A34A] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                {seller?.sellerStatus === "approved" ? "Verified seller" : seller?.sellerStatus || "Seller"}
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="py-2">
          {menuItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-5 py-2.5 text-[13px] font-semibold transition-all no-underline ${
                  active
                    ? "bg-[#FFF7ED] text-[#F97316] border-r-[3px] border-[#F97316]"
                    : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#374151]"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.id === "orders" && (
                  <span className="bg-[#DC2626] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">7</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Balance card */}
        <div className="absolute bottom-0 left-0 right-0 p-5 border-t border-[#E5E7EB]">
          <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-[12px] p-4">
            <div className="text-[11px] text-[#6B7280] font-semibold mb-1">Available balance</div>
            <div className="text-lg font-extrabold text-[#F97316] mb-3">₦0</div>
            <button className="w-full bg-[#F97316] text-white rounded-lg py-2 text-xs font-bold hover:bg-[#EA6C0A] transition-all cursor-pointer">
              💳 Withdraw
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}