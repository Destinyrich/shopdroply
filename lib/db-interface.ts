// lib/db-interface.ts
// Extended with Offers, Order tracking, and seller-facing bid queries

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  createdAt: string;
  isVerified: boolean;
  role?: "buyer" | "seller" | "admin";
  sellerTier?: "individual" | "verified" | "business";
  nin?: string;
  bvn?: string;
  dob?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  sellerStatus?: "pending" | "approved" | "rejected";
  sellerOnboardingAt?: string;
  storeBanner?: string;
  storeAbout?: string;
  storePolicies?: string;
  accountStatus?: "active" | "suspended";
   // ── admin access (set when a user is made an admin) ──
  adminRoleId?: string; // AdminRole.id — no value on an admin = legacy full access
  adminPrevRole?: User["role"]; // role to restore if admin access is removed
  adminSince?: string;
  lastActiveAt?: string;
}

export interface AdminRole {
  id: string; // slug, e.g. "finance-manager" (immutable once created)
  name: string;
  description: string;
  permissions: string[]; // permission ids, see lib/admin-roles.ts
  system: boolean; // system roles (Super Admin) can't be edited or deleted
  readOnly: boolean; // true = can view its screens but never change anything
  active: boolean; // inactive roles can't be assigned to admins
  createdAt: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  type: "fixed" | "auction";
  category: string;
  condition: string;
  images: string[];
  sellerId: string;
  sellerName: string;
  sellerRating: number;
  sellerReviews: number;
  sellerBadge: string;
  location: string;
  shippingFee: number;
  shippingMethod: string;
  status: "active" | "sold" | "paused" | "draft" | "suspended";
  createdAt: string;
  endTime?: string;
  bids?: number;
  currentBid?: number;
  reservePrice?: number;
  views?: number;
  watchers?: number;
  // ── edit fields ──
  stock?: number;
  origPrice?: number;
  acceptOffers?: boolean;
  handlingTime?: string;
  acceptReturns?: boolean;
  moderationReason?: string;
  moderatedAt?: string;

}

export interface OrderItem {
  id: string;
  listingId: string;
  title: string;
  image: string;
  price: number;
  qty: number;
  seller: string;
  sellerId: string;
  shipping: number;
  courier: string;
  condition: string;
}

export interface Order {
  id: string;
  buyerId: string;
  buyerName?: string;
  items: OrderItem[];
  status:
    | "Processing"
    | "In transit"
    | "Delivered"
    | "Confirm receipt"
    | "Cancelled"
    | "pending"
    | "shipped"
    | "dispute"
    | "Pending payment"; 
  total: number;
  subtotal: number;
  shipping: number;
  discount: number;
  address: Record<string, string | number>;
  payMethod: string;
  courier: string;
  eta: string;
  createdAt: string;
  updatedAt: string;
  trackingNumber?: string;
  sellerId?: string;                                              // NEW
  checkoutId?: string;                                            // NEW (groups per-seller orders paid together)
  paymentStatus?: "unpaid" | "paid" | "failed" | "refunded";      // NEW
  paymentReference?: string;                                      // NEW
}

export interface Bid {
  id: string;
  userId: string;
  listingId: string;
  item: string;
  image: string;
  myBid: number;
  currentBid: number;
  leading: boolean;
  endTime: string;
  totalBids: number;
  createdAt: string;
}

export interface WatchlistItem {
  id: string;
  userId: string;
  listingId: string;
  item: string;
  image: string;
  price: number;
  origPrice?: number;
  type: "fixed" | "auction";
  bids?: number;
  addedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  icon: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  createdAt: string;
}

export interface EscrowRecord {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  status: "awaiting_payment" | "pending" | "released" | "disputed" | "refunded";
  checkoutId?: string;
  commission?: number;
  paymentReference?: string;
  fundedAt?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  reference: string; // unique id sent to the provider (e.g. Paystack)
  checkoutId: string;
  buyerId: string;
  provider: "paystack";
  method: string;
  amount: number; // naira — sum of the checkout's unpaid orders
  currency: "NGN";
  status: "initialized" | "success" | "failed" | "abandoned" | "duplicate";
  orderIds: string[];
  authorizationUrl?: string;
  providerTransactionId?: string;
  failReason?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  slug: string;
  listingCount: number;
  commissionRate: number;
  parent?: string | null;
  attributes?: string[];
  active?: boolean;
  featured?: boolean;
  feeCap?: number;
  feeMin?: number;
}

export interface OTPRecord {
  code: string;
  expiresAt: Date;
  attempts: number;
}

export interface SessionRecord {
  userId: string;
  expiresAt: Date;
}

