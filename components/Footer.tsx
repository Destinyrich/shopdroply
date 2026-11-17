export default function Footer() {
  return (
    <footer className="bg-[#111827] pt-12 pb-7 px-4">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-9">
          <div>
            <div className="text-xl font-extrabold text-white mb-3">shop<span className="text-[#F97316]">droply</span></div>
            <p className="text-[13px] text-[#9CA3AF] leading-relaxed max-w-[240px] mb-4">Nigeria's trusted escrow marketplace. Buy and sell safely across all 36 states.</p>
            <div className="flex gap-1.5">
              {["𝕏","ig","in"].map((s) => (
                <div key={s} className="w-8 h-8 rounded-lg bg-[#1F2937] flex items-center justify-center text-[#9CA3AF] text-xs cursor-pointer font-bold hover:bg-[#374151]">{s}</div>
              ))}
            </div>
          </div>
          {[
            { title: "Buyers", links: ["How it works","Browse listings","Track order","Buyer protection","Open a dispute"] },
            { title: "Sellers", links: ["Start selling","Seller fees","Logistics guide","Payouts","Seller support"] },
            { title: "Company", links: ["About us","Blog","Careers","Press","Contact us"] },
          ].map((col) => (
            <div key={col.title}>
              <div className="text-[11px] font-bold text-white mb-3.5 tracking-wider uppercase">{col.title}</div>
              {col.links.map((l) => <div key={l} className="text-[13px] text-[#9CA3AF] py-[5px] cursor-pointer hover:text-[#F97316] transition-colors">{l}</div>)}
            </div>
          ))}
        </div>
        <div className="border-t border-[#1F2937] pt-5 flex flex-wrap justify-between items-center gap-2.5">
          <span className="text-xs text-[#6B7280]">© 2025 Shopdroply Ltd. RC: 1234567. Lagos, Nigeria.</span>
          <div className="flex gap-4 flex-wrap">
            {["Privacy Policy","Terms of Service","NDPR Compliance"].map((l) => (
              <span key={l} className="text-xs text-[#6B7280] cursor-pointer hover:text-[#F97316]">{l}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}