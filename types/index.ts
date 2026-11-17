import { Listing } from "@/lib/db-interface";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  role: 'buyer' | 'seller' | 'admin';
  isVerified: boolean;
  createdAt: string;
  // Seller fields
  sellerTier?: 'individual' | 'verified' | 'business';
  nin?: string;
  bvn?: string;
  dob?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  sellerStatus?: 'pending' | 'approved' | 'rejected';
  sellerOnboardingAt?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ─── Seller Dashboard Types ───
export interface SellerStats {
  totalSales: number;
  revenue30Days: number;
  activeListings: number;
  pendingOrders: number;
}

export interface SellerOrder {
  createdAt: string | number | Date;
  id: string;
  sellerId: string;
  buyerName: string;
  item: string;
  price: number;
  status: 'pending' | 'shipped' | 'delivered' | 'dispute' | 'cancelled';
  date: string;
  image: string;
}

export interface SellerActivity {
  id: string;
  sellerId: string;
  action: string;
  detail: string;
  time: string;
  icon: string;
  color: string;
  createdAt: string;
}

export interface EarningsDay {
  day: string;
  value: number;
}

export interface DashboardData {
  stats: SellerStats;
  orders: SellerOrder[];
  listings: Listing[];
  activities: SellerActivity[];
  earnings: EarningsDay[];
}