export interface CartItem {
  id: string;
  userId: string;
  listingId: string;
  title: string;
  image: string;
  price: number;
  qty: number;
  seller: string;
  shipping: number;
  courierId: number;
  condition: string;
  addedAt: string;
}

// ─── Dashboard Stats ───
export interface BuyerStats {
  totalOrders: number;
  activeOrders: number;
  activeBids: number;
  leadingBids: number;
  watchlistCount: number;
  priceDrops: number;
  escrowTotal: number;
  escrowPending: number;
}

// ─── Seller Types ───
export interface SellerStats {
  totalSales: number;
  totalOrders: number;
  revenue30d: number;
  activeListings: number;
  pendingOrders: number;
  totalRevenue: number;
  totalViews: number;
  totalWatchers: number;
}

export interface SellerEarning {
  id: string;
  sellerId: string;
  orderId: string;
  amount: number;
  commission: number;
  netAmount: number;
  status: "pending" | "available" | "withdrawn";
  createdAt: string;
  description?: string;
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

export interface PayoutRecord {
  id: string;
  sellerId: string;
  sellerName?: string;
  amount: number;
  fee?: number;
  net?: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: "pending" | "processing" | "completed" | "failed";
  failReason?: string;
  createdAt: string;
  processedAt?: string;
}

export interface PlatformSettings {
  paymentProcessingFee: number; // percent, e.g. 1.5
  minimumPayout: number; // naira
  payoutSchedule: string; // e.g. "Tuesday & Friday (bi-weekly)"
}

export interface Offer {
  id: string;
  sellerId: string;
  listingId: string;
  item: string;
  image: string;
  listedPrice: number;
  offeredPrice: number;
  note?: string;
  buyerName: string;
  status: "pending" | "countered" | "accepted" | "declined";
  counterPrice?: number;
  createdAt: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  sellerId: string;
  buyerName: string;
  item: string;
  image: string;
  amount: number;
  reason: string;
  details?: string;
  status: "requested" | "approved" | "declined" | "received" | "refunded";
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Dispute {
  id: string;
  orderId: string;
  buyerId?: string;
  buyerName: string;
  sellerId?: string;
  sellerName: string;
  item: string;
  image?: string;
  amount: number;
  reason: string;
  status: "open" | "resolved" | "escalated";
  priority: "low" | "medium" | "high";
  buyerEvidence: string[];
  sellerResponse?: string;
  resolution?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminKycItem {
  userId: string;
  name: string;
  email: string;
  tier: string; // individual | verified | business
  nin?: string;
  bvn?: string;
  submittedAt?: string; // sellerOnboardingAt
  status: string; // pending | approved | rejected
}

export type CourierApiStatus = "connected" | "disconnected";

export interface Courier {
  id: string;
  name: string; // e.g. "GIG Logistics"
  logo: string; // emoji shown in the admin UI
  type: string; // "Nationwide", "Last-mile", "International"...
  coverage: string; // "36 states", "Lagos only"
  avgTime: string; // "2-5 days", "Same day"
  apiStatus: CourierApiStatus;
  active: boolean;
}

export interface ShippingZone {
  id: string;
  name: string; // e.g. "Same city", "Nationwide"
  description: string;
  maxFee: number; // naira cap — seller cannot charge above this (0 = free allowed)
  minDays: number;
  maxDays: number;
  courierIds: string[]; // couriers allowed in this zone (must exist in couriers)
  active: boolean;
}

export interface ShippingSettings {
  couriers: Courier[];
  zones: ShippingZone[];
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalSellers: number;
  pendingKyc: number;
  totalListings: number;
  activeListings: number;
  totalOrders: number;
  pendingOrders: number;
  disputedOrders: number;
  gmv30d: number;
  escrowHeld: number;
  commissionRevenue: number;
  revenueDaily: { label: string; value: number }[]; // last 30 days
  commissionDaily: { label: string; value: number }[]; // last 30 days
  ordersByStatus: { status: string; count: number }[];
  newUsersDaily: { label: string; value: number }[]; // last 7 days
  recentOrders: Order[];
  pendingKycUsers: AdminKycItem[];
}

export interface Review {
  id: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
  productName: string;
  rating: number; // 1–5
  text: string;
  status: "approved" | "pending" | "flagged" | "rejected";
  photos?: number;
  helpful?: number;
  sellerResponse?: string;
  adminNotes?: string;
  createdAt: string;
}

export type BannerPosition = "hero" | "promo-bar" | "seller-cta";

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  position: BannerPosition;
  cta: string;
  link: string;
  image: string; // emoji placeholder until real uploads exist
  bgColor: string;
  active: boolean;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  priority: number; // display order within position (1 = first)
  clicks: number;
  createdAt: string;
}



export interface DatabaseAdapter {
  categories: Category[];
  // ─── Auth & Users ───
  createUser(
    userData: Omit<User, "id" | "createdAt" | "isVerified">,
  ): Promise<User>;
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
  createOTP(phone: string): Promise<string>;
  verifyOTP(phone: string, code: string): Promise<boolean>;
  createSession(userId: string): Promise<string>;
  getSession(token: string): Promise<SessionRecord | null>;
  deleteSession(token: string): Promise<void>;

