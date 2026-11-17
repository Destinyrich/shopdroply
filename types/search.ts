export interface SearchListing {
  id: string | number;
  title: string;
  price: number;
  originalPrice?: number;
  type: "fixed" | "auction";
  image: string;
  category: string;
  location: string;
  seller: string;
  rating: number;
  reviews: number;
  badge: "Verified" | "Top rated" | "CAC verified";
  shipping: string;
  condition: string;
  bids?: number;
  endTime?: string;
}

export interface SearchFilters {
  category: string;
  type: "all" | "fixed" | "auction";
  locations: string[];
  conditions: string[];
  rating: number;
  freeShipping: boolean;
  priceMin: number;
  priceMax: number;
}

export type SortOption = "relevance" | "price_asc" | "price_desc" | "newest" | "rating" | "bids";
export type ViewMode = "grid" | "list";