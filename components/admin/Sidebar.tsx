"use client";

import Link from "next/link";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role?: string;
}

interface AdminSidebarProps {
  activeTab: string;
  admin: AdminUser | null;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

const MENU_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "📊", href: "/admin/dashboard" },
  { id: "users", label: "Users", icon: "👥", href: "/admin/users" },
  { id: "kyc", label: "Seller KYC", icon: "🪪", href: "/admin/kyc" },
  { id: "listings", label: "Listings", icon: "📦", href: "/admin/listings" },
  { id: "orders", label: "Orders", icon: "🛒", href: "/admin/orders" },
  { id: "escrow", label: "Escrow", icon: "🛡️", href: "/admin/escrow" },
  { id: "disputes", label: "Disputes", icon: "⚠️", href: "/admin/disputes" },
  { id: "payouts", label: "Payouts", icon: "💰", href: "/admin/payouts" },
  { id: "fees", label: "Fees & Commission", icon: "📋", href: "/admin/fees" },
  { id: "shipping", label: "Shipping", icon: "🚚", href: "/admin/shipping" },
  { id: "categories", label: "Categories", icon: "🏷️", href: "/admin/categories" },
  { id: "reviews", label: "Reviews", icon: "⭐", href: "/admin/reviews" },
  { id: "cms", label: "CMS & Banners", icon: "🎨", href: "/admin/cms" },
  { id: "reports", label: "Reports", icon: "📈", href: "/admin/reports" },
  { id: "roles", label: "Roles", icon: "🔐", href: "/admin/roles" },
];

export default function AdminSidebar({ activeTab, admin, mobileOpen, setMobileOpen }: AdminSidebarProps) {
  const nameParts = admin?.name?.split(" ") || ["A", "D"];
  const initials = `${nameParts[0]?.[0] || ""}${nameParts[1]?.[0] || ""}`.toUpperCase();

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[90] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-[100] bg-[#1A1A1A] w-[260px] transition-transform duration-300 lg:translate-x-0 overflow-y-auto ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[#333333]">
          <Link href="/admin/dashboard" className="text-xl font-extrabold text-white no-underline">
            shop<span className="text-[#F97316]">droply</span>
          </Link>
          <div className="text-[11px] text-[#9CA3AF] font-semibold mt-0.5">Admin Control Center</div>
        </div>

        {/* Admin mini profile */}
        <div className="px-5 py-4 border-b border-[#333333]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#F97316] text-white flex items-center justify-center text-xs font-extrabold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-white truncate">{admin?.name || "Admin"}</div>
              <div className="text-[11px] text-[#9CA3AF] font-semibold">
                {admin?.role === "admin" ? "Full access" : admin?.role || "Admin"}
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="py-2 pb-6">
          {MENU_ITEMS.map((item) => {
            const active = activeTab === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-5 py-2.5 text-[13px] font-semibold transition-all no-underline border-r-[3px] ${
                  active
                    ? "bg-[rgba(249,115,22,0.15)] text-[#F97316] border-[#F97316]"
                    : "text-[#9CA3AF] border-transparent hover:bg-[#262626] hover:text-white"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}