export interface ProductSeller {
  name: string;
  avatar: string;
  badge: string;
  level: string;
  rating: number;
  reviews: number;
  sales: string;
  responseTime: string;
  location: string;
  memberSince: string;
}

export interface Review {
  name: string;
  rating: number;
  date: string;
  body: string;
  verified?: boolean;
}

export interface Spec {
  key: string;
  value: string;
}

export interface ShippingOption {
  courier: string;
  time: string;
  price: number;
  label: string;
}

export interface BidRecord {
  user: string;
  amount: number;
  time: string;
  leading: boolean;
}

export interface BaseProduct {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  location: string;
  images: string[];
  specs: Spec[];
  shipping: ShippingOption[];
  reviews: Review[];
  seller: ProductSeller;
  views?: number;
}

export interface FixedProduct extends BaseProduct {
  type: "fixed";
  price: number;
  originalPrice?: number;
  stockCount: number;
  sold: number;
}

export interface AuctionProduct extends BaseProduct {
  type: "auction";
  currentBid: number;
  totalBids: number;
  endTime: string;
  startPrice: number;
  reserveMet: boolean;
  buyNowPrice?: number;
  watchers: number;
  bidHistory: BidRecord[];
}

export type Product = FixedProduct | AuctionProduct;

export interface RelatedProduct {
  id: string | number;
  title: string;
  price: number;
  image: string;
  type: "fixed" | "auction";
  bids?: number;
  rating: number;
}