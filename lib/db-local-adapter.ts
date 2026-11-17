// lib/db-local-adapter.ts
// Full seller dashboard support + existing buyer data

import {
  DatabaseAdapter,
  User,
  Listing,
  Order,
  OrderItem,
  Bid,
  WatchlistItem,
  Notification,
  EscrowRecord,
  Category,
  SessionRecord,
  BuyerStats,
  CartItem,
  SellerStats,
  SellerEarning,
  SellerActivity,
  PayoutRecord,
  Offer,
  ReturnRequest,
  AdminDashboardStats,
  AdminKycItem,
  Dispute,
  PlatformSettings,
  ShippingSettings,
  Review,
  Banner,
  PaymentRecord,
} from "./db-interface";
import type { AdminRole } from "./db-interface";
import { DEFAULT_ADMIN_ROLES, normalizeAdminRoles } from "./admin-roles";
import { generateId } from "./utils";
import { DEFAULT_SHIPPING_SETTINGS, normalizeShippingSettings } from "./shipping-db";

class LocalDB implements DatabaseAdapter {
  private users: Map<string, User> = new Map();
  private listings: Map<string, Listing> = new Map();
  private orders: Map<string, Order> = new Map();
  private bids: Map<string, Bid> = new Map();
  private watchlist: Map<string, WatchlistItem> = new Map();
  private notifications: Map<string, Notification> = new Map();
  private escrows: Map<string, EscrowRecord> = new Map();
  private payments: Map<string, PaymentRecord> = new Map();
  private otps: Map<
    string,
    { code: string; expiresAt: Date; attempts: number }
  > = new Map();
  private sessions: Map<string, SessionRecord> = new Map();
  private carts: Map<string, CartItem[]> = new Map();
  private earnings: Map<string, SellerEarning> = new Map();
  private activities: Map<string, SellerActivity> = new Map();
  private payouts: Map<string, PayoutRecord> = new Map();
  private offers: Map<string, Offer> = new Map();
  private disputes: Map<string, Dispute> = new Map();
  private reviews: Map<string, Review> = new Map();
  private banners: Map<string, Banner> = new Map();
  private adminRoles: AdminRole[] = normalizeAdminRoles(DEFAULT_ADMIN_ROLES);
  private shippingSettings: ShippingSettings = normalizeShippingSettings(
    DEFAULT_SHIPPING_SETTINGS,
  );
  private platformSettings: PlatformSettings = {
    paymentProcessingFee: 1.5,
    minimumPayout: 1000,
    payoutSchedule: "Tuesday & Friday (bi-weekly)",
  };

  public categories: Category[] = [
    {
      id: "cat-1",
      name: "Phones & Tablets",
      icon: "📱",
      slug: "phones-tablets",
      listingCount: 12400,
      commissionRate: 0.08,
    },
    {
      id: "cat-2",
      name: "Fashion",
      icon: "👗",
      slug: "fashion",
      listingCount: 34200,
      commissionRate: 0.1,
    },
    {
      id: "cat-3",
      name: "Home & Living",
      icon: "🏠",
      slug: "home-living",
      listingCount: 8900,
      commissionRate: 0.1,
    },
    {
      id: "cat-4",
      name: "Electronics",
      icon: "💻",
      slug: "electronics",
      listingCount: 6300,
      commissionRate: 0.08,
    },
    {
      id: "cat-5",
      name: "Vehicles & Parts",
      icon: "🚗",
      slug: "vehicles",
      listingCount: 2100,
      commissionRate: 0.04,
    },
    {
      id: "cat-6",
      name: "Beauty & Health",
      icon: "💄",
      slug: "beauty-health",
      listingCount: 15800,
      commissionRate: 0.12,
    },
    {
      id: "cat-7",
      name: "Books & Media",
      icon: "📚",
      slug: "books",
      listingCount: 4700,
      commissionRate: 0.1,
    },
    {
      id: "cat-8",
      name: "Sports & Fitness",
      icon: "⚽",
      slug: "sports",
      listingCount: 3200,
      commissionRate: 0.1,
    },
    {
      id: "cat-9",
      name: "Gaming",
      icon: "🎮",
      slug: "gaming",
      listingCount: 5100,
      commissionRate: 0.08,
    },
    {
      id: "cat-10",
      name: "Kitchen & Food",
      icon: "🍳",
      slug: "kitchen",
      listingCount: 7600,
      commissionRate: 0.1,
    },
  ];
  escrowRecords: EscrowRecord[] = [];

  constructor() {
    // Backfill admin-editable category fields (active/featured/attributes/parent)
    // for the categories seeded above, so the admin categories screen has
    // sane defaults instead of undefined.
    const feeDefaults: Record<string, { cap: number; min: number }> = {
      "cat-1": { cap: 80000, min: 500 },
      "cat-2": { cap: 50000, min: 500 },
      "cat-3": { cap: 40000, min: 500 },
      "cat-4": { cap: 100000, min: 500 },
      "cat-5": { cap: 150000, min: 2000 },
      "cat-6": { cap: 30000, min: 500 },
      "cat-7": { cap: 20000, min: 300 },
      "cat-8": { cap: 40000, min: 500 },
      "cat-9": { cap: 50000, min: 500 },
      "cat-10": { cap: 40000, min: 500 },
    };
    this.categories = this.categories.map((c) => ({
      active: true,
      featured: false,
      attributes: [] as string[],
      parent: null,
      feeCap: feeDefaults[c.id]?.cap ?? 50000,
      feeMin: feeDefaults[c.id]?.min ?? 500,
      ...c,
    }));

    this.seedListings();
    this.seedDemoUser();
    this.seedDemoSellerData();
    this.seedAdminUser();
    this.seedOffersAndBids();
    this.seedDisputes();
    this.seedAdminPayouts();
  }
  getSellerReturns(sellerId: string): Promise<ReturnRequest[]> {
    throw new Error("Method not implemented.");
  }
  createReturn(
    data: Omit<ReturnRequest, "id" | "createdAt" | "updatedAt">,
  ): Promise<ReturnRequest> {
    throw new Error("Method not implemented.");
  }
  updateReturnStatus(
    id: string,
    status: ReturnRequest["status"],
    resolution?: string,
  ): Promise<ReturnRequest | null> {
    throw new Error("Method not implemented.");
  }
  // ─── Admin ───
  // (updateUserStatus doubles as the KYC approve/reject action)

async getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const now = Date.now();
  const dayMs = 86400000;
  const cutoff30 = now - 30 * dayMs;
  const cutoff7 = now - 7 * dayMs;

  // Daily series helpers
  const lastNDays = (n: number) =>
    Array.from({ length: n }, (_, i) => {
      const d = new Date(now - (n - 1 - i) * dayMs);
      return { key: d.toDateString(), label: d.toLocaleDateString("en-NG", { day: "numeric", month: "short" }), value: 0 };
    });

  const revenueDaily = lastNDays(30);
  const commissionDaily = lastNDays(30);
  const newUsersDaily = lastNDays(7).map((d) => ({ label: d.label, value: 0 }));

  // GMV + commission from completed orders (30 days)
  const orders = this.orders; // adjust to your store
  let gmv30d = 0;
  for (const o of orders.values()) {
    const t = new Date(o.createdAt).getTime();
    if (t >= cutoff30 && o.status !== "Cancelled" && o.status !== "Pending payment") {
      gmv30d += o.total;
      const slot = revenueDaily.find((d) => d.key === new Date(t).toDateString());
      if (slot) slot.value += o.total;
    }
  }

  // Commission from earnings (30 days)
  let commissionRevenue = 0;
  for (const [, e] of this.earnings) { // adjust to your store
    const t = new Date(e.createdAt).getTime();
    commissionRevenue += e.commission || 0;
    if (t >= cutoff30) {
      const slot = commissionDaily.find((d) => d.key === new Date(t).toDateString());
      if (slot) slot.value += e.commission || 0;
    }
  }

  // New signups (7 days)
  for (const u of this.users.values()) { // adjust to your store
    const t = new Date(u.createdAt).getTime();
    if (t >= cutoff7) {
      const slot = newUsersDaily.find((d) => {
        const dKey = new Date(now - (6 - newUsersDaily.indexOf(d)) * dayMs).toDateString();
        return dKey === new Date(t).toDateString();
      });
      if (slot) slot.value += 1;
    }
  }

  // Orders by status
  const statusMap: Record<string, number> = {};
  for (const [, o] of orders) statusMap[o.status] = (statusMap[o.status] || 0) + 1;

  // Escrow held
  // const escrowHeld = this.escrowRecords // adjust to your store
  //   .filter((r) => r.status === "pending")
  //   .reduce((s, r) => s + r.amount, 0);
  const escrowHeld = Array.from(this.escrows.values()) // adjust to your store
    .filter((r) => r.status === "pending")
    .reduce((s, r) => s + r.amount, 0);

  // Pending KYC
  const pendingKycUsers: AdminKycItem[] = Array.from(this.users.values())
    .filter((u) => u.sellerStatus === "pending")
    .map((u) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      tier: u.sellerTier || "individual",
      nin: u.nin,
      bvn: u.bvn,
      submittedAt: u.sellerOnboardingAt,
      status: u.sellerStatus!,
    }));

  const sellers = Array.from(this.users.values()).filter(
    (u) => u.role === "seller" || u.sellerStatus,
  );

  return {
    totalUsers: this.users.size,
    totalSellers: sellers.length,
    pendingKyc: pendingKycUsers.length,
    totalListings: this.listings.size,
    activeListings: Array.from(this.listings.values()).filter(
      (l) => l.status === "active",
    ).length,
    totalOrders: orders.size,
    pendingOrders: Array.from(orders.values()).filter((o) => o.status === "pending" || o.status === "Processing").length,
    disputedOrders: Array.from(orders.values()).filter((o) => o.status === "dispute").length,
    gmv30d,
    escrowHeld,
    commissionRevenue,
    revenueDaily: revenueDaily.map(({ label, value }) => ({ label, value })),
    commissionDaily: commissionDaily.map(({ label, value }) => ({ label, value })),
    ordersByStatus: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
    newUsersDaily,
    recentOrders: Array.from(orders.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5),
    pendingKycUsers,
  };
}


async getAllUsers(): Promise<User[]> {
  return Array.from(this.users.values());
}

async updateUserStatus(id: string, status: User["sellerStatus"]): Promise<User | null> {
  const user = this.users.get(id);
  if (!user) return null;
  user.sellerStatus = status;
  this.users.set(id, user);
  return user;
}

