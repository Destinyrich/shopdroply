import { SearchListing } from "@/types/search";

export const LISTINGS: SearchListing[] = [
  { id: 1, title: "iPhone 15 Pro Max 256GB Natural Titanium", price: 890000, originalPrice: 950000, type: "fixed", image: "📱", category: "Phones", location: "Lagos", seller: "TechHub Lagos", rating: 4.9, reviews: 312, badge: "Verified", shipping: "₦2,500", condition: "New" },
  { id: 2, title: "Vintage Ankara Dress Set — Premium Aso-oke", price: 45000, type: "auction", image: "👗", category: "Fashion", location: "Abuja", seller: "Aso-Fashion NG", rating: 4.7, reviews: 89, badge: "Top rated", shipping: "₦1,200", condition: "New", bids: 18, endTime: "02:14:33" },
  { id: 3, title: 'LG 55" OLED Smart TV 4K HDR WebOS 2024', price: 680000, originalPrice: 720000, type: "fixed", image: "📺", category: "Electronics", location: "Lagos", seller: "ElectroMart", rating: 4.8, reviews: 201, badge: "Verified", shipping: "₦5,000", condition: "New" },
  { id: 4, title: "Toyota Camry 2019 LE Full Option Low Miles", price: 14500000, type: "auction", image: "🚗", category: "Vehicles", location: "Lagos", seller: "AutoNaija", rating: 4.6, reviews: 45, badge: "CAC verified", shipping: "Pickup", condition: "Foreign used", bids: 7, endTime: "11:42:08" },
  { id: 5, title: "PlayStation 5 Console Disc Edition + 2 Pads", price: 450000, originalPrice: 480000, type: "fixed", image: "🎮", category: "Gaming", location: "Port Harcourt", seller: "GameZone NG", rating: 4.9, reviews: 567, badge: "Top rated", shipping: "₦3,000", condition: "New" },
  { id: 6, title: "Custom Agbada Wedding Set Fully Embroidered", price: 120000, type: "auction", image: "👔", category: "Fashion", location: "Kano", seller: "RoyalStitch", rating: 4.8, reviews: 134, badge: "Verified", shipping: "₦2,000", condition: "New", bids: 4, endTime: "23:05:12" },
  { id: 7, title: "MacBook Air M2 16GB 512GB Space Grey", price: 1250000, originalPrice: 1350000, type: "fixed", image: "💻", category: "Electronics", location: "Lagos", seller: "AppleWorld NG", rating: 4.9, reviews: 88, badge: "Verified", shipping: "₦2,500", condition: "New" },
  { id: 8, title: "Royal Canin Dog Food 15kg Adult Medium Breed", price: 38000, type: "fixed", image: "🐕", category: "Pets", location: "Lagos", seller: "PetLovers NG", rating: 4.7, reviews: 230, badge: "Top rated", shipping: "₦1,500", condition: "New" },
  { id: 9, title: "Samsung Galaxy S24 Ultra 512GB Titanium Black", price: 780000, originalPrice: 820000, type: "fixed", image: "📱", category: "Phones", location: "Abuja", seller: "SamsungHub", rating: 4.8, reviews: 145, badge: "Verified", shipping: "₦2,000", condition: "New" },
  { id: 10, title: "Nike Air Jordan 1 Retro High OG Size 43", price: 85000, type: "auction", image: "👟", category: "Fashion", location: "Lagos", seller: "SneakerHouseNG", rating: 4.6, reviews: 67, badge: "Verified", shipping: "₦1,500", condition: "New", bids: 12, endTime: "05:30:22" },
  { id: 11, title: "Dyson V15 Detect Cordless Vacuum Cleaner", price: 420000, originalPrice: 460000, type: "fixed", image: "🧹", category: "Home", location: "Lagos", seller: "HomeGoodsNG", rating: 4.7, reviews: 38, badge: "Verified", shipping: "₦3,500", condition: "New" },
  { id: 12, title: "Fender Player Stratocaster Electric Guitar", price: 380000, type: "auction", image: "🎸", category: "Music", location: "Lagos", seller: "MusicStoreNG", rating: 4.5, reviews: 21, badge: "Verified", shipping: "₦4,000", condition: "Used", bids: 3, endTime: "18:44:00" },
];

export const CATEGORIES = ["All", "Phones", "Fashion", "Electronics", "Vehicles", "Gaming", "Home", "Pets", "Music"];
export const LOCATIONS = ["All Nigeria", "Lagos", "Abuja", "Port Harcourt", "Kano", "Ibadan", "Enugu", "Kaduna"];
export const CONDITIONS = ["New", "Foreign used", "Nigerian used", "Refurbished"];

export const SORT_OPTIONS = [
  { value: "relevance", label: "Most relevant" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest first" },
  { value: "rating", label: "Highest rated" },
  { value: "bids", label: "Most bids" },
] as const;

export function getCategoryCounts(): Record<string, number> {
  const counts: Record<string, number> = { All: LISTINGS.length };
  LISTINGS.forEach((item) => {
    counts[item.category] = (counts[item.category] || 0) + 1;
  });
  return counts;
}

export function formatPrice(n: number): string {
  if (n >= 1000000) return `₦${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `₦${(n / 1000).toFixed(0)}K`;
  return `₦${n}`;
}