  // ─── Listings ───
  getListings(filters?: {
    type?: string;
    category?: string;
  }): Promise<Listing[]>;
  getListingById(id: string): Promise<Listing | null>;
  createListing(
    listingData: Omit<Listing, "id" | "createdAt">,
  ): Promise<Listing>;
  updateListing(id: string, data: Partial<Listing>): Promise<Listing | null>;
  deleteListing(id: string): Promise<boolean>;

  // ─── Orders ───
  createOrder(
    orderData: Omit<Order, "id" | "createdAt" | "updatedAt">,
  ): Promise<Order>;
  getOrderById(id: string): Promise<Order | null>;
  getOrdersByUser(userId: string): Promise<Order[]>;
  updateOrderStatus(
    id: string,
    status: Order["status"],
    extra?: Partial<Order>,
  ): Promise<Order | null>;

  // ─── Bids ───
  createBid(bidData: Omit<Bid, "id" | "createdAt">): Promise<Bid>;
  getBidsByUser(userId: string): Promise<Bid[]>;
  getBidById(id: string): Promise<Bid | null>;
  updateBid(id: string, data: Partial<Bid>): Promise<Bid | null>;
  getBidsForSeller(sellerId: string): Promise<Bid[]>;

  // ─── Watchlist ───
  addToWatchlist(
    item: Omit<WatchlistItem, "id" | "addedAt">,
  ): Promise<WatchlistItem>;
  getWatchlistByUser(userId: string): Promise<WatchlistItem[]>;
  removeFromWatchlist(userId: string, listingId: string): Promise<boolean>;

  // ─── Notifications ───
  createNotification(
    notif: Omit<Notification, "id" | "createdAt">,
  ): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  markNotificationRead(userId: string, notifId: string): Promise<boolean>;
  markAllNotificationsRead(userId: string): Promise<boolean>;

  // ─── Escrow ───
  createEscrow(
    escrow: Omit<EscrowRecord, "id" | "createdAt">,
  ): Promise<EscrowRecord>;
  getEscrowByUser(userId: string): Promise<EscrowRecord[]>;
  updateEscrowStatus(
    id: string,
    status: EscrowRecord["status"],
  ): Promise<EscrowRecord | null>;

    // ─── Payments (Step 2) ───
  createPayment(
    data: Omit<PaymentRecord, "id" | "createdAt" | "updatedAt">,
  ): Promise<PaymentRecord>;
  getPaymentByReference(reference: string): Promise<PaymentRecord | null>;
  getLatestPaymentByCheckout(checkoutId: string): Promise<PaymentRecord | null>;
  updatePayment(id: string, data: Partial<PaymentRecord>): Promise<PaymentRecord | null>;
  getOrdersByCheckout(checkoutId: string): Promise<Order[]>;
  getEscrowByOrder(orderId: string): Promise<EscrowRecord | null>;
  updateEscrow(id: string, data: Partial<EscrowRecord>): Promise<EscrowRecord | null>;

  // ─── Stats ───
  getBuyerStats(userId: string): Promise<BuyerStats>;

  // ─── Categories ───
  getCategories(): Promise<Category[]>;

  // ─── Cart ───
  getCartByUser(userId: string): Promise<CartItem[]>;
  addToCart(item: Omit<CartItem, "id" | "addedAt">): Promise<CartItem>;
  updateCartItem(
    userId: string,
    listingId: string,
    data: Partial<Pick<CartItem, "qty" | "courierId" | "shipping">>,
  ): Promise<CartItem | null>;
  removeFromCart(userId: string, listingId: string): Promise<boolean>;
  clearCart(userId: string): Promise<boolean>;

  // ─── Seller Profile ───
  updateUserAsSeller(
    userId: string,
    sellerData: Partial<User>,
  ): Promise<User | null>;
  getSellerProfile(userId: string): Promise<Partial<User> | null>;

  // ─── Seller Listings ───
  getSellerListings(sellerId: string): Promise<Listing[]>;

  // ─── Seller Orders ───
  getSellerOrders(sellerId: string): Promise<Order[]>;

  // ─── Seller Stats ───
  getSellerStats(sellerId: string): Promise<SellerStats>;