async updateUserAccountStatus(id: string, status: "active" | "suspended"): Promise<User | null> {
  const user = this.users.get(id);
  if (!user) return null;
  user.accountStatus = status;
  this.users.set(id, user);
  return user;
}
async updateUserKyc(id: string, status: "approved" | "rejected", reason?: string): Promise<User | null> {
  const user = this.users.get(id);
  if (!user) return null;
  user.sellerStatus = status;
  if (status === "rejected") {
    Object.assign(user, { kycRejectionReason: reason });
  } else {
    Reflect.deleteProperty(user, "kycRejectionReason");
  }
  return user;
}


  // NEW: OFFERS + SELLER BIDS
  async getSellerOffers(sellerId: string): Promise<Offer[]> {
    return Array.from(this.offers.values())
      .filter((o) => o.sellerId === sellerId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  async updateOffer(id: string, data: Partial<Offer>): Promise<Offer | null> {
    const o = this.offers.get(id);
    if (!o) return null;
    Object.assign(o, data);
    this.offers.set(id, o);
    return o;
  }

  async getBidsForSeller(sellerId: string): Promise<Bid[]> {
    const listingIds = new Set(
      Array.from(this.listings.values())
        .filter((l) => l.sellerId === sellerId)
        .map((l) => l.id),
    );
    return Array.from(this.bids.values())
      .filter((b) => listingIds.has(b.listingId))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  // SELLER METHODS
  async updateUserAsSeller(
    userId: string,
    sellerData: Partial<User>,
  ): Promise<User | null> {
    const user = this.users.get(userId);
    if (!user) return null;
    const updated = { ...user, ...sellerData };
    this.users.set(userId, updated);
    return updated;
  }

  async getSellerProfile(userId: string): Promise<Partial<User> | null> {
    const user = this.users.get(userId);
    if (!user || !user.sellerTier) return null;
    const { password, ...profile } = user;
    return profile;
  }

  async getSellerListings(sellerId: string): Promise<Listing[]> {
    return Array.from(this.listings.values())
      .filter((l) => l.sellerId === sellerId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  async getSellerOrders(sellerId: string): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter((o) => o.status !== "Pending payment") // sellers never see unpaid orders
      .filter((o) => o.items.some((item) => item.sellerId === sellerId))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  async getSellerStats(sellerId: string): Promise<SellerStats> {
    const sellerListings = await this.getSellerListings(sellerId);
    const sellerOrders = await this.getSellerOrders(sellerId);
    const sellerEarnings = await this.getSellerEarnings(sellerId);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const revenue30d = sellerEarnings
      .filter((e) => new Date(e.createdAt) > thirtyDaysAgo)
      .reduce((sum, e) => sum + e.netAmount, 0);

    const totalRevenue = sellerEarnings.reduce(
      (sum, e) => sum + e.netAmount,
      0,
    );
    const completedOrders = sellerOrders.filter(
      (o) => o.status === "Delivered" || o.status === "Confirm receipt",
    );

    return {
      totalSales: completedOrders.length,
      totalOrders: sellerOrders.length,
      revenue30d,
      activeListings: sellerListings.filter((l) => l.status === "active")
        .length,
      pendingOrders: sellerOrders.filter(
        (o) => o.status === "pending" || o.status === "Processing",
      ).length,
      totalRevenue,
      totalViews: sellerListings.reduce((sum, l) => sum + (l.views || 0), 0),
      totalWatchers: sellerListings.reduce(
        (sum, l) => sum + (l.watchers || 0),
        0,
      ),
    };
  }

  async getSellerEarnings(sellerId: string): Promise<SellerEarning[]> {
    return Array.from(this.earnings.values())
      .filter((e) => e.sellerId === sellerId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  async createEarning(
    earning: Omit<SellerEarning, "id" | "createdAt">,
  ): Promise<SellerEarning> {
    const e: SellerEarning = {
      ...earning,
      id: generateId("ERN"),
      createdAt: new Date().toISOString(),
    };
    this.earnings.set(e.id, e);
    return e;
  }

  async updateEarningStatus(
    id: string,
    status: SellerEarning["status"],
  ): Promise<SellerEarning | null> {
    const e = this.earnings.get(id);
    if (!e) return null;
    e.status = status;
    this.earnings.set(id, e);
    return e;
  }

  async getSellerActivities(
    sellerId: string,
    limit = 20,
  ): Promise<SellerActivity[]> {
    return Array.from(this.activities.values())
      .filter((a) => a.sellerId === sellerId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, limit);
  }

  async createActivity(
    activity: Omit<SellerActivity, "id" | "createdAt">,
  ): Promise<SellerActivity> {
    const a: SellerActivity = {
      ...activity,
      id: generateId("ACT"),
      createdAt: new Date().toISOString(),
    };
    this.activities.set(a.id, a);
    return a;
  }

  async createPayout(
    payout: Omit<PayoutRecord, "id" | "createdAt">,
  ): Promise<PayoutRecord> {
    const p: PayoutRecord = {
      ...payout,
      id: generateId("PAY"),
      createdAt: new Date().toISOString(),
    };
    this.payouts.set(p.id, p);
    return p;
  }

  async getPayoutsBySeller(sellerId: string): Promise<PayoutRecord[]> {
    return Array.from(this.payouts.values())
      .filter((p) => p.sellerId === sellerId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  // ─── Admin: Payouts ───
  async getAllPayouts(): Promise<PayoutRecord[]> {
    return Array.from(this.payouts.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async updatePayoutStatus(
    id: string,
    status: PayoutRecord["status"],
    extra?: Partial<PayoutRecord>,
  ): Promise<PayoutRecord | null> {
    const p = this.payouts.get(id);
    if (!p) return null;
    p.status = status;
    if (status === "completed" || status === "failed") {
      p.processedAt = new Date().toISOString();
    }
    Object.assign(p, extra);
    this.payouts.set(id, p);
    return p;
  }

  // ─── Admin: Platform Settings ───
  async getPlatformSettings(): Promise<PlatformSettings> {
    return this.platformSettings;
  }

  async updatePlatformSettings(
    data: Partial<PlatformSettings>,
  ): Promise<PlatformSettings> {
    this.platformSettings = { ...this.platformSettings, ...data };
    return this.platformSettings;
  }

  // EXISTING METHODS
  async getCartByUser(userId: string): Promise<CartItem[]> {
    return this.carts.get(userId) || [];
  }

  async addToCart(item: Omit<CartItem, "id" | "addedAt">): Promise<CartItem> {
    const userCart = this.carts.get(item.userId) || [];
    const existing = userCart.find((c) => c.listingId === item.listingId);
    if (existing) {
      existing.qty += item.qty;
      this.carts.set(item.userId, userCart);
      return existing;
    }
    const cartItem: CartItem = {
      ...item,
      id: generateId("CRT"),
      addedAt: new Date().toISOString(),
    };
    userCart.push(cartItem);
    this.carts.set(item.userId, userCart);
    return cartItem;
  }

  async updateCartItem(
    userId: string,
    listingId: string,
    data: Partial<Pick<CartItem, "qty" | "courierId" | "shipping">>,
  ): Promise<CartItem | null> {
    const userCart = this.carts.get(userId) || [];
    const item = userCart.find((c) => c.listingId === listingId);
    if (!item) return null;
    Object.assign(item, data);
    this.carts.set(userId, userCart);
    return item;
  }

  async removeFromCart(userId: string, listingId: string): Promise<boolean> {
    const userCart = this.carts.get(userId) || [];
    const idx = userCart.findIndex((c) => c.listingId === listingId);
    if (idx === -1) return false;
    userCart.splice(idx, 1);
    this.carts.set(userId, userCart);
    return true;
  }

  async clearCart(userId: string): Promise<boolean> {
    this.carts.delete(userId);
    return true;
  }

  async createUser(
    userData: Omit<User, "id" | "createdAt" | "isVerified">,
  ): Promise<User> {
    const user: User = {
      ...userData,
      id: generateId("USR"),
      createdAt: new Date().toISOString(),
      isVerified: false,
      role: (userData as { role?: "buyer" | "seller" }).role || "buyer",
    };
    this.users.set(user.id, user);
    return user;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return (
      Array.from(this.users.values()).find(
        (u) => u.email.toLowerCase() === email.toLowerCase(),
      ) || null
    );
  }

  async findUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async createOTP(phone: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    this.otps.set(cleanPhone, { code, expiresAt, attempts: 0 });
    return code;
  }

  async verifyOTP(phone: string, code: string): Promise<boolean> {
    const clean = phone.replace(/[^0-9]/g, "");
    const r = this.otps.get(clean);
    if (!r || new Date() > r.expiresAt || r.attempts >= 3 || r.code !== code) {
      if (r) r.attempts++;
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

  async getListings(filters?: {
    type?: string;
    category?: string;
  }): Promise<Listing[]> {
    let r = Array.from(this.listings.values());
    if (filters?.type) r = r.filter((l) => l.type === filters.type);
    if (filters?.category) r = r.filter((l) => l.category === filters.category);
    return r;
  }

  async getListingById(id: string): Promise<Listing | null> {
    return this.listings.get(id) || null;
  }

  async createListing(
    listingData: Omit<Listing, "id" | "createdAt">,
  ): Promise<Listing> {
    const listing: Listing = {
      ...listingData,
      id: generateId("LST"),
      createdAt: new Date().toISOString(),
    };
    this.listings.set(listing.id, listing);
    return listing;
  }

  async updateListing(
    id: string,
    data: Partial<Listing>,
  ): Promise<Listing | null> {
    const listing = this.listings.get(id);
    if (!listing) return null;
    Object.assign(listing, data);
    this.listings.set(id, listing);
    return listing;
  }

  async deleteListing(id: string): Promise<boolean> {
    return this.listings.delete(id);
  }

  async createOrder(
    orderData: Omit<Order, "id" | "createdAt" | "updatedAt">,
  ): Promise<Order> {
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
    return Array.from(this.orders.values())
      .filter((o) => o.buyerId === userId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  async updateOrderStatus(
    id: string,
    status: Order["status"],
    extra?: Partial<Order>,
  ): Promise<Order | null> {
    const order = this.orders.get(id);
    if (!order) return null;
    order.status = status;
    if (extra) Object.assign(order, extra);
    order.updatedAt = new Date().toISOString();
    this.orders.set(id, order);
    return order;
  }

  async createBid(bidData: Omit<Bid, "id" | "createdAt">): Promise<Bid> {
    const bid: Bid = {
      ...bidData,
      id: generateId("BID"),
      createdAt: new Date().toISOString(),
    };
    this.bids.set(bid.id, bid);
    return bid;
  }

  async getBidsByUser(userId: string): Promise<Bid[]> {
    return Array.from(this.bids.values()).filter((b) => b.userId === userId);
  }

  async getBidById(id: string): Promise<Bid | null> {
    return this.bids.get(id) || null;
  }

  async updateBid(id: string, data: Partial<Bid>): Promise<Bid | null> {
    const bid = this.bids.get(id);
    if (!bid) return null;
    Object.assign(bid, data);
    this.bids.set(id, bid);
    return bid;
  }

  async addToWatchlist(
    item: Omit<WatchlistItem, "id" | "addedAt">,
  ): Promise<WatchlistItem> {
    const existing = Array.from(this.watchlist.values()).find(
      (w) => w.userId === item.userId && w.listingId === item.listingId,
    );
    if (existing) return existing;
    const w: WatchlistItem = {
      ...item,
      id: generateId("WAT"),
      addedAt: new Date().toISOString(),
    };
    this.watchlist.set(w.id, w);
    return w;
  }

  async getWatchlistByUser(userId: string): Promise<WatchlistItem[]> {
    return Array.from(this.watchlist.values()).filter(
      (w) => w.userId === userId,
    );
  }

  async removeFromWatchlist(
    userId: string,
    listingId: string,
  ): Promise<boolean> {
    const item = Array.from(this.watchlist.values()).find(
      (w) => w.userId === userId && w.listingId === listingId,
    );
    if (!item) return false;
    this.watchlist.delete(item.id);
    return true;
  }

  async createNotification(
    notif: Omit<Notification, "id" | "createdAt">,
  ): Promise<Notification> {
    const n: Notification = {
      ...notif,
      id: generateId("NTF"),
      createdAt: new Date().toISOString(),
    };
    this.notifications.set(n.id, n);
    return n;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter((n) => n.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  async markNotificationRead(
    userId: string,
    notifId: string,
  ): Promise<boolean> {
    const n = this.notifications.get(notifId);
    if (!n || n.userId !== userId) return false;
    n.unread = false;
    this.notifications.set(notifId, n);
    return true;
  }

  async markAllNotificationsRead(userId: string): Promise<boolean> {
    Array.from(this.notifications.values())
      .filter((n) => n.userId === userId)
      .forEach((n) => {
        n.unread = false;
        this.notifications.set(n.id, n);
      });
    return true;
  }

  async createEscrow(
    escrow: Omit<EscrowRecord, "id" | "createdAt">,
  ): Promise<EscrowRecord> {
    const e: EscrowRecord = {
      ...escrow,
      id: generateId("ESC"),
      createdAt: new Date().toISOString(),
    };
    this.escrows.set(e.id, e);
    return e;
  }

  async getEscrowByUser(userId: string): Promise<EscrowRecord[]> {
    return Array.from(this.escrows.values()).filter(
      (e) => e.buyerId === userId,
    );
  }

  async updateEscrowStatus(
    id: string,
    status: EscrowRecord["status"],
  ): Promise<EscrowRecord | null> {
    const e = this.escrows.get(id);
    if (!e) return null;
    e.status = status;
    this.escrows.set(id, e);
    return e;
  }

  // ─── Payments (Step 2) ───
  async createPayment(
    data: Omit<PaymentRecord, "id" | "createdAt" | "updatedAt">,
  ): Promise<PaymentRecord> {
    const now = new Date().toISOString();
    const p: PaymentRecord = { ...data, id: generateId("PAY"), createdAt: now, updatedAt: now };
    this.payments.set(p.id, p);
    return p;
  }

  async getPaymentByReference(reference: string): Promise<PaymentRecord | null> {
    return Array.from(this.payments.values()).find((p) => p.reference === reference) || null;
  }

  async getLatestPaymentByCheckout(checkoutId: string): Promise<PaymentRecord | null> {
    const list = Array.from(this.payments.values())
      .filter((p) => p.checkoutId === checkoutId)
      .sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime());
    return list[0] || null;
  }

  async updatePayment(id: string, data: Partial<PaymentRecord>): Promise<PaymentRecord | null> {
    const p = this.payments.get(id);
    if (!p) return null;
    Object.assign(p, data, { id: p.id, updatedAt: new Date().toISOString() });
    this.payments.set(id, p);
    return p;
  }

  async getOrdersByCheckout(checkoutId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter((o) => o.checkoutId === checkoutId);
  }

  async getEscrowByOrder(orderId: string): Promise<EscrowRecord | null> {
    return Array.from(this.escrows.values()).find((e) => e.orderId === orderId) || null;
  }

  async updateEscrow(id: string, data: Partial<EscrowRecord>): Promise<EscrowRecord | null> {
    const e = this.escrows.get(id);
    if (!e) return null;
    Object.assign(e, data, { id: e.id });
    this.escrows.set(id, e);
    return e;
  }

  async getBuyerStats(userId: string): Promise<BuyerStats> {
    const orders = await this.getOrdersByUser(userId);
    const bids = await this.getBidsByUser(userId);
    const watchlist = await this.getWatchlistByUser(userId);
    const escrows = await this.getEscrowByUser(userId);
    return {
      totalOrders: orders.length,
      activeOrders: orders.filter(
        (o) => o.status === "Processing" || o.status === "In transit",
      ).length,
      activeBids: bids.length,
      leadingBids: bids.filter((b) => b.leading).length,
      watchlistCount: watchlist.length,
      priceDrops: watchlist.filter((w) => w.origPrice && w.origPrice > w.price)
        .length,
      escrowTotal: escrows
        .filter((e) => e.status === "pending")
        .reduce((s, e) => s + e.amount, 0),
      escrowPending: escrows.filter((e) => e.status === "pending").length,
    };
  }

  async getCategories(): Promise<Category[]> {
    return this.categories;
  }

  // ─── Admin: Categories ───
  async createCategory(data: Omit<Category, "id" | "listingCount">): Promise<Category> {
    const category: Category = {
      active: true,
      featured: false,
      attributes: [],
      parent: null,
      feeCap: 50000,
      feeMin: 500,
      ...data,
      id: generateId("cat"),
      listingCount: 0,
    };
    this.categories.push(category);
    return category;
  }

  async updateCategory(id: string, data: Partial<Category>): Promise<Category | null> {
    const idx = this.categories.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.categories[idx] = { ...this.categories[idx], ...data, id };
    return this.categories[idx];
  }

  async deleteCategory(id: string): Promise<boolean> {
    const idx = this.categories.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    this.categories.splice(idx, 1);
    return true;
  }

  // ─── Admin: Disputes ───
  async getDisputes(): Promise<Dispute[]> {
    return Array.from(this.disputes.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async getDisputeById(id: string): Promise<Dispute | null> {
    return this.disputes.get(id) || null;
  }

  async resolveDispute(id: string, resolution: string, adminNotes?: string): Promise<Dispute | null> {
    const d = this.disputes.get(id);
    if (!d) return null;
    d.status = "resolved";
    d.resolution = resolution;
    if (adminNotes) d.adminNotes = adminNotes;
    d.updatedAt = new Date().toISOString();
    this.disputes.set(id, d);
    return d;
  }

  async escalateDispute(id: string, adminNotes?: string): Promise<Dispute | null> {
    const d = this.disputes.get(id);
    if (!d) return null;
    d.status = "escalated";
    d.priority = "high";
    if (adminNotes) d.adminNotes = adminNotes;
    d.updatedAt = new Date().toISOString();
    this.disputes.set(id, d);
    return d;
  }

  async createDispute(
    data: Omit<Dispute, "id" | "createdAt" | "updatedAt">,
  ): Promise<Dispute> {
    const now = new Date().toISOString();
    const d: Dispute = { ...data, id: generateId("DSP"), createdAt: now, updatedAt: now };
    this.disputes.set(d.id, d);
    return d;
  }

  async getDisputeByOrder(orderId: string): Promise<Dispute | null> {
    const list = Array.from(this.disputes.values())
      .filter((d) => d.orderId === orderId)
      .sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime());
    return list[0] || null;
  }

  async getAllOrders(): Promise<Order[]> {
  return Array.from(this.orders.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
async getAllEscrow(): Promise<EscrowRecord[]> {
  return Array.from(this.escrows.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

async getEscrowById(id: string): Promise<EscrowRecord | null> {
  return this.escrows.get(id) || null;
}

async getShippingSettings(): Promise<ShippingSettings> {
  // normalize() returns a fresh copy and fills any missing fields
  return normalizeShippingSettings(this.shippingSettings);
}

async updateShippingSettings(
  data: Partial<ShippingSettings>,
): Promise<ShippingSettings> {
  this.shippingSettings = normalizeShippingSettings({
    ...this.shippingSettings,
    ...data,
  });
  return normalizeShippingSettings(this.shippingSettings);
}

async getAdminRoles(): Promise<AdminRole[]> {
  return normalizeAdminRoles(this.adminRoles);
}

async saveAdminRoles(roles: AdminRole[]): Promise<AdminRole[]> {
  this.adminRoles = normalizeAdminRoles(roles);
  return normalizeAdminRoles(this.adminRoles);
}

async updateUser(id: string, data: Partial<User>): Promise<User | null> {
  const user = this.users.get(id);
  if (!user) return null;
  const updated: User = { ...user, ...data, id: user.id }; // never change the id
  this.users.set(id, updated);
  return updated;
}


async getAllReviews(): Promise<Review[]> {
  return Array.from(this.reviews.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

async updateReviewStatus(
  id: string,
  status: Review["status"],
  adminNotes?: string,
): Promise<Review | null> {
  const r = this.reviews.get(id);
  if (!r) return null;
  r.status = status;
  if (adminNotes !== undefined) r.adminNotes = adminNotes;
  this.reviews.set(id, r);
  return r;
}

async getAllBanners(): Promise<Banner[]> {
  return Array.from(this.banners.values()).sort(
    (a, b) => a.priority - b.priority || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

async createBanner(data: Omit<Banner, "id" | "createdAt">): Promise<Banner> {
  const banner: Banner = {
    ...data,
    id: generateId("BNR"),
    createdAt: new Date().toISOString(),
  };
  this.banners.set(banner.id, banner);
  return banner;
}

async updateBanner(id: string, data: Partial<Banner>): Promise<Banner | null> {
  const b = this.banners.get(id);
  if (!b) return null;
  Object.assign(b, data);
  this.banners.set(id, b);
  return b;
}

async deleteBanner(id: string): Promise<boolean> {
  return this.banners.delete(id);
}



  // SEED DATA
  private seedListings() {
    const sample: Omit<Listing, "id" | "createdAt">[] = [
      {
        title: "iPhone 15 Pro Max 256GB Natural Titanium",
        description: "Brand new sealed",
        price: 890000,
        type: "fixed",
        category: "Phones & Tablets",
        condition: "new",
        images: [],
        sellerId: "user-1",
        sellerName: "TechHub Lagos",
        sellerRating: 4.9,
        sellerReviews: 312,
        sellerBadge: "Verified",
        location: "Lagos",
        shippingFee: 2500,
        shippingMethod: "GIG Logistics",
        status: "active",
        views: 567,
        watchers: 34,
      },
      {
        title: "Vintage Ankara Dress Set",
        description: "Handmade traditional",
        price: 45000,
        type: "auction",
        category: "Fashion",
        condition: "new",
        images: [],
        sellerId: "user-2",
        sellerName: "Aso-Fashion NG",
        sellerRating: 4.7,
        sellerReviews: 89,
        sellerBadge: "Top rated",
        location: "Abuja",
        shippingFee: 1200,
        shippingMethod: "Fez Delivery",
        status: "active",
        endTime: new Date(Date.now() + 7200000).toISOString(),
        bids: 18,
        currentBid: 42000,
        reservePrice: 40000,
        views: 234,
        watchers: 12,
      },
      {
        title: "LG 55 OLED Smart TV 4K HDR",
        description: "Premium OLED",
        price: 680000,
        type: "fixed",
        category: "Electronics",
        condition: "new",
        images: [],
        sellerId: "user-3",
        sellerName: "ElectroMart",
        sellerRating: 4.8,
        sellerReviews: 201,
        sellerBadge: "Verified",
        location: "Lagos",
        shippingFee: 5000,
        shippingMethod: "GIG Logistics",
        status: "active",
        views: 445,
        watchers: 21,
      },
      {
        title: "Toyota Camry 2019 LE Full Option",
        description: "Clean title",
        price: 14500000,
        type: "auction",
        category: "Vehicles & Parts",
        condition: "used",
        images: [],
        sellerId: "user-4",
        sellerName: "AutoNaija",
        sellerRating: 4.6,
        sellerReviews: 45,
        sellerBadge: "CAC verified",
        location: "Lagos",
        shippingFee: 0,
        shippingMethod: "Pickup",
        status: "active",
        endTime: new Date(Date.now() + 86400000).toISOString(),
        bids: 7,
        currentBid: 14200000,
        reservePrice: 14000000,
        views: 890,
        watchers: 45,
      },
      {
        title: "PlayStation 5 Console Disc Edition + 2 Pads",
        description: "Brand new PS5",
        price: 450000,
        type: "fixed",
        category: "Gaming",
        condition: "new",
        images: [],
        sellerId: "user-5",
        sellerName: "GameZone NG",
        sellerRating: 4.9,
        sellerReviews: 567,
        sellerBadge: "Top rated",
        location: "Port Harcourt",
        shippingFee: 3000,
        shippingMethod: "Fez Delivery",
        status: "active",
        views: 723,
        watchers: 56,
      },
      {
        title: "Designer Agbada Wedding Set",
        description: "Luxury agbada",
        price: 120000,
        type: "auction",
        category: "Fashion",
        condition: "new",
        images: [],
        sellerId: "user-6",
        sellerName: "RoyalStitch",
        sellerRating: 4.8,
        sellerReviews: 134,
        sellerBadge: "Verified",
        location: "Kano",
        shippingFee: 2000,
        shippingMethod: "GIG Logistics",
        status: "active",
        endTime: new Date(Date.now() + 36000000).toISOString(),
        bids: 4,
        currentBid: 95000,
        reservePrice: 100000,
        views: 189,
        watchers: 8,
      },
      {
        title: "MacBook Air M2 16GB 512GB",
        description: "Latest M2",
        price: 1250000,
        type: "fixed",
        category: "Electronics",
        condition: "new",
        images: [],
        sellerId: "user-7",
        sellerName: "AppleWorld NG",
        sellerRating: 4.9,
        sellerReviews: 88,
        sellerBadge: "Verified",
        location: "Lagos",
        shippingFee: 2500,
        shippingMethod: "GIG Logistics",
        status: "active",
        views: 334,
        watchers: 19,
      },
      {
        title: "Royal Canin Dog Food 15kg",
        description: "Premium nutrition",
        price: 38000,
        type: "fixed",
        category: "Home & Living",
        condition: "new",
        images: [],
        sellerId: "user-8",
        sellerName: "PetLovers NG",
        sellerRating: 4.7,
        sellerReviews: 230,
        sellerBadge: "Top rated",
        location: "Lagos",
        shippingFee: 1500,
        shippingMethod: "Kwik Delivery",
        status: "active",
        views: 156,
        watchers: 5,
      },
    ];
    sample.forEach((l, i) => {
      const id = String(i + 1);
      this.listings.set(id, { ...l, id, createdAt: new Date().toISOString() });
    });
  }

  private seedAdminUser() {
    const adminUser: User = {
      id: "admin-1",
      email: "admin@shopdroply.ng",
      password: "password123",
      name: "Super Admin",
      phone: "08000000000",
      createdAt: new Date().toISOString(),
      isVerified: true,
      role: "admin",
      accountStatus: "active",
    };
    this.users.set(adminUser.id, adminUser);
  }

  private seedDemoUserLegacy() {
    const demoUser: User = {
      id: "USR-demo-001",
      email: "emeka@gmail.com",
      password: "password123",
      name: "Emeka Okafor",
      phone: "+2348034567890",
      createdAt: new Date().toISOString(),
      isVerified: true,
      role: "buyer",
    };
    this.users.set(demoUser.id, demoUser);

    const orderItems: OrderItem[] = [
      {
        id: "oi-1",
        listingId: "1",
        title: "iPhone 15 Pro Max 256GB",
        image: "📱",
        price: 890000,
        qty: 1,
        seller: "TechHub Lagos",
        sellerId: "user-1",
        shipping: 2500,
        courier: "GIG Logistics",
        condition: "New",
      },
      {
        id: "oi-2",
        listingId: "2",
        title: "Nike Air Jordan 1 Retro",
        image: "👟",
        price: 85000,
        qty: 1,
        seller: "SneakerHouseNG",
        sellerId: "user-9",
        shipping: 1500,
        courier: "Fez Delivery",
        condition: "New",
      },
      {
        id: "oi-3",
        listingId: "3",
        title: "Dyson V15 Vacuum Cleaner",
        image: "🧹",
        price: 420000,
        qty: 1,
        seller: "HomeAppliances NG",
        sellerId: "user-10",
        shipping: 3000,
        courier: "DHL Nigeria",
        condition: "New",
      },
    ];

    const order1: Order = {
      id: "demo-order-1",
      buyerId: demoUser.id,
      items: orderItems,
      status: "Processing",
      total: 512000,
      subtotal: 500000,
      shipping: 12000,
      discount: 0,
      address: {
        street: "12 Allen Avenue",
        city: "Ikeja",
        state: "Lagos",
        zip: "100001",
        phone: "+2348034567890",
      },
      payMethod: "card",
      courier: "GIG Logistics",
      eta: "2-3 days",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    };
    this.orders.set(order1.id, order1);

    const bids: Omit<Bid, "id" | "createdAt">[] = [
      {
        userId: demoUser.id,
        listingId: "2",
        item: "Vintage Ankara Dress Set",
        image: "👗",
        myBid: 42000,
        currentBid: 42000,
        leading: true,
        endTime: "22:14:00",
        totalBids: 18,
      },
      {
        userId: demoUser.id,
        listingId: "4",
        item: "Toyota Camry 2019 LE",
        image: "🚗",
        myBid: 14100000,
        currentBid: 14200000,
        leading: false,
        endTime: "14:20:00",
        totalBids: 7,
      },
    ];
    bids.forEach((b) => {
      const bid: Bid = {
        ...b,
        id: generateId("BID"),
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      };
      this.bids.set(bid.id, bid);
    });

    const watchlist: Omit<WatchlistItem, "id" | "addedAt">[] = [
      {
        userId: demoUser.id,
        listingId: "3",
        item: "LG 55 OLED Smart TV",
        image: "📺",
        price: 680000,
        origPrice: 750000,
        type: "fixed",
      },
      {
        userId: demoUser.id,
        listingId: "5",
        item: "PlayStation 5 Console",
        image: "🎮",
        price: 450000,
        type: "fixed",
      },
    ];
    watchlist.forEach((w) => {
      const item: WatchlistItem = {
        ...w,
        id: generateId("WAT"),
        addedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      };
      this.watchlist.set(item.id, item);
    });

    const notifications: Omit<Notification, "id" | "createdAt">[] = [
      {
        userId: demoUser.id,
        icon: "💳",
        title: "Payment received",
        body: "Your order #demo-order-1 payment was successful",
        time: "2 days ago",
        unread: true,
      },
      {
        userId: demoUser.id,
        icon: "📦",
        title: "Order processing",
        body: "Order #demo-order-1 is being processed by sellers",
        time: "2 days ago",
        unread: true,
      },
      {
        userId: demoUser.id,
        icon: "🔨",
        title: "You are the highest bidder!",
        body: "Vintage Ankara Dress Set - ₦42,000",
        time: "3 hours ago",
        unread: true,
      },
    ];
    notifications.forEach((n) => {
      const notif: Notification = {
        ...n,
        id: generateId("NTF"),
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      };
      this.notifications.set(notif.id, notif);
    });

    const escrows: Omit<EscrowRecord, "id" | "createdAt">[] = [
      {
        orderId: "demo-order-1",
        buyerId: demoUser.id,
        sellerId: "user-1",
        amount: 512000,
        status: "pending",
      },
    ];
    escrows.forEach((e) => {
      const esc: EscrowRecord = {
        ...e,
        id: generateId("ESC"),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      };
      this.escrows.set(esc.id, esc);
    });
  }

  private seedDemoSellerData() {
    const demoSeller: User = {
      id: "USR-seller-001",
      email: "chioma@shopdroply.ng",
      password: "password123",
      name: "Chioma Adebayo",
      phone: "+2348029876543",
      createdAt: new Date().toISOString(),
      isVerified: true,
      role: "seller",
      sellerTier: "verified",
      bankName: "Kuda Bank",
      accountNumber: "2023454531",
      accountName: "Chioma Adebayo",
      sellerStatus: "approved",
    };
    this.users.set(demoSeller.id, demoSeller);

    const sellerListings: Omit<Listing, "createdAt">[] = [
      {
        id: "slst-1",
        title: "Vintage Ankara Dress",
        description: "Handmade traditional",
        price: 45000,
        type: "fixed",
        category: "Fashion",
        condition: "new",
        images: [],
        sellerId: demoSeller.id,
        sellerName: demoSeller.name,
        sellerRating: 4.7,
        sellerReviews: 89,
        sellerBadge: "Top rated",
        location: "Abuja",
        shippingFee: 1200,
        shippingMethod: "Fez Delivery",
        status: "active",
        views: 234,
        watchers: 12,
      },
      {
        id: "slst-2",
        title: "iPhone 15 Pro Max 256GB",
        description: "Brand new sealed",
        price: 890000,
        type: "fixed",
        category: "Phones & Tablets",
        condition: "new",
        images: [],
        sellerId: demoSeller.id,
        sellerName: demoSeller.name,
        sellerRating: 4.7,
        sellerReviews: 89,
        sellerBadge: "Top rated",
        location: "Lagos",
        shippingFee: 2500,
        shippingMethod: "GIG Logistics",
        status: "active",
        views: 567,
        watchers: 34,
      },
      {
        id: "slst-3",
        title: "Nike Air Force 1 Size 42",
        description: "Original sneakers",
        price: 72000,
        type: "fixed",
        category: "Sports & Fitness",
        condition: "new",
        images: [],
        sellerId: demoSeller.id,
        sellerName: demoSeller.name,
        sellerRating: 4.7,
        sellerReviews: 89,
        sellerBadge: "Top rated",
        location: "Lagos",
        shippingFee: 1500,
        shippingMethod: "Fez Delivery",
        status: "paused",
        views: 189,
        watchers: 8,
      },
      {
        id: "slst-4",
        title: "Samsung 32 Smart TV 4K",
        description: "UHD display",
        price: 145000,
        type: "fixed",
        category: "Electronics",
        condition: "used",
        images: [],
        sellerId: demoSeller.id,
        sellerName: demoSeller.name,
        sellerRating: 4.7,
        sellerReviews: 89,
        sellerBadge: "Top rated",
        location: "Abuja",
        shippingFee: 4000,
        shippingMethod: "GIG Logistics",
        status: "active",
        views: 445,
        watchers: 21,
      },
      {
        id: "slst-5",
        title: "Kitchen Blender Set 5-in-1",
        description: "Multi-purpose blender",
        price: 28000,
        type: "auction",
        category: "Kitchen & Food",
        condition: "new",
        images: [],
        sellerId: demoSeller.id,
        sellerName: demoSeller.name,
        sellerRating: 4.7,
        sellerReviews: 89,
        sellerBadge: "Top rated",
        location: "Lagos",
        shippingFee: 2000,
        shippingMethod: "Kwik Delivery",
        status: "active",
        endTime: new Date(Date.now() + 86400000).toISOString(),
        bids: 5,
        currentBid: 25000,
        views: 156,
        watchers: 7,
      },
      {
        id: "slst-6",
        title: "MacBook Pro 14 M3 Pro",
        description: "Latest model",
        price: 2450000,
        type: "fixed",
        category: "Electronics",
        condition: "new",
        images: [],
        sellerId: demoSeller.id,
        sellerName: demoSeller.name,
        sellerRating: 4.7,
        sellerReviews: 89,
        sellerBadge: "Top rated",
        location: "Lagos",
        shippingFee: 3000,
        shippingMethod: "DHL Nigeria",
        status: "sold",
        views: 789,
        watchers: 45,
      },
    ];
    sellerListings.forEach((l) => {
      this.listings.set(l.id, { ...l, createdAt: new Date().toISOString() });
    });

    const ordersData: Omit<Order, "updatedAt">[] = [
      {
        id: "ORD-7821",
        buyerId: "USR-buyer-1",
        buyerName: "Adeolu Martins",
        items: [
          {
            id: "oi-4",
            listingId: "slst-1",
            title: "Vintage Ankara Dress",
            image: "👗",
            price: 45000,
            qty: 1,
            seller: demoSeller.name,
            sellerId: demoSeller.id,
            shipping: 2000,
            courier: "GIG Logistics",
            condition: "New",
          },
        ],
        status: "pending",
        total: 47000,
        subtotal: 45000,
        shipping: 2000,
        discount: 0,
        address: {
          street: "12 Allen Avenue",
          city: "Ikeja",
          state: "Lagos",
          phone: "+2348031234567",
        },
        payMethod: "card",
        courier: "GIG Logistics",
        eta: "2-3 days",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "ORD-7820",
        buyerId: "USR-buyer-2",
        buyerName: "Fatima Kano",
        items: [
          {
            id: "oi-5",
            listingId: "slst-2",
            title: "iPhone 15 Pro Max Case",
            image: "📱",
            price: 8500,
            qty: 1,
            seller: demoSeller.name,
            sellerId: demoSeller.id,
            shipping: 1200,
            courier: "Fez Delivery",
            condition: "New",
          },
        ],
        status: "pending",
        total: 9700,
        subtotal: 8500,
        shipping: 1200,
        discount: 0,
        address: {
          street: "45 Gwarimpa Estate",
          city: "Abuja",
          state: "FCT",
          phone: "+2347055678567",
        },
        payMethod: "transfer",
        courier: "Fez Delivery",
        eta: "1-2 days",
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "ORD-7819",
        buyerId: "USR-buyer-3",
        buyerName: "Chinedu Obi",
        items: [
          {
            id: "oi-6",
            listingId: "slst-3",
            title: "Nike Air Force 1",
            image: "👟",
            price: 72000,
            qty: 1,
            seller: demoSeller.name,
            sellerId: demoSeller.id,
            shipping: 2500,
            courier: "GIG Logistics",
            condition: "New",
          },
        ],
        status: "shipped",
        total: 74500,
        subtotal: 72000,
        shipping: 2500,
        discount: 0,
        address: {
          street: "23 Port Harcourt Road",
          city: "Aba",
          state: "Abia",
          phone: "+2348129012901",
        },
        payMethod: "wallet",
        courier: "GIG Logistics",
        eta: "2-4 days",
        createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
        trackingNumber: "GIG-7748291",
      },
      {
        id: "ORD-7818",
        buyerId: "USR-buyer-4",
        buyerName: "Ngozi Eze",
        items: [
          {
            id: "oi-7",
            listingId: "slst-4",
            title: "Samsung 32 Smart TV",
            image: "📺",
            price: 145000,
            qty: 1,
            seller: demoSeller.name,
            sellerId: demoSeller.id,
            shipping: 4000,
            courier: "GIG Logistics",
            condition: "Used",
          },
        ],
        status: "dispute",
        total: 149000,
        subtotal: 145000,
        shipping: 4000,
        discount: 0,
        address: {
          street: "7 Lekki Phase 1",
          city: "Lagos",
          state: "Lagos",
          phone: "+2349013456345",
        },
        payMethod: "flutterwave",
        courier: "GIG Logistics",
        eta: "1-2 days",
        createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "ORD-7817",
        buyerId: "USR-buyer-5",
        buyerName: "Ibrahim Sule",
        items: [
          {
            id: "oi-8",
            listingId: "slst-5",
            title: "Kitchen Blender Set",
            image: "🍳",
            price: 28000,
            qty: 1,
            seller: demoSeller.name,
            sellerId: demoSeller.id,
            shipping: 2000,
            courier: "Kwik Delivery",
            condition: "New",
          },
        ],
        status: "pending",
        total: 30000,
        subtotal: 28000,
        shipping: 2000,
        discount: 0,
        address: {
          street: "15 Zaria Road",
          city: "Kaduna",
          state: "Kaduna",
          phone: "+2348067890789",
        },
        payMethod: "card",
        courier: "Kwik Delivery",
        eta: "Same day",
        createdAt: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "ORD-7816",
        buyerId: "USR-buyer-6",
        buyerName: "Tolani Bakare",
        items: [
          {
            id: "oi-9",
            listingId: "slst-3",
            title: "HP Laptop Charger",
            image: "💻",
            price: 15000,
            qty: 1,
            seller: demoSeller.name,
            sellerId: demoSeller.id,
            shipping: 1500,
            courier: "Fez Delivery",
            condition: "New",
          },
        ],
        status: "shipped",
        total: 16500,
        subtotal: 15000,
        shipping: 1500,
        discount: 0,
        address: {
          street: "33 Bodija Estate",
          city: "Ibadan",
          state: "Oyo",
          phone: "+2347032345234",
        },
        payMethod: "ussd",
        courier: "Fez Delivery",
        eta: "1-3 days",
        createdAt: new Date(Date.now() - 52 * 60 * 60 * 1000).toISOString(),
        trackingNumber: "FEZ-9921047",
      },
      {
        id: "ORD-7815",
        buyerId: "USR-buyer-7",
        buyerName: "Emeka Nwosu",
        items: [
          {
            id: "oi-10",
            listingId: "slst-6",
            title: "MacBook Pro 14 M3 Pro",
            image: "💻",
            price: 2450000,
            qty: 1,
            seller: demoSeller.name,
            sellerId: demoSeller.id,
            shipping: 5500,
            courier: "DHL Nigeria",
            condition: "New",
          },
        ],
        status: "Delivered",
        total: 2455500,
        subtotal: 2450000,
        shipping: 5500,
        discount: 0,
        address: {
          street: "88 Trans Amadi",
          city: "Port Harcourt",
          state: "Rivers",
          phone: "+2348156789678",
        },
        payMethod: "card",
        courier: "DHL Nigeria",
        eta: "1-2 days",
        createdAt: new Date(Date.now() - 75 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "ORD-7814",
        buyerId: "USR-buyer-8",
        buyerName: "Aisha Bello",
        items: [
          {
            id: "oi-11",
            listingId: "slst-1",
            title: "Designer Handbag",
            image: "👜",
            price: 35000,
            qty: 1,
            seller: demoSeller.name,
            sellerId: demoSeller.id,
            shipping: 2000,
            courier: "GIG Logistics",
            condition: "New",
          },
        ],
        status: "Cancelled",
        total: 37000,
        subtotal: 35000,
        shipping: 2000,
        discount: 0,
        address: {
          street: "19 Maitama",
          city: "Abuja",
          state: "FCT",
          phone: "+2349040123012",
        },
        payMethod: "transfer",
        courier: "GIG Logistics",
        eta: "2-3 days",
        createdAt: new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString(),
      },
    ];
    ordersData.forEach((o) => {
      this.orders.set(o.id, { ...o, updatedAt: o.createdAt });
    });

    const earningsData: Omit<SellerEarning, "id">[] = [
      {
        sellerId: demoSeller.id,
        orderId: "ORD-7821",
        amount: 45000,
        commission: 3600,
        netAmount: 41400,
        status: "available",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        description: "Sale - Vintage Ankara Dress",
      },
      {
        sellerId: demoSeller.id,
        orderId: "ORD-7820",
        amount: 8500,
        commission: 680,
        netAmount: 7820,
        status: "available",
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        description: "Sale - iPhone 15 Pro Max Case",
      },
      {
        sellerId: demoSeller.id,
        orderId: "ORD-7819",
        amount: 72000,
        commission: 5760,
        netAmount: 66240,
        status: "pending",
        createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
        description: "Sale - Nike Air Force 1",
      },
      {
        sellerId: demoSeller.id,
        orderId: "ORD-7818",
        amount: 145000,
        commission: 11600,
        netAmount: 133400,
        status: "pending",
        createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
        description: "Sale - Samsung 32 Smart TV",
      },
      {
        sellerId: demoSeller.id,
        orderId: "ORD-7817",
        amount: 28000,
        commission: 2240,
        netAmount: 25760,
        status: "available",
        createdAt: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(),
        description: "Sale - Kitchen Blender Set",
      },
      {
        sellerId: demoSeller.id,
        orderId: "ORD-7816",
        amount: 15000,
        commission: 1200,
        netAmount: 13800,
        status: "available",
        createdAt: new Date(Date.now() - 52 * 60 * 60 * 1000).toISOString(),
        description: "Sale - HP Laptop Charger",
      },
      {
        sellerId: demoSeller.id,
        orderId: "ORD-7815",
        amount: 2450000,
        commission: 196000,
        netAmount: 2254000,
        status: "withdrawn",
        createdAt: new Date(Date.now() - 75 * 60 * 60 * 1000).toISOString(),
        description: "Sale - MacBook Pro 14 M3 Pro",
      },
      {
        sellerId: demoSeller.id,
        orderId: "PAY-112",
        amount: 125000,
        commission: 0,
        netAmount: -125000,
        status: "withdrawn",
        createdAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
        description: "Payout to Kuda Bank",
      },
      {
        sellerId: demoSeller.id,
        orderId: "PAY-111",
        amount: 100000,
        commission: 0,
        netAmount: -100000,
        status: "withdrawn",
        createdAt: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
        description: "Payout to Kuda Bank",
      },
    ];
    earningsData.forEach((e) => {
      const earning: SellerEarning = {
        ...e,
        id: generateId("ERN"),
      };
      this.earnings.set(earning.id, earning);
    });

    const activitiesData: Omit<SellerActivity, "id" | "createdAt">[] = [
      {
        sellerId: demoSeller.id,
        action: "order",
        detail: "New order ORD-7821 received",
        time: "2 hours ago",
        icon: "🛒",
        color: "#16A34A",
      },
      {
        sellerId: demoSeller.id,
        action: "sale",
        detail: "Payment confirmed for ORD-7820",
        time: "5 hours ago",
        icon: "💰",
        color: "#16A34A",
      },
      {
        sellerId: demoSeller.id,
        action: "listing",
        detail: "New listing created: Kitchen Blender Set",
        time: "Yesterday",
        icon: "📦",
        color: "#2563EB",
      },
      {
        sellerId: demoSeller.id,
        action: "offer",
        detail: "You received an offer on iPhone 15 Pro Max",
        time: "Yesterday",
        icon: "💬",
        color: "#D97706",
      },
      {
        sellerId: demoSeller.id,
        action: "payout",
        detail: "Payout of ₦125,000 completed",
        time: "Yesterday",
        icon: "🏦",
        color: "#16A34A",
      },
      {
        sellerId: demoSeller.id,
        action: "review",
        detail: "New 5-star review on Vintage Ankara Dress",
        time: "2 days ago",
        icon: "⭐",
        color: "#F97316",
      },
      {
        sellerId: demoSeller.id,
        action: "dispute",
        detail: "Dispute opened on ORD-7818",
        time: "2 days ago",
        icon: "⚠️",
        color: "#DC2626",
      },
      {
        sellerId: demoSeller.id,
        action: "listing",
        detail: "Listing paused: Nike Air Force 1",
        time: "3 days ago",
        icon: "⏸️",
        color: "#D97706",
      },
      {
        sellerId: demoSeller.id,
        action: "payout",
        detail: "Payout of ₦100,000 completed",
        time: "5 days ago",
        icon: "🏦",
        color: "#16A34A",
      },
      {
        sellerId: demoSeller.id,
        action: "order",
        detail: "Order ORD-7816 shipped",
        time: "2 days ago",
        icon: "🚚",
        color: "#2563EB",
      },
    ];
    activitiesData.forEach((a) => {
      const activity: SellerActivity = {
        ...a,
        id: generateId("ACT"),
        createdAt: new Date(
          Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
      this.activities.set(activity.id, activity);
    });
  }

  // NEW: seed offers (buyer offers on fixed listings) + bids on seller auctions
  private seedOffersAndBidsLegacy() {
    const sellerId = "USR-seller-001";
    const offers: Omit<Offer, "id" | "createdAt">[] = [
      {
        sellerId,
        listingId: "slst-1",
        item: "Vintage Ankara Dress",
        image: "👗",
        listedPrice: 45000,
        offeredPrice: 38000,
        note: "Can you do ₦38k? I can pay immediately.",
        buyerName: "Adeolu M.",
        status: "pending",
      },
      {
        sellerId,
        listingId: "slst-2",
        item: "iPhone 15 Pro Max 256GB",
        image: "📱",
        listedPrice: 890000,
        offeredPrice: 850000,
        note: "Buying for my brother — any discount?",
        buyerName: "Fatima K.",
        status: "pending",
      },
      {
        sellerId,
        listingId: "slst-3",
        item: "Nike Air Force 1 Size 42",
        image: "👟",
        listedPrice: 72000,
        offeredPrice: 65000,
        buyerName: "Chinedu O.",
        status: "countered",
        counterPrice: 68000,
      },
      {
        sellerId,
        listingId: "slst-4",
        item: "Samsung 32 Smart TV 4K",
        image: "📺",
        listedPrice: 145000,
        offeredPrice: 130000,
        note: "I need it urgently, please accept.",
        buyerName: "Ngozi E.",
        status: "accepted",
      },
      {
        sellerId,
        listingId: "slst-5",
        item: "Kitchen Blender Set 5-in-1",
        image: "🍳",
        listedPrice: 28000,
        offeredPrice: 22000,
        buyerName: "Ibrahim S.",
        status: "declined",
      },
    ];
    offers.forEach((o, i) => {
      const offer: Offer = {
        ...o,
        id: generateId("OFR"),
        createdAt: new Date(
          Date.now() - (i + 1) * 2 * 60 * 60 * 1000,
        ).toISOString(),
      };
      this.offers.set(offer.id, offer);
    });

    const bids: Omit<Bid, "id" | "createdAt">[] = [
      {
        userId: "USR-bidder-1",
        listingId: "slst-5",
        item: "Kitchen Blender Set 5-in-1",
        image: "🍳",
        myBid: 25000,
        currentBid: 25000,
        leading: true,
        endTime: "22:14:00",
        totalBids: 5,
      },
      {
        userId: "USR-bidder-2",
        listingId: "slst-5",
        item: "Kitchen Blender Set 5-in-1",
        image: "🍳",
        myBid: 24000,
        currentBid: 25000,
        leading: false,
        endTime: "22:14:00",
        totalBids: 5,
      },
      {
        userId: "USR-bidder-3",
        listingId: "slst-5",
        item: "Kitchen Blender Set 5-in-1",
        image: "🍳",
        myBid: 23500,
        currentBid: 25000,
        leading: false,
        endTime: "22:14:00",
        totalBids: 5,
      },
      {
        userId: "USR-bidder-4",
        listingId: "slst-5",
        item: "Kitchen Blender Set 5-in-1",
        image: "🍳",
        myBid: 23000,
        currentBid: 25000,
        leading: false,
        endTime: "22:14:00",
        totalBids: 5,
      },
    ];
    bids.forEach((b, i) => {
      const bid: Bid = {
        ...b,
        id: generateId("BID"),
        createdAt: new Date(Date.now() - (i + 1) * 9 * 60 * 1000).toISOString(),
      };
      this.bids.set(bid.id, bid);
    });
  }

  private seedDemoUser() {
    const demoUser: User = {
      id: "USR-demo-001",
      email: "emeka@gmail.com",
      password: "password123",
      name: "Emeka Okafor",
      phone: "+2348034567890",
      createdAt: new Date().toISOString(),
      isVerified: true,
      role: "buyer",
    };
    this.users.set(demoUser.id, demoUser);

    const orderItems: OrderItem[] = [
      {
        id: "oi-1",
        listingId: "1",
        title: "iPhone 15 Pro Max 256GB",
        image: "📱",
        price: 890000,
        qty: 1,
        seller: "TechHub Lagos",
        sellerId: "user-1",
        shipping: 2500,
        courier: "GIG Logistics",
        condition: "New",
      },
      {
        id: "oi-2",
        listingId: "2",
        title: "Nike Air Jordan 1 Retro",
        image: "👟",
        price: 85000,
        qty: 1,
        seller: "SneakerHouseNG",
        sellerId: "user-9",
        shipping: 1500,
        courier: "Fez Delivery",
        condition: "New",
      },
      {
        id: "oi-3",
        listingId: "3",
        title: "Dyson V15 Vacuum Cleaner",
        image: "🧹",
        price: 420000,
        qty: 1,
        seller: "HomeAppliances NG",
        sellerId: "user-10",
        shipping: 3000,
        courier: "DHL Nigeria",
        condition: "New",
      },
    ];

    const order1: Order = {
      id: "demo-order-1",
      buyerId: demoUser.id,
      items: orderItems,
      status: "Processing",
      total: 512000,
      subtotal: 500000,
      shipping: 12000,
      discount: 0,
      address: {
        street: "12 Allen Avenue",
        city: "Ikeja",
        state: "Lagos",
        zip: "100001",
        phone: "+2348034567890",
      },
      payMethod: "card",
      courier: "GIG Logistics",
      eta: "2-3 days",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    };
    this.orders.set(order1.id, order1);

    const bids: Omit<Bid, "id" | "createdAt">[] = [
      {
        userId: demoUser.id,
        listingId: "2",
        item: "Vintage Ankara Dress Set",
        image: "👗",
        myBid: 42000,
        currentBid: 42000,
        leading: true,
        endTime: "22:14:00",
        totalBids: 18,
      },
      {
        userId: demoUser.id,
        listingId: "4",
        item: "Toyota Camry 2019 LE",
        image: "🚗",
        myBid: 14100000,
        currentBid: 14200000,
        leading: false,
        endTime: "14:20:00",
        totalBids: 7,
      },
    ];
    bids.forEach((b) => {
      const bid: Bid = {
        ...b,
        id: generateId("BID"),
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      };
      this.bids.set(bid.id, bid);
    });

    const watchlist: Omit<WatchlistItem, "id" | "addedAt">[] = [
      {
        userId: demoUser.id,
        listingId: "3",
        item: "LG 55 OLED Smart TV",
        image: "📺",
        price: 680000,
        origPrice: 750000,
        type: "fixed",
      },
      {
        userId: demoUser.id,
        listingId: "5",
        item: "PlayStation 5 Console",
        image: "🎮",
        price: 450000,
        type: "fixed",
      },
    ];
    watchlist.forEach((w) => {
      const item: WatchlistItem = {
        ...w,
        id: generateId("WAT"),
        addedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      };
      this.watchlist.set(item.id, item);
    });

    const notifications: Omit<Notification, "id" | "createdAt">[] = [
      {
        userId: demoUser.id,
        icon: "💳",
        title: "Payment received",
        body: "Your order #demo-order-1 payment was successful",
        time: "2 days ago",
        unread: true,
      },
      {
        userId: demoUser.id,
        icon: "📦",
        title: "Order processing",
        body: "Order #demo-order-1 is being processed by sellers",
        time: "2 days ago",
        unread: true,
      },
      {
        userId: demoUser.id,
        icon: "🔨",
        title: "You are the highest bidder!",
        body: "Vintage Ankara Dress Set - ₦42,000",
        time: "3 hours ago",
        unread: true,
      },
    ];
    notifications.forEach((n) => {
      const notif: Notification = {
        ...n,
        id: generateId("NTF"),
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      };
      this.notifications.set(notif.id, notif);
    });

    const escrows: Omit<EscrowRecord, "id" | "createdAt">[] = [
      {
        orderId: "demo-order-1",
        buyerId: demoUser.id,
        sellerId: "user-1",
        amount: 512000,
        status: "pending",
      },
    ];
    escrows.forEach((e) => {
      const esc: EscrowRecord = {
        ...e,
        id: generateId("ESC"),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      };
      this.escrows.set(esc.id, esc);
    });
  }

  private seedDemoSeller() {
    const demoSeller: User = {
      id: "USR-seller-001",
      email: "chioma@shopdroply.ng",
      password: "password123",
      name: "Chioma Adebayo",
      phone: "+2348029876543",
      createdAt: new Date().toISOString(),
      isVerified: true,
      role: "seller",
      sellerTier: "verified",
      bankName: "Kuda Bank",
      accountNumber: "2023454531",
      accountName: "Chioma Adebayo",
      sellerStatus: "approved",
    };
    this.users.set(demoSeller.id, demoSeller);

    const sellerListings: Omit<Listing, "createdAt">[] = [
      {
        id: "slst-1",
        title: "Vintage Ankara Dress",
        description: "Handmade traditional",
        price: 45000,
        type: "fixed",
        category: "Fashion",
        condition: "new",
        images: [],
        sellerId: demoSeller.id,
        sellerName: demoSeller.name,
        sellerRating: 4.7,
        sellerReviews: 89,
        sellerBadge: "Top rated",
        location: "Abuja",
        shippingFee: 1200,
        shippingMethod: "Fez Delivery",
        status: "active",
        views: 234,
        watchers: 12,
      },
      {
        id: "slst-2",
        title: "iPhone 15 Pro Max 256GB",
        description: "Brand new sealed",
        price: 890000,
        type: "fixed",
        category: "Phones & Tablets",
        condition: "new",
        images: [],
        sellerId: demoSeller.id,
        sellerName: demoSeller.name,
        sellerRating: 4.7,
        sellerReviews: 89,
        sellerBadge: "Top rated",
        location: "Lagos",
        shippingFee: 2500,
        shippingMethod: "GIG Logistics",
        status: "active",
        views: 567,
        watchers: 34,
      },
      {
        id: "slst-3",
        title: "Nike Air Force 1 Size 42",
        description: "Original sneakers",
        price: 72000,
        type: "fixed",
        category: "Sports & Fitness",
        condition: "new",
        images: [],
        sellerId: demoSeller.id,
        sellerName: demoSeller.name,
        sellerRating: 4.7,
        sellerReviews: 89,
        sellerBadge: "Top rated",
        location: "Lagos",
        shippingFee: 1500,
        shippingMethod: "Fez Delivery",
        status: "paused",
        views: 189,
        watchers: 8,
      },
      {
        id: "slst-4",
        title: "Samsung 32 Smart TV 4K",
        description: "UHD display",
        price: 145000,
        type: "fixed",
        category: "Electronics",
        condition: "used",
        images: [],
        sellerId: demoSeller.id,
        sellerName: demoSeller.name,
        sellerRating: 4.7,
        sellerReviews: 89,
        sellerBadge: "Top rated",
        location: "Abuja",
        shippingFee: 4000,
        shippingMethod: "GIG Logistics",
        status: "active",
        views: 445,
        watchers: 21,
      },
      {
        id: "slst-5",
        title: "Kitchen Blender Set 5-in-1",
        description: "Multi-purpose blender",
        price: 28000,
        type: "auction",
        category: "Kitchen & Food",
        condition: "new",
        images: [],
        sellerId: demoSeller.id,
        sellerName: demoSeller.name,
        sellerRating: 4.7,
        sellerReviews: 89,
        sellerBadge: "Top rated",
        location: "Lagos",
        shippingFee: 2000,
        shippingMethod: "Kwik Delivery",
        status: "active",
        endTime: new Date(Date.now() + 86400000).toISOString(),
        bids: 5,
        currentBid: 25000,
        views: 156,
        watchers: 7,
      },
      {
        id: "slst-6",
        title: "MacBook Pro 14 M3 Pro",
        description: "Latest model",
        price: 2450000,
        type: "fixed",
        category: "Electronics",
        condition: "new",
        images: [],
        sellerId: demoSeller.id,
        sellerName: demoSeller.name,
        sellerRating: 4.7,
        sellerReviews: 89,
        sellerBadge: "Top rated",
        location: "Lagos",
        shippingFee: 3000,
        shippingMethod: "DHL Nigeria",
        status: "sold",
        views: 789,
        watchers: 45,
      },
    ];
    sellerListings.forEach((l) => {
      this.listings.set(l.id, { ...l, createdAt: new Date().toISOString() });
    });

    const ordersData: Omit<Order, "updatedAt">[] = [
      {
        id: "ORD-7821",
        buyerId: "USR-buyer-1",
        buyerName: "Adeolu Martins",
        items: [
          {
            id: "oi-4",
            listingId: "slst-1",
            title: "Vintage Ankara Dress",
            image: "👗",
            price: 45000,
            qty: 1,
            seller: demoSeller.name,
            sellerId: demoSeller.id,
            shipping: 2000,
            courier: "GIG Logistics",
            condition: "New",
          },
        ],
        status: "pending",
        total: 47000,
        subtotal: 45000,
        shipping: 2000,
        discount: 0,
        address: {
          street: "12 Allen Avenue",
          city: "Ikeja",
          state: "Lagos",
          phone: "+2348031234567",
        },
        payMethod: "card",
        courier: "GIG Logistics",
        eta: "2-3 days",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "ORD-7820",
        buyerId: "USR-buyer-2",
        buyerName: "Fatima Kano",
        items: [
          {
            id: "oi-5",
            listingId: "slst-2",
            title: "iPhone 15 Pro Max Case",
            image: "📱",
            price: 8500,
            qty: 1,
            seller: demoSeller.name,
            sellerId: demoSeller.id,
            shipping: 1200,
            courier: "Fez Delivery",
            condition: "New",
          },
        ],
        status: "pending",
        total: 9700,
        subtotal: 8500,
        shipping: 1200,
        discount: 0,
        address: {
          street: "45 Gwarimpa Estate",
          city: "Abuja",
          state: "FCT",
          phone: "+2347055678567",
        },
        payMethod: "transfer",
        courier: "Fez Delivery",
        eta: "1-2 days",
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "ORD-7819",
        buyerId: "USR-buyer-3",
        buyerName: "Chinedu Obi",
        items: [
          {
            id: "oi-6",
            listingId: "slst-3",
            title: "Nike Air Force 1",
            image: "👟",
            price: 72000,
            qty: 1,
            seller: demoSeller.name,
            sellerId: demoSeller.id,
            shipping: 2500,
            courier: "GIG Logistics",
            condition: "New",
          },
        ],
        status: "shipped",
        total: 74500,
        subtotal: 72000,
        shipping: 2500,
        discount: 0,
        address: {
          street: "23 Port Harcourt Road",
          city: "Aba",
          state: "Abia",
          phone: "+2348129012901",
        },
        payMethod: "wallet",
        courier: "GIG Logistics",
        eta: "2-4 days",
        createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
        trackingNumber: "GIG-7748291",
      },
      {
        id: "ORD-7818",
        buyerId: "USR-buyer-4",
        buyerName: "Ngozi Eze",
        items: [
          {
            id: "oi-7",
            listingId: "slst-4",
            title: "Samsung 32 Smart TV",
            image: "📺",
            price: 145000,
            qty: 1,
            seller: demoSeller.name,
            sellerId: demoSeller.id,
            shipping: 4000,
            courier: "GIG Logistics",
            condition: "Used",
          },
        ],
        status: "dispute",
        total: 149000,
        subtotal: 145000,
        shipping: 4000,
        discount: 0,
        address: {
          street: "7 Lekki Phase 1",
          city: "Lagos",
          state: "Lagos",
          phone: "+2349013456345",
        },
        payMethod: "flutterwave",
        courier: "GIG Logistics",
        eta: "1-2 days",
        createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "ORD-7817",
        buyerId: "USR-buyer-5",
        buyerName: "Ibrahim Sule",
        items: [
          {
            id: "oi-8",
            listingId: "slst-5",
            title: "Kitchen Blender Set",
            image: "🍳",
            price: 28000,
            qty: 1,
            seller: demoSeller.name,
            sellerId: demoSeller.id,
            shipping: 2000,
            courier: "Kwik Delivery",
            condition: "New",
          },
        ],
        status: "pending",
        total: 30000,
        subtotal: 28000,
        shipping: 2000,
        discount: 0,
        address: {
          street: "15 Zaria Road",
          city: "Kaduna",
          state: "Kaduna",
          phone: "+2348067890789",
        },
        payMethod: "card",
        courier: "Kwik Delivery",
        eta: "Same day",
        createdAt: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "ORD-7816",
        buyerId: "USR-buyer-6",
        buyerName: "Tolani Bakare",
        items: [
          {
            id: "oi-9",
            listingId: "slst-3",
            title: "HP Laptop Charger",
            image: "💻",
            price: 15000,
            qty: 1,
            seller: demoSeller.name,
            sellerId: demoSeller.id,
            shipping: 1500,
            courier: "Fez Delivery",
            condition: "New",
          },
        ],
        status: "shipped",
        total: 16500,
        subtotal: 15000,
        shipping: 1500,
        discount: 0,
        address: {
          street: "33 Bodija Estate",
          city: "Ibadan",
          state: "Oyo",
          phone: "+2347032345234",
        },
        payMethod: "ussd",
        courier: "Fez Delivery",
        eta: "1-3 days",
        createdAt: new Date(Date.now() - 52 * 60 * 60 * 1000).toISOString(),
        trackingNumber: "FEZ-9921047",
      },
      {
        id: "ORD-7815",
        buyerId: "USR-buyer-7",
        buyerName: "Emeka Nwosu",
        items: [
          {
            id: "oi-10",
            listingId: "slst-6",
            title: "MacBook Pro 14 M3 Pro",
            image: "💻",
            price: 2450000,
            qty: 1,
            seller: demoSeller.name,
            sellerId: demoSeller.id,
            shipping: 5500,
            courier: "DHL Nigeria",
            condition: "New",
          },
        ],
        status: "Delivered",
        total: 2455500,
        subtotal: 2450000,
        shipping: 5500,
        discount: 0,
        address: {
          street: "88 Trans Amadi",
          city: "Port Harcourt",
          state: "Rivers",
          phone: "+2348156789678",
        },
        payMethod: "card",
        courier: "DHL Nigeria",
        eta: "1-2 days",
        createdAt: new Date(Date.now() - 75 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "ORD-7814",
        buyerId: "USR-buyer-8",
        buyerName: "Aisha Bello",
        items: [
          {
            id: "oi-11",
            listingId: "slst-1",
            title: "Designer Handbag",
            image: "👜",
            price: 35000,
            qty: 1,
            seller: demoSeller.name,
            sellerId: demoSeller.id,
            shipping: 2000,
            courier: "GIG Logistics",
            condition: "New",
          },
        ],
        status: "Cancelled",
        total: 37000,
        subtotal: 35000,
        shipping: 2000,
        discount: 0,
        address: {
          street: "19 Maitama",
          city: "Abuja",
          state: "FCT",
          phone: "+2349040123012",
        },
        payMethod: "transfer",
        courier: "GIG Logistics",
        eta: "2-3 days",
        createdAt: new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString(),
      },
    ];
    ordersData.forEach((o) => {
      this.orders.set(o.id, { ...o, updatedAt: o.createdAt });
    });

    const earningsData: Omit<SellerEarning, "id">[] = [
      {
        sellerId: demoSeller.id,
        orderId: "ORD-7821",
        amount: 45000,
        commission: 3600,
        netAmount: 41400,
        status: "available",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        description: "Sale - Vintage Ankara Dress",
      },
      {
        sellerId: demoSeller.id,
        orderId: "ORD-7820",
        amount: 8500,
        commission: 680,
        netAmount: 7820,
        status: "available",
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        description: "Sale - iPhone 15 Pro Max Case",
      },
      {
        sellerId: demoSeller.id,
        orderId: "ORD-7819",
        amount: 72000,
        commission: 5760,
        netAmount: 66240,
        status: "pending",
        createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
        description: "Sale - Nike Air Force 1",
      },
      {
        sellerId: demoSeller.id,
        orderId: "ORD-7818",
        amount: 145000,
        commission: 11600,
        netAmount: 133400,
        status: "pending",
        createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
        description: "Sale - Samsung 32 Smart TV",
      },
      {
        sellerId: demoSeller.id,
        orderId: "ORD-7817",
        amount: 28000,
        commission: 2240,
        netAmount: 25760,
        status: "available",
        createdAt: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(),
        description: "Sale - Kitchen Blender Set",
      },
      {
        sellerId: demoSeller.id,
        orderId: "ORD-7816",
        amount: 15000,
        commission: 1200,
        netAmount: 13800,
        status: "available",
        createdAt: new Date(Date.now() - 52 * 60 * 60 * 1000).toISOString(),
        description: "Sale - HP Laptop Charger",
      },
      {
        sellerId: demoSeller.id,
        orderId: "ORD-7815",
        amount: 2450000,
        commission: 196000,
        netAmount: 2254000,
        status: "withdrawn",
        createdAt: new Date(Date.now() - 75 * 60 * 60 * 1000).toISOString(),
        description: "Sale - MacBook Pro 14 M3 Pro",
      },
      {
        sellerId: demoSeller.id,
        orderId: "PAY-112",
        amount: 125000,
        commission: 0,
        netAmount: -125000,
        status: "withdrawn",
        createdAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
        description: "Payout to Kuda Bank",
      },
      {
        sellerId: demoSeller.id,
        orderId: "PAY-111",
        amount: 100000,
        commission: 0,
        netAmount: -100000,
        status: "withdrawn",
        createdAt: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
        description: "Payout to Kuda Bank",
      },
    ];
    earningsData.forEach((e) => {
      const earning: SellerEarning = {
        ...e,
        id: generateId("ERN"),
      };
      this.earnings.set(earning.id, earning);
    });

    const activitiesData: Omit<SellerActivity, "id" | "createdAt">[] = [
      {
        sellerId: demoSeller.id,
        action: "order",
        detail: "New order ORD-7821 received",
        time: "2 hours ago",
        icon: "🛒",
        color: "#16A34A",
      },
      {
        sellerId: demoSeller.id,
        action: "sale",
        detail: "Payment confirmed for ORD-7820",
        time: "5 hours ago",
        icon: "💰",
        color: "#16A34A",
      },
      {
        sellerId: demoSeller.id,
        action: "listing",
        detail: "New listing created: Kitchen Blender Set",
        time: "Yesterday",
        icon: "📦",
        color: "#2563EB",
      },
      {
        sellerId: demoSeller.id,
        action: "offer",
        detail: "You received an offer on iPhone 15 Pro Max",
        time: "Yesterday",
        icon: "💬",
        color: "#D97706",
      },
      {
        sellerId: demoSeller.id,
        action: "payout",
        detail: "Payout of ₦125,000 completed",
        time: "Yesterday",
        icon: "🏦",
        color: "#16A34A",
      },
      {
        sellerId: demoSeller.id,
        action: "review",
        detail: "New 5-star review on Vintage Ankara Dress",
        time: "2 days ago",
        icon: "⭐",
        color: "#F97316",
      },
      {
        sellerId: demoSeller.id,
        action: "dispute",
        detail: "Dispute opened on ORD-7818",
        time: "2 days ago",
        icon: "⚠️",
        color: "#DC2626",
      },
      {
        sellerId: demoSeller.id,
        action: "listing",
        detail: "Listing paused: Nike Air Force 1",
        time: "3 days ago",
        icon: "⏸️",
        color: "#D97706",
      },
      {
        sellerId: demoSeller.id,
        action: "payout",
        detail: "Payout of ₦100,000 completed",
        time: "5 days ago",
        icon: "🏦",
        color: "#16A34A",
      },
      {
        sellerId: demoSeller.id,
        action: "order",
        detail: "Order ORD-7816 shipped",
        time: "2 days ago",
        icon: "🚚",
        color: "#2563EB",
      },
    ];
    activitiesData.forEach((a) => {
      const activity: SellerActivity = {
        ...a,
        id: generateId("ACT"),
        createdAt: new Date(
          Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
      this.activities.set(activity.id, activity);
    });
  }

  // NEW: seed offers (buyer offers on fixed listings) + bids on seller auctions
  private seedOffersAndBids() {
    const sellerId = "USR-seller-001";
    const offers: Omit<Offer, "id" | "createdAt">[] = [
      {
        sellerId,
        listingId: "slst-1",
        item: "Vintage Ankara Dress",
        image: "👗",
        listedPrice: 45000,
        offeredPrice: 38000,
        note: "Can you do ₦38k? I can pay immediately.",
        buyerName: "Adeolu M.",
        status: "pending",
      },
      {
        sellerId,
        listingId: "slst-2",
        item: "iPhone 15 Pro Max 256GB",
        image: "📱",
        listedPrice: 890000,
        offeredPrice: 850000,
        note: "Buying for my brother — any discount?",
        buyerName: "Fatima K.",
        status: "pending",
      },
      {
        sellerId,
        listingId: "slst-3",
        item: "Nike Air Force 1 Size 42",
        image: "👟",
        listedPrice: 72000,
        offeredPrice: 65000,
        buyerName: "Chinedu O.",
        status: "countered",
        counterPrice: 68000,
      },
      {
        sellerId,
        listingId: "slst-4",
        item: "Samsung 32 Smart TV 4K",
        image: "📺",
        listedPrice: 145000,
        offeredPrice: 130000,
        note: "I need it urgently, please accept.",
        buyerName: "Ngozi E.",
        status: "accepted",
      },
      {
        sellerId,
        listingId: "slst-5",
        item: "Kitchen Blender Set 5-in-1",
        image: "🍳",
        listedPrice: 28000,
        offeredPrice: 22000,
        buyerName: "Ibrahim S.",
        status: "declined",
      },
    ];
    offers.forEach((o, i) => {
      const offer: Offer = {
        ...o,
        id: generateId("OFR"),
        createdAt: new Date(
          Date.now() - (i + 1) * 2 * 60 * 60 * 1000,
        ).toISOString(),
      };
      this.offers.set(offer.id, offer);
    });

    const bids: Omit<Bid, "id" | "createdAt">[] = [
      {
        userId: "USR-bidder-1",
        listingId: "slst-5",
        item: "Kitchen Blender Set 5-in-1",
        image: "🍳",
        myBid: 25000,
        currentBid: 25000,
        leading: true,
        endTime: "22:14:00",
        totalBids: 5,
      },
      {
        userId: "USR-bidder-2",
        listingId: "slst-5",
        item: "Kitchen Blender Set 5-in-1",
        image: "🍳",
        myBid: 24000,
        currentBid: 25000,
        leading: false,
        endTime: "22:14:00",
        totalBids: 5,
      },
      {
        userId: "USR-bidder-3",
        listingId: "slst-5",
        item: "Kitchen Blender Set 5-in-1",
        image: "🍳",
        myBid: 23500,
        currentBid: 25000,
        leading: false,
        endTime: "22:14:00",
        totalBids: 5,
      },
      {
        userId: "USR-bidder-4",
        listingId: "slst-5",
        item: "Kitchen Blender Set 5-in-1",
        image: "🍳",
        myBid: 23000,
        currentBid: 25000,
        leading: false,
        endTime: "22:14:00",
        totalBids: 5,
      },
    ];
    bids.forEach((b, i) => {
      const bid: Bid = {
        ...b,
        id: generateId("BID"),
        createdAt: new Date(Date.now() - (i + 1) * 9 * 60 * 1000).toISOString(),
      };
      this.bids.set(bid.id, bid);
    });
  }

  private seedAdminPayouts() {
    const now = Date.now();
    const dayMs = 86400000;
    const sample: Omit<PayoutRecord, "id" | "createdAt">[] = [
      { sellerId: "SLR-demo-010", sellerName: "Chioma's Fashion Hub", amount: 125000, fee: 6250, net: 118750, bankName: "Kuda Bank", accountNumber: "0234564421", accountName: "Chioma's Fashion Hub", status: "pending" },
      { sellerId: "SLR-demo-011", sellerName: "TechZone NG", amount: 45000, fee: 2250, net: 42750, bankName: "GTBank", accountNumber: "0198778899", accountName: "TechZone NG", status: "pending" },
      { sellerId: "SLR-demo-012", sellerName: "SneakerCity", amount: 89000, fee: 4450, net: 84550, bankName: "UBA", accountNumber: "0112332233", accountName: "SneakerCity", status: "processing" },
      { sellerId: "SLR-demo-013", sellerName: "ElectroMart", amount: 210000, fee: 10500, net: 199500, bankName: "Zenith Bank", accountNumber: "0100005566", accountName: "ElectroMart", status: "completed", processedAt: new Date(now - 1 * dayMs).toISOString() },
      { sellerId: "SLR-demo-014", sellerName: "Home Essentials", amount: 67000, fee: 3350, net: 63650, bankName: "First Bank", accountNumber: "0300007788", accountName: "Home Essentials", status: "completed", processedAt: new Date(now - 2 * dayMs).toISOString() },
      { sellerId: "SLR-demo-015", sellerName: "GameHub NG", amount: 34000, fee: 1700, net: 32300, bankName: "Moniepoint", accountNumber: "0400009900", accountName: "GameHub NG", status: "failed", failReason: "Invalid account number", processedAt: new Date(now - 2 * dayMs).toISOString() },
      { sellerId: "SLR-demo-016", sellerName: "Luxury Bags Lagos", amount: 18000, fee: 900, net: 17100, bankName: "OPay", accountNumber: "0500001122", accountName: "Luxury Bags Lagos", status: "pending" },
    ];
    sample.forEach((p, i) => {
      const payout: PayoutRecord = {
        ...p,
        id: generateId("PAY"),
        createdAt: new Date(now - (sample.length - i) * (dayMs / 3)).toISOString(),
      };
      this.payouts.set(payout.id, payout);
    });
  }

  private seedDisputes() {
    const now = Date.now();
    const dayMs = 86400000;
    const sample: Omit<Dispute, "id" | "createdAt" | "updatedAt">[] = [
      { orderId: "ORD-7818", buyerName: "Ngozi E.", sellerName: "ElectroMart", item: "Samsung 32\" TV", amount: 149000, reason: "Item arrived damaged — screen cracked in transit", status: "open", priority: "high", buyerEvidence: ["Photo of cracked screen", "Delivery receipt"], sellerResponse: "" },
      { orderId: "ORD-7805", buyerName: "Zainab M.", sellerName: "Home Essentials", item: "Kitchen Blender Set", amount: 30000, reason: "Wrong item delivered — received single blender instead of 5-in-1 set", status: "open", priority: "medium", buyerEvidence: ["Photo of received item", "Order screenshot"], sellerResponse: "We sent correct item, buyer is mistaken" },
      { orderId: "ORD-7798", buyerName: "Tunde A.", sellerName: "Luxury Bags Lagos", item: "Designer Handbag", amount: 37000, reason: "Counterfeit item — logo stitching is wrong, no authenticity card", status: "open", priority: "high", buyerEvidence: ["Comparison photo", "Authenticity check report"], sellerResponse: "" },
      { orderId: "ORD-7789", buyerName: "Amara O.", sellerName: "SneakerCity", item: "Nike Air Force 1", amount: 72000, reason: "Seller never shipped — tracking number is fake", status: "resolved", priority: "high", buyerEvidence: ["Fake tracking screenshot", "Bank statement"], sellerResponse: "Item was shipped, courier lost it", resolution: "Refund issued to buyer — ₦72,000" },
      { orderId: "ORD-7785", buyerName: "Kunle D.", sellerName: "TechZone NG", item: "iPhone 15 Pro Max Case", amount: 9700, reason: "Item not as described — colour completely different", status: "resolved", priority: "low", buyerEvidence: ["Photo comparison"], sellerResponse: "Lighting in photos may vary", resolution: "Partial refund — ₦5,000 to buyer" },
      { orderId: "ORD-7778", buyerName: "Ngozi E.", sellerName: "Chioma's Fashion Hub", item: "Vintage Ankara Dress", amount: 45000, reason: "Size too small — ordered XL, received M", status: "open", priority: "medium", buyerEvidence: ["Photo with measuring tape", "Size label photo"], sellerResponse: "Buyer ordered wrong size, not our fault" },
    ];
    sample.forEach((d, i) => {
      const dispute: Dispute = {
        ...d,
        id: generateId("DSP"),
        createdAt: new Date(now - (sample.length - i) * dayMs).toISOString(),
        updatedAt: new Date(now - (sample.length - i) * dayMs).toISOString(),
      };
      this.disputes.set(dispute.id, dispute);
    });
  }

  private seedReviews() {
  const sample: Omit<Review, "id" | "createdAt">[] = [
    { buyerId: "USR-buyer-4", sellerId: "USR-seller-001", listingId: "slst-1", productName: "Vintage Ankara Dress", rating: 5, text: "Absolutely beautiful! The fabric quality exceeded my expectations. Delivery was fast too.", status: "approved", photos: 2, helpful: 24, sellerResponse: "Thank you so much! We're glad you loved it." },
    { buyerId: "USR-buyer-3", sellerId: "user-3", listingId: "3", productName: "LG 55 OLED Smart TV", rating: 2, text: "The TV arrived with a cracked screen. Very disappointed. The packaging was inadequate.", status: "flagged", photos: 3, helpful: 8, sellerResponse: "We sincerely apologise. Please open a dispute so we can arrange a replacement." },
    { buyerId: "USR-buyer-2", sellerId: "user-2", listingId: "2", productName: "Vintage Ankara Dress Set", rating: 4, text: "Great product, works perfectly. Only giving 4 stars because delivery took 2 days longer.", status: "approved", photos: 0, helpful: 12 },
    { buyerId: "USR-buyer-1", sellerId: "user-5", listingId: "5", productName: "PlayStation 5 Console", rating: 1, text: "FAKE. The logo is completely wrong. This is a counterfeit product and I want a full refund.", status: "flagged", photos: 4, helpful: 45, sellerResponse: "These are 100% authentic. We source directly from official distributors." },
    { buyerId: "USR-buyer-5", sellerId: "user-1", listingId: "1", productName: "iPhone 15 Pro Max", rating: 5, text: "Perfect fit, exactly as described. The matte finish feels premium. Fast shipping.", status: "approved", photos: 1, helpful: 6, sellerResponse: "Thanks for the kind review!" },
    { buyerId: "USR-buyer-6", sellerId: "USR-seller-001", listingId: "slst-4", productName: "Samsung 32 Smart TV", rating: 3, text: "TV is okay but the colour is darker than shown in the photos. Not exactly what I expected.", status: "pending", photos: 2, helpful: 3 },
    { buyerId: "USR-buyer-7", sellerId: "user-9", listingId: "slst-5", productName: "Kitchen Blender Set", rating: 5, text: "Brand new, sealed in box. Works perfectly. Seller was very responsive before shipping.", status: "approved", photos: 0, helpful: 18, sellerResponse: "Enjoy your cooking!" },
    { buyerId: "USR-buyer-8", sellerId: "user-10", listingId: "slst-6", productName: "MacBook Pro 14 M3 Pro", rating: 1, text: "Complete scam. Paid ₦2,450,000 and received a broken unit. Seller is not responding.", status: "flagged", photos: 2, helpful: 67 },
    { buyerId: "USR-demo-001", sellerId: "USR-seller-001", listingId: "slst-1", productName: "Ankara Maxi Skirt", rating: 4, text: "Lovely skirt, well tailored. Just a bit long for my height but nothing a quick adjustment can't fix.", status: "pending", photos: 1, helpful: 9 },
    { buyerId: "USR-buyer-4", sellerId: "user-8", listingId: "8", productName: "Royal Canin Dog Food", rating: 5, text: "Best pet food I've bought online. My dog loves it. Easy to store. Highly recommend.", status: "approved", photos: 2, helpful: 31, sellerResponse: "So glad it's working well for your pet!" },
  ];
  sample.forEach((r, i) => {
    const review: Review = {
      ...r,
      id: generateId("REV"),
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    };
    this.reviews.set(review.id, review);
  });
}

private seedBanners() {
  const sample: Omit<Banner, "id" | "createdAt">[] = [
    { title: "Independence Day Tech Deals", subtitle: "Up to 40% off phones & laptops", position: "hero", cta: "Shop deals", link: "/category/electronics", image: "📱", bgColor: "#EFF6FF", active: true, startDate: "2026-09-20", endDate: "2026-10-10", priority: 1, clicks: 12480 },
    { title: "Verified Sellers Only", subtitle: "Buy with confidence — NIN/BVN verified", position: "hero", cta: "Learn more", link: "/trust", image: "🛡️", bgColor: "#F0FDF4", active: true, startDate: "2026-01-01", endDate: "2026-12-31", priority: 2, clicks: 8930 },
    { title: "New Electronics Arrivals", subtitle: "Latest gadgets, accessories & more", position: "hero", cta: "Explore", link: "/category/electronics", image: "💻", bgColor: "#FFF7ED", active: true, startDate: "2026-09-15", endDate: "2026-10-15", priority: 3, clicks: 5620 },
    { title: "Free Shipping Week", subtitle: "Nationwide delivery on us — limited time", position: "promo-bar", cta: "Shop now", link: "/search", image: "🚚", bgColor: "#FFFBEB", active: true, startDate: "2026-09-01", endDate: "2026-09-07", priority: 1, clicks: 7410 },
    { title: "Sell on Shopdroply", subtitle: "Turn your hustle into a business", position: "seller-cta", cta: "Start selling", link: "/seller/onboarding", image: "💼", bgColor: "#F5F3FF", active: true, startDate: "2026-01-01", endDate: "2026-12-31", priority: 1, clicks: 3890 },
    { title: "Black Friday Early Access", subtitle: "VIP deals before everyone else", position: "hero", cta: "Unlock deals", link: "/bf-2026", image: "🖤", bgColor: "#1A1A1A", active: false, startDate: "2026-11-20", endDate: "2026-11-30", priority: 4, clicks: 0 },
    { title: "Auction Weekend", subtitle: "Bid & win — live auctions every Saturday", position: "promo-bar", cta: "View auctions", link: "/auctions", image: "🔨", bgColor: "#FEF2F2", active: false, startDate: "2026-10-01", endDate: "2026-10-31", priority: 2, clicks: 0 },
  ];
  sample.forEach((b) => {
    const banner: Banner = {
      ...b,
      id: generateId("BNR"),
      createdAt: new Date().toISOString(),
    };
    this.banners.set(banner.id, banner);
  });
}
}
// One shared instance that survives Next.js hot-reloads (dev) instead of resetting all data on every file save.
const g = globalThis as unknown as { __shopdroplyDb?: LocalDB };
export const localAdapter = g.__shopdroplyDb ?? (g.__shopdroplyDb = new LocalDB());