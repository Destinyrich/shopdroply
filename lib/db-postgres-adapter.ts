// lib/db-local-adapter.ts
// Your current MockDB, refactored to implement the DatabaseAdapter interface.
// This runs entirely in memory (and optionally persists to JSON if you want).

import { DatabaseAdapter, User, Listing, Order, Category, SessionRecord } from "./db-interface";
import { generateId } from "./utils";

class LocalDB implements DatabaseAdapter {
  private users: Map<string, User> = new Map();
  private listings: Map<string, Listing> = new Map();
  private orders: Map<string, Order> = new Map();
  private otps: Map<string, { code: string; expiresAt: Date; attempts: number }> = new Map();
  private sessions: Map<string, SessionRecord> = new Map();

  private categories: Category[] = [
    { id: "cat-1", name: "Phones & Tablets", icon: "📱", slug: "phones-tablets", listingCount: 12400, commissionRate: 0.08 },
    { id: "cat-2", name: "Fashion", icon: "👗", slug: "fashion", listingCount: 34200, commissionRate: 0.10 },
    { id: "cat-3", name: "Home & Living", icon: "🏠", slug: "home-living", listingCount: 8900, commissionRate: 0.10 },
    { id: "cat-4", name: "Electronics", icon: "💻", slug: "electronics", listingCount: 6300, commissionRate: 0.08 },
    { id: "cat-5", name: "Vehicles & Parts", icon: "🚗", slug: "vehicles", listingCount: 2100, commissionRate: 0.04 },
    { id: "cat-6", name: "Beauty & Health", icon: "💄", slug: "beauty-health", listingCount: 15800, commissionRate: 0.12 },
    { id: "cat-7", name: "Books & Media", icon: "📚", slug: "books", listingCount: 4700, commissionRate: 0.10 },
    { id: "cat-8", name: "Sports & Fitness", icon: "⚽", slug: "sports", listingCount: 3200, commissionRate: 0.10 },
    { id: "cat-9", name: "Gaming", icon: "🎮", slug: "gaming", listingCount: 5100, commissionRate: 0.08 },
    { id: "cat-10", name: "Kitchen & Food", icon: "🍳", slug: "kitchen", listingCount: 7600, commissionRate: 0.10 },
  ];

  constructor() {
    this.seedListings();
  }

  // ─── Auth & Users ───

  async createUser(userData: Omit<User, "id" | "createdAt" | "isVerified">): Promise<User> {
    const user: User = {
      ...userData,
      id: generateId("USR"),
      createdAt: new Date().toISOString(),
      isVerified: false,
    };
    this.users.set(user.id, user);
    return user;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const found = Array.from(this.users.values()).find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    return found || null;
  }

  async createOTP(phone: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.otps.set(phone.replace(/\D/g, ""), {
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
    });
    return code;
  }

  async verifyOTP(phone: string, code: string): Promise<boolean> {
    const clean = phone.replace(/\D/g, "");
    const r = this.otps.get(clean);
    if (!r || new Date() > r.expiresAt || r.attempts >= 3 || r.code !== code) {
      return false;
    }
    this.otps.delete(clean);
    return true;
  }