  // ─── Seller Earnings ───
  getSellerEarnings(sellerId: string): Promise<SellerEarning[]>;
  createEarning(
    earning: Omit<SellerEarning, "id" | "createdAt">,
  ): Promise<SellerEarning>;
  updateEarningStatus(
    id: string,
    status: SellerEarning["status"],
  ): Promise<SellerEarning | null>;

  // ─── Seller Activities ───
  getSellerActivities(
    sellerId: string,
    limit?: number,
  ): Promise<SellerActivity[]>;
  createActivity(
    activity: Omit<SellerActivity, "id" | "createdAt">,
  ): Promise<SellerActivity>;

  // ─── Payouts ───
  createPayout(
    payout: Omit<PayoutRecord, "id" | "createdAt">,
  ): Promise<PayoutRecord>;
  getPayoutsBySeller(sellerId: string): Promise<PayoutRecord[]>;

  // ─── Offers ───
  getSellerOffers(sellerId: string): Promise<Offer[]>;
  updateOffer(id: string, data: Partial<Offer>): Promise<Offer | null>;

  // ─── Returns ───
  getSellerReturns(sellerId: string): Promise<ReturnRequest[]>;
  createReturn(
    data: Omit<ReturnRequest, "id" | "createdAt" | "updatedAt">,
  ): Promise<ReturnRequest>;
  updateReturnStatus(
    id: string,
    status: ReturnRequest["status"],
    resolution?: string,
  ): Promise<ReturnRequest | null>;

  // ─── Admin ───
  getAdminDashboardStats(): Promise<AdminDashboardStats>;
  getAllUsers(): Promise<User[]>;
  updateUserStatus(
    id: string,
    status: User["sellerStatus"],
  ): Promise<User | null>;
  // ─── Admin: Users ───
  updateUserAccountStatus(
    id: string,
    status: "active" | "suspended",
  ): Promise<User | null>;
  // (updateUserStatus doubles as the KYC approve/reject action)
  updateUserKyc(
  id: string,
  status: "approved" | "rejected",
  reason?: string
): Promise<User | null>;

  // ─── Admin: Categories ───
  createCategory(
    data: Omit<Category, "id" | "listingCount">,
  ): Promise<Category>;
  updateCategory(id: string, data: Partial<Category>): Promise<Category | null>;
  deleteCategory(id: string): Promise<boolean>;

  // ─── Admin: Disputes ───
  getDisputes(): Promise<Dispute[]>;
  getDisputeById(id: string): Promise<Dispute | null>;
  resolveDispute(
    id: string,
    resolution: string,
    adminNotes?: string,
  ): Promise<Dispute | null>;
  escalateDispute(id: string, adminNotes?: string): Promise<Dispute | null>;
  createDispute(data: Omit<Dispute, "id" | "createdAt" | "updatedAt">): Promise<Dispute>;
  getDisputeByOrder(orderId: string): Promise<Dispute | null>;

  // ─── Admin: Payouts ───
  getAllPayouts(): Promise<PayoutRecord[]>;
  updatePayoutStatus(
    id: string,
    status: PayoutRecord["status"],
    extra?: Partial<PayoutRecord>,
  ): Promise<PayoutRecord | null>;

  // ─── Admin: Platform Settings ───
  getPlatformSettings(): Promise<PlatformSettings>;
  updatePlatformSettings(
    data: Partial<PlatformSettings>,
  ): Promise<PlatformSettings>;
  //
  //    // ─── Admin: Orders ───
   getAllOrders(): Promise<Order[]>;
       // ─── Admin: Escrow ───
   getAllEscrow(): Promise<EscrowRecord[]>;
   getEscrowById(id: string): Promise<EscrowRecord | null>;

    // ─── Admin: Shipping ───
   getShippingSettings(): Promise<ShippingSettings>;
   updateShippingSettings(
     data: Partial<ShippingSettings>,
   ): Promise<ShippingSettings>;

   // ─── Admin: Reviews ───
   getAllReviews(): Promise<Review[]>;
   updateReviewStatus(
     id: string,
     status: Review["status"],
     adminNotes?: string,
   ): Promise<Review | null>;

   // ─── Admin: Banners ───
   getAllBanners(): Promise<Banner[]>;
   createBanner(data: Omit<Banner, "id" | "createdAt">): Promise<Banner>;
   updateBanner(id: string, data: Partial<Banner>): Promise<Banner | null>;
   deleteBanner(id: string): Promise<boolean>;

    // ─── Admin: Roles & admin users ───
   getAdminRoles(): Promise<AdminRole[]>;
   saveAdminRoles(roles: AdminRole[]): Promise<AdminRole[]>; // replaces the whole list
   updateUser(id: string, data: Partial<User>): Promise<User | null>; // generic patch
}