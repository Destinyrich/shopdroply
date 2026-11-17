"use client";

import SearchSidebar from "./SearchSidebar";
import { SearchFilters } from "@/types/search";

interface Props {
  open: boolean;
  onClose: () => void;
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
}

export default function MobileFilterDrawer({ open, onClose, filters, onChange }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[500]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 w-[min(320px,90vw)] bg-white overflow-y-auto animate-[slideRight_0.28s_ease]">
        <div className="sticky top-0 bg-white z-10 px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <span className="text-[15px] font-bold text-gray-900">Filters</span>
          <button
            onClick={onClose}
            className="bg-transparent border-none text-xl cursor-pointer text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <SearchSidebar filters={filters} onChange={onChange} className="border-none rounded-none sticky:static" />
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-lg bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-colors cursor-pointer"
          >
            Show results
          </button>
        </div>
      </div>
    </div>
  );
}