  async createSession(userId: string): Promise<string> {
    const token = generateId("TKN");
    this.sessions.set(token, {
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    return token;
  }

  async getSession(token: string): Promise<SessionRecord | null> {
    const session = this.sessions.get(token);
    if (!session || new Date() > session.expiresAt) {
      if (session) this.sessions.delete(token);
      return null;
    }
    return session;
  }

  async deleteSession(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  // ─── Listings ───

  async getListings(filters?: { type?: string; category?: string }): Promise<Listing[]> {
    let r = Array.from(this.listings.values());
    if (filters?.type) r = r.filter((l) => l.type === filters.type);
    if (filters?.category) r = r.filter((l) => l.category === filters.category);
    return r;
  }

  async getListingById(id: string): Promise<Listing | null> {
    return this.listings.get(id) || null;
  }

  async createListing(listingData: Omit<Listing, "id" | "createdAt">): Promise<Listing> {
    const listing: Listing = {
      ...listingData,
      id: generateId("LST"),
      createdAt: new Date().toISOString(),
    };
    this.listings.set(listing.id, listing);
    return listing;
  }

  // ─── Orders ───

  async createOrder(orderData: Omit<Order, "id" | "createdAt" | "updatedAt">): Promise<Order> {
    const order: Order = {
      ...orderData,
      id: generateId("ORD"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.orders.set(order.id, order);
    return order;
  }

  async getOrderById(id: string): Promise<Order | null> {
    return this.orders.get(id) || null;
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter((o) => o.buyerId === userId);
  }

  // ─── Categories ───

  async getCategories(): Promise<Category[]> {
    return this.categories;
  }

  // ─── Seed Data ───

  private seedListings() {
    const sample: Omit<Listing, "id" | "createdAt">[] = [
      { title: "iPhone 15 Pro Max 256GB Natural Titanium", description: "Brand new sealed", price: 890000, type: "fixed", category: "Phones & Tablets", condition: "new", images: [], sellerId: "user-1", sellerName: "TechHub Lagos", sellerRating: 4.9, sellerReviews: 312, sellerBadge: "Verified", location: "Lagos", shippingFee: 2500, shippingMethod: "GIG Logistics", status: "active" },
      { title: "Vintage Ankara Dress Set", description: "Handmade traditional", price: 45000, type: "auction", category: "Fashion", condition: "new", images: [], sellerId: "user-2", sellerName: "Aso-Fashion NG", sellerRating: 4.7, sellerReviews: 89, sellerBadge: "Top rated", location: "Abuja", shippingFee: 1200, shippingMethod: "Fez Delivery", status: "active", endTime: new Date(Date.now() + 7200000).toISOString(), bids: 18, currentBid: 42000, reservePrice: 40000 },
      { title: 'LG 55" OLED Smart TV 4K HDR', description: "Premium OLED", price: 680000, type: "fixed", category: "Electronics", condition: "new", images: [], sellerId: "user-3", sellerName: "ElectroMart", sellerRating: 4.8, sellerReviews: 201, sellerBadge: "Verified", location: "Lagos", shippingFee: 5000, shippingMethod: "GIG Logistics", status: "active" },
      { title: "Toyota Camry 2019 LE Full Option", description: "Clean title", price: 14500000, type: "auction", category: "Vehicles & Parts", condition: "used", images: [], sellerId: "user-4", sellerName: "AutoNaija", sellerRating: 4.6, sellerReviews: 45, sellerBadge: "CAC verified", location: "Lagos", shippingFee: 0, shippingMethod: "Pickup", status: "active", endTime: new Date(Date.now() + 86400000).toISOString(), bids: 7, currentBid: 14200000, reservePrice: 14000000 },
      { title: "PlayStation 5 Console Disc Edition + 2 Pads", description: "Brand new PS5", price: 450000, type: "fixed", category: "Gaming", condition: "new", images: [], sellerId: "user-5", sellerName: "GameZone NG", sellerRating: 4.9, sellerReviews: 567, sellerBadge: "Top rated", location: "Port Harcourt", shippingFee: 3000, shippingMethod: "Fez Delivery", status: "active" },
      { title: "Designer Agbada Wedding Set", description: "Luxury agbada", price: 120000, type: "auction", category: "Fashion", condition: "new", images: [], sellerId: "user-6", sellerName: "RoyalStitch", sellerRating: 4.8, sellerReviews: 134, sellerBadge: "Verified", location: "Kano", shippingFee: 2000, shippingMethod: "GIG Logistics", status: "active", endTime: new Date(Date.now() + 36000000).toISOString(), bids: 4, currentBid: 95000, reservePrice: 100000 },
      { title: "MacBook Air M2 16GB 512GB", description: "Latest M2", price: 1250000, type: "fixed", category: "Electronics", condition: "new", images: [], sellerId: "user-7", sellerName: "AppleWorld NG", sellerRating: 4.9, sellerReviews: 88, sellerBadge: "Verified", location: "Lagos", shippingFee: 2500, shippingMethod: "GIG Logistics", status: "active" },
      { title: "Royal Canin Dog Food 15kg", description: "Premium nutrition", price: 38000, type: "fixed", category: "Home & Living", condition: "new", images: [], sellerId: "user-8", sellerName: "PetLovers NG", sellerRating: 4.7, sellerReviews: 230, sellerBadge: "Top rated", location: "Lagos", shippingFee: 1500, shippingMethod: "Kwik Delivery", status: "active" },
    ];
    sample.forEach((l, i) => {
      this.listings.set(`listing-${i + 1}`, { ...l, id: `listing-${i + 1}`, createdAt: new Date().toISOString() });
    });
  }
}

// Singleton instance — same as your current export
export const localAdapter = new LocalDB();