// lib/db-postgres-adapter.ts
// Real PostgreSQL implementation of DatabaseAdapter (uses the `pg` package).
//
// Storage model: one table per collection, shaped as
//     seq bigserial | id text PRIMARY KEY | data jsonb
// Your interfaces (orders with nested items, addresses, etc.) are stored as-is
// in `data`, so adding a field to db-interface.ts never needs a migration.
// Tables and indexes are created automatically on first use.
//
// Install:  npm install pg && npm install -D @types/pg

import { Pool } from "pg";
import type {
  DatabaseAdapter,
  User,
  Listing,
  Order,
  Bid,
  WatchlistItem,
  Notification,
  EscrowRecord,
  PaymentRecord,
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
  AdminRole,
} from "./db-interface";
import { DEFAULT_ADMIN_ROLES, normalizeAdminRoles } from "./admin-roles";
import {
  DEFAULT_SHIPPING_SETTINGS,
  normalizeShippingSettings,
} from "./shipping-db";
import { generateId } from "./utils";

// ─────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────

/** Collections that use the generic (seq, id, data) shape. */
export const DOC_TABLES = [
  "users",
  "listings",
  "orders",
  "bids",
  "watchlist",
  "notifications",
  "escrows",
  "payments",
  "cart_items",
  "earnings",
  "activities",
  "payouts",
  "offers",
  "returns",
  "disputes",
  "reviews",
  "banners",
  "categories",
] as const;
export type DocTable = (typeof DOC_TABLES)[number];

const SCHEMA_SQL = [
  ...DOC_TABLES.map(
    (t) =>
      `CREATE TABLE IF NOT EXISTS ${t} (
         seq  bigserial,
         id   text PRIMARY KEY,
         data jsonb NOT NULL
       )`,
  ),
  `CREATE TABLE IF NOT EXISTS sessions (
     token      text PRIMARY KEY,
     user_id    text NOT NULL,
     expires_at timestamptz NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS otps (
     phone      text PRIMARY KEY,
     code       text NOT NULL,
     expires_at timestamptz NOT NULL,
     attempts   int NOT NULL DEFAULT 0
   )`,
  `CREATE TABLE IF NOT EXISTS kv (
     key   text PRIMARY KEY,
     value jsonb NOT NULL
   )`,
  // indexes
  `CREATE UNIQUE INDEX IF NOT EXISTS users_email_uq ON users (lower(data->>'email'))`,
  `CREATE INDEX IF NOT EXISTS listings_seller_idx ON listings ((data->>'sellerId'))`,
  `CREATE INDEX IF NOT EXISTS listings_type_idx ON listings ((data->>'type'))`,
  `CREATE INDEX IF NOT EXISTS listings_category_idx ON listings ((data->>'category'))`,
  `CREATE INDEX IF NOT EXISTS orders_buyer_idx ON orders ((data->>'buyerId'))`,
  `CREATE INDEX IF NOT EXISTS orders_checkout_idx ON orders ((data->>'checkoutId'))`,
  `CREATE INDEX IF NOT EXISTS orders_items_gin ON orders USING gin ((data->'items') jsonb_path_ops)`,
  `CREATE INDEX IF NOT EXISTS bids_user_idx ON bids ((data->>'userId'))`,
  `CREATE INDEX IF NOT EXISTS bids_listing_idx ON bids ((data->>'listingId'))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS watchlist_uq ON watchlist ((data->>'userId'), (data->>'listingId'))`,
  `CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications ((data->>'userId'))`,
  `CREATE INDEX IF NOT EXISTS escrows_buyer_idx ON escrows ((data->>'buyerId'))`,
  `CREATE INDEX IF NOT EXISTS escrows_order_idx ON escrows ((data->>'orderId'))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS payments_ref_uq ON payments ((data->>'reference'))`,
  `CREATE INDEX IF NOT EXISTS payments_checkout_idx ON payments ((data->>'checkoutId'))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS cart_uq ON cart_items ((data->>'userId'), (data->>'listingId'))`,
  `CREATE INDEX IF NOT EXISTS earnings_seller_idx ON earnings ((data->>'sellerId'))`,
  `CREATE INDEX IF NOT EXISTS activities_seller_idx ON activities ((data->>'sellerId'))`,
  `CREATE INDEX IF NOT EXISTS payouts_seller_idx ON payouts ((data->>'sellerId'))`,
  `CREATE INDEX IF NOT EXISTS offers_seller_idx ON offers ((data->>'sellerId'))`,
  `CREATE INDEX IF NOT EXISTS returns_seller_idx ON returns ((data->>'sellerId'))`,
  `CREATE INDEX IF NOT EXISTS disputes_order_idx ON disputes ((data->>'orderId'))`,
];

/** Create all tables/indexes. Safe to run repeatedly and from many processes at once. */
export async function ensureSchema(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(727274)");
    for (const sql of SCHEMA_SQL) await client.query(sql);
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock(727274)");
    } finally {
      client.release();
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Defaults (only used when the DB is empty)
// ─────────────────────────────────────────────────────────────

const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  paymentProcessingFee: 1.5,
  minimumPayout: 1000,
  payoutSchedule: "Tuesday & Friday (bi-weekly)",
};

// [id, name, icon, slug, listingCount, commissionRate, feeCap, feeMin]
const DEFAULT_CATEGORY_ROWS: [string, string, string, string, number, number, number, number][] = [
  ["cat-1", "Phones & Tablets", "📱", "phones-tablets", 12400, 0.08, 80000, 500],
  ["cat-2", "Fashion", "👗", "fashion", 34200, 0.1, 50000, 500],
  ["cat-3", "Home & Living", "🏠", "home-living", 8900, 0.1, 40000, 500],
  ["cat-4", "Electronics", "💻", "electronics", 6300, 0.08, 100000, 500],
  ["cat-5", "Vehicles & Parts", "🚗", "vehicles", 2100, 0.04, 150000, 2000],
  ["cat-6", "Beauty & Health", "💄", "beauty-health", 15800, 0.12, 30000, 500],
  ["cat-7", "Books & Media", "📚", "books", 4700, 0.1, 20000, 300],
  ["cat-8", "Sports & Fitness", "⚽", "sports", 3200, 0.1, 40000, 500],
  ["cat-9", "Gaming", "🎮", "gaming", 5100, 0.08, 50000, 500],
  ["cat-10", "Kitchen & Food", "🍳", "kitchen", 7600, 0.1, 40000, 500],
];

const byNewest = <T extends { createdAt: string }>(a: T, b: T) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

// ─────────────────────────────────────────────────────────────
// Adapter
// ─────────────────────────────────────────────────────────────

export class PostgresAdapter implements DatabaseAdapter {
  /**
   * The interface declares `categories` as a plain array, so we keep an
   * in-memory copy that is refreshed on every category read/write.
   */
  public categories: Category[] = [];

  private _ready?: Promise<void>;

  constructor(private pool: Pool) {}

  // ─── internals ───

  private ready(): Promise<void> {
    if (!this._ready) {
      this._ready = this.init().catch((err) => {
        this._ready = undefined; // allow a retry on the next call
        throw err;
      });
    }
    return this._ready;
  }

  private async init(): Promise<void> {
    await ensureSchema(this.pool);

    const { rows } = await this.pool.query("SELECT count(*)::int AS n FROM categories");
    if (rows[0].n === 0) {
      for (const [id, name, icon, slug, listingCount, commissionRate, feeCap, feeMin] of DEFAULT_CATEGORY_ROWS) {
        const cat: Category = {
          id, name, icon, slug, listingCount, commissionRate,
          active: true, featured: false, attributes: [], parent: null, feeCap, feeMin,
        };
        await this.pool.query(
          "INSERT INTO categories (id, data) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
          [id, JSON.stringify(cat)],
        );
      }
    }
    await this.refreshCategories(true);
  }

  private async refreshCategories(skipReady = false): Promise<Category[]> {
    if (!skipReady) await this.ready();
    const { rows } = await this.pool.query("SELECT data FROM categories ORDER BY seq");
    this.categories = rows.map((r) => r.data as Category);
    return this.categories;
  }

  /** Run a query and return raw rows. */
  private async q(text: string, params: unknown[] = []): Promise<any[]> {
    await this.ready();
    const res = await this.pool.query(text, params as any[]);
    return res.rows;
  }

  private async docs<T>(text: string, params: unknown[] = []): Promise<T[]> {
    return (await this.q(text, params)).map((r) => r.data as T);
  }

  private async doc<T>(text: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.q(text, params);
    return rows.length ? (rows[0].data as T) : null;
  }

  private async insert<T extends { id: string }>(table: DocTable, doc: T): Promise<T> {
    await this.q(`INSERT INTO ${table} (id, data) VALUES ($1, $2)`, [doc.id, JSON.stringify(doc)]);
    return doc;
  }

  private getById<T>(table: DocTable, id: string): Promise<T | null> {
    return this.doc<T>(`SELECT data FROM ${table} WHERE id = $1`, [id]);
  }

  /** Shallow merge (same as Object.assign on the stored object). The id can never change. */
  private patch<T>(table: DocTable, id: string, data: object): Promise<T | null> {
    return this.doc<T>(
      `UPDATE ${table} SET data = data || $2::jsonb WHERE id = $1 RETURNING data`,
      [id, JSON.stringify({ ...data, id })],
    );
  }

  private async remove(table: DocTable, id: string): Promise<boolean> {
    const rows = await this.q(`DELETE FROM ${table} WHERE id = $1 RETURNING id`, [id]);
    return rows.length > 0;
  }

  private async getKv<T>(key: string): Promise<T | null> {
    const rows = await this.q("SELECT value FROM kv WHERE key = $1", [key]);
    return rows.length ? (rows[0].value as T) : null;
  }

  private async setKv(key: string, value: unknown): Promise<void> {
    await this.q(
      `INSERT INTO kv (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, JSON.stringify(value)],
    );
  }

  // ─── Auth & Users ───

  async createUser(
    userData: Omit<User, "id" | "createdAt" | "isVerified">,
  ): Promise<User> {
    const user: User = {
      ...userData,
      id: generateId("USR"),
      createdAt: new Date().toISOString(),
      isVerified: false,
      role: (userData as { role?: User["role"] }).role || "buyer",
    };
    return this.insert("users", user);
  }

  findUserByEmail(email: string): Promise<User | null> {
    return this.doc<User>(
      "SELECT data FROM users WHERE lower(data->>'email') = lower($1) LIMIT 1",
      [email],
    );
  }

  findUserById(id: string): Promise<User | null> {
    return this.getById<User>("users", id);
  }

  async createOTP(phone: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.q(
      `INSERT INTO otps (phone, code, expires_at, attempts)
       VALUES ($1, $2, now() + interval '10 minutes', 0)
       ON CONFLICT (phone) DO UPDATE
         SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at, attempts = 0`,
      [phone.replace(/[^0-9]/g, ""), code],
    );
    return code;
  }

  async verifyOTP(phone: string, code: string): Promise<boolean> {
    const clean = phone.replace(/[^0-9]/g, "");
    // Atomic: a valid code is consumed in one statement (no double-use races)
    const ok = await this.q(
      `DELETE FROM otps
       WHERE phone = $1 AND code = $2 AND expires_at > now() AND attempts < 3
       RETURNING phone`,
      [clean, code],
    );
    if (ok.length > 0) return true;
    await this.q("UPDATE otps SET attempts = attempts + 1 WHERE phone = $1", [clean]);
    return false;
  }

  async createSession(userId: string): Promise<string> {
    const token = generateId("TKN");
    await this.q(
      "INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, now() + interval '7 days')",
      [token, userId],
    );
    return token;
  }

  async getSession(token: string): Promise<SessionRecord | null> {
    const rows = await this.q(
      "SELECT user_id, expires_at FROM sessions WHERE token = $1",
      [token],
    );
    if (!rows.length) return null;
    const expiresAt = new Date(rows[0].expires_at);
    if (new Date() > expiresAt) {
      await this.deleteSession(token);
      return null;
    }
    return { userId: rows[0].user_id, expiresAt };
  }

  async deleteSession(token: string): Promise<void> {
    await this.q("DELETE FROM sessions WHERE token = $1", [token]);
  }

  // ─── Listings ───

  getListings(filters?: { type?: string; category?: string }): Promise<Listing[]> {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filters?.type) {
      params.push(filters.type);
      where.push(`data->>'type' = $${params.length}`);
    }
    if (filters?.category) {
      params.push(filters.category);
      where.push(`data->>'category' = $${params.length}`);
    }
    return this.docs<Listing>(
      `SELECT data FROM listings ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY seq`,
      params,
    );
  }

  getListingById(id: string): Promise<Listing | null> {
    return this.getById<Listing>("listings", id);
  }

  createListing(listingData: Omit<Listing, "id" | "createdAt">): Promise<Listing> {
    return this.insert("listings", {
      ...listingData,
      id: generateId("LST"),
      createdAt: new Date().toISOString(),
    } as Listing);
  }

  updateListing(id: string, data: Partial<Listing>): Promise<Listing | null> {
    return this.patch<Listing>("listings", id, data);
  }

  deleteListing(id: string): Promise<boolean> {
    return this.remove("listings", id);
  }

  // ─── Orders ───

  createOrder(orderData: Omit<Order, "id" | "createdAt" | "updatedAt">): Promise<Order> {
    const now = new Date().toISOString();
    return this.insert("orders", {
      ...orderData,
      id: generateId("ORD"),
      createdAt: now,
      updatedAt: now,
    } as Order);
  }

  getOrderById(id: string): Promise<Order | null> {
    return this.getById<Order>("orders", id);
  }

  getOrdersByUser(userId: string): Promise<Order[]> {
    return this.docs<Order>(
      "SELECT data FROM orders WHERE data->>'buyerId' = $1 ORDER BY data->>'createdAt' DESC",
      [userId],
    );
  }

  updateOrderStatus(
    id: string,
    status: Order["status"],
    extra?: Partial<Order>,
  ): Promise<Order | null> {
    return this.patch<Order>("orders", id, {
      ...(extra || {}),
      status,
      updatedAt: new Date().toISOString(),
    });
  }

  getOrdersByCheckout(checkoutId: string): Promise<Order[]> {
    return this.docs<Order>(
      "SELECT data FROM orders WHERE data->>'checkoutId' = $1 ORDER BY seq",
      [checkoutId],
    );
  }

  getAllOrders(): Promise<Order[]> {
    return this.docs<Order>("SELECT data FROM orders ORDER BY data->>'createdAt' DESC");
  }

  // ─── Bids ───

  createBid(bidData: Omit<Bid, "id" | "createdAt">): Promise<Bid> {
    return this.insert("bids", {
      ...bidData,
      id: generateId("BID"),
      createdAt: new Date().toISOString(),
    } as Bid);
  }

  getBidsByUser(userId: string): Promise<Bid[]> {
    return this.docs<Bid>("SELECT data FROM bids WHERE data->>'userId' = $1 ORDER BY seq", [userId]);
  }

  getBidById(id: string): Promise<Bid | null> {
    return this.getById<Bid>("bids", id);
  }

  updateBid(id: string, data: Partial<Bid>): Promise<Bid | null> {
    return this.patch<Bid>("bids", id, data);
  }

  getBidsForSeller(sellerId: string): Promise<Bid[]> {
    return this.docs<Bid>(
      `SELECT b.data FROM bids b
       JOIN listings l ON l.id = b.data->>'listingId'
       WHERE l.data->>'sellerId' = $1
       ORDER BY b.data->>'createdAt' DESC`,
      [sellerId],
    );
  }

  // ─── Watchlist ───

  async addToWatchlist(item: Omit<WatchlistItem, "id" | "addedAt">): Promise<WatchlistItem> {
    const w: WatchlistItem = {
      ...item,
      id: generateId("WAT"),
      addedAt: new Date().toISOString(),
    };
    await this.q(
      "INSERT INTO watchlist (id, data) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [w.id, JSON.stringify(w)],
    );
    // returns the existing row if this user already watches the listing
    const existing = await this.doc<WatchlistItem>(
      "SELECT data FROM watchlist WHERE data->>'userId' = $1 AND data->>'listingId' = $2",
      [item.userId, item.listingId],
    );
    return existing || w;
  }

  getWatchlistByUser(userId: string): Promise<WatchlistItem[]> {
    return this.docs<WatchlistItem>(
      "SELECT data FROM watchlist WHERE data->>'userId' = $1 ORDER BY seq",
      [userId],
    );
  }

  async removeFromWatchlist(userId: string, listingId: string): Promise<boolean> {
    const rows = await this.q(
      "DELETE FROM watchlist WHERE data->>'userId' = $1 AND data->>'listingId' = $2 RETURNING id",
      [userId, listingId],
    );
    return rows.length > 0;
  }

  // ─── Notifications ───

  createNotification(notif: Omit<Notification, "id" | "createdAt">): Promise<Notification> {
    return this.insert("notifications", {
      ...notif,
      id: generateId("NTF"),
      createdAt: new Date().toISOString(),
    } as Notification);
  }

  getNotificationsByUser(userId: string): Promise<Notification[]> {
    return this.docs<Notification>(
      "SELECT data FROM notifications WHERE data->>'userId' = $1 ORDER BY data->>'createdAt' DESC",
      [userId],
    );
  }

  async markNotificationRead(userId: string, notifId: string): Promise<boolean> {
    const rows = await this.q(
      `UPDATE notifications SET data = data || '{"unread": false}'::jsonb
       WHERE id = $1 AND data->>'userId' = $2 RETURNING id`,
      [notifId, userId],
    );
    return rows.length > 0;
  }

  async markAllNotificationsRead(userId: string): Promise<boolean> {
    await this.q(
      `UPDATE notifications SET data = data || '{"unread": false}'::jsonb
       WHERE data->>'userId' = $1`,
      [userId],
    );
    return true;
  }

  // ─── Escrow ───

  createEscrow(escrow: Omit<EscrowRecord, "id" | "createdAt">): Promise<EscrowRecord> {
    return this.insert("escrows", {
      ...escrow,
      id: generateId("ESC"),
      createdAt: new Date().toISOString(),
    } as EscrowRecord);
  }

  getEscrowByUser(userId: string): Promise<EscrowRecord[]> {
    return this.docs<EscrowRecord>(
      "SELECT data FROM escrows WHERE data->>'buyerId' = $1 ORDER BY seq",
      [userId],
    );
  }

  updateEscrowStatus(id: string, status: EscrowRecord["status"]): Promise<EscrowRecord | null> {
    return this.patch<EscrowRecord>("escrows", id, { status });
  }

  getEscrowByOrder(orderId: string): Promise<EscrowRecord | null> {
    return this.doc<EscrowRecord>(
      "SELECT data FROM escrows WHERE data->>'orderId' = $1 ORDER BY seq LIMIT 1",
      [orderId],
    );
  }

  updateEscrow(id: string, data: Partial<EscrowRecord>): Promise<EscrowRecord | null> {
    return this.patch<EscrowRecord>("escrows", id, data);
  }

  getAllEscrow(): Promise<EscrowRecord[]> {
    return this.docs<EscrowRecord>("SELECT data FROM escrows ORDER BY data->>'createdAt' DESC");
  }

  getEscrowById(id: string): Promise<EscrowRecord | null> {
    return this.getById<EscrowRecord>("escrows", id);
  }

  // ─── Payments ───

  createPayment(
    data: Omit<PaymentRecord, "id" | "createdAt" | "updatedAt">,
  ): Promise<PaymentRecord> {
    const now = new Date().toISOString();
    return this.insert("payments", {
      ...data,
      id: generateId("PAY"),
      createdAt: now,
      updatedAt: now,
    } as PaymentRecord);
  }

  getPaymentByReference(reference: string): Promise<PaymentRecord | null> {
    return this.doc<PaymentRecord>(
      "SELECT data FROM payments WHERE data->>'reference' = $1 LIMIT 1",
      [reference],
    );
  }

  getLatestPaymentByCheckout(checkoutId: string): Promise<PaymentRecord | null> {
    return this.doc<PaymentRecord>(
      `SELECT data FROM payments WHERE data->>'checkoutId' = $1
       ORDER BY data->>'createdAt' DESC, seq DESC LIMIT 1`,
      [checkoutId],
    );
  }

  updatePayment(id: string, data: Partial<PaymentRecord>): Promise<PaymentRecord | null> {
    return this.patch<PaymentRecord>("payments", id, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  }

  // ─── Buyer stats ───

  async getBuyerStats(userId: string): Promise<BuyerStats> {
    const [orders, bids, watchlist, escrows] = await Promise.all([
      this.getOrdersByUser(userId),
      this.getBidsByUser(userId),
      this.getWatchlistByUser(userId),
      this.getEscrowByUser(userId),
    ]);
    const pending = escrows.filter((e) => e.status === "pending");
    return {
      totalOrders: orders.length,
      activeOrders: orders.filter((o) => o.status === "Processing" || o.status === "In transit").length,
      activeBids: bids.length,
      leadingBids: bids.filter((b) => b.leading).length,
      watchlistCount: watchlist.length,
      priceDrops: watchlist.filter((w) => w.origPrice && w.origPrice > w.price).length,
      escrowTotal: pending.reduce((s, e) => s + e.amount, 0),
      escrowPending: pending.length,
    };
  }

  // ─── Categories ───

  getCategories(): Promise<Category[]> {
    return this.refreshCategories();
  }

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
    await this.insert("categories", category);
    await this.refreshCategories();
    return category;
  }

  async updateCategory(id: string, data: Partial<Category>): Promise<Category | null> {
    const updated = await this.patch<Category>("categories", id, data);
    await this.refreshCategories();
    return updated;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const ok = await this.remove("categories", id);
    await this.refreshCategories();
    return ok;
  }

  // ─── Cart ───

  getCartByUser(userId: string): Promise<CartItem[]> {
    return this.docs<CartItem>(
      "SELECT data FROM cart_items WHERE data->>'userId' = $1 ORDER BY seq",
      [userId],
    );
  }

  async addToCart(item: Omit<CartItem, "id" | "addedAt">): Promise<CartItem> {
    const cartItem: CartItem = {
      ...item,
      id: generateId("CRT"),
      addedAt: new Date().toISOString(),
    };
    // Same listing already in the cart -> bump the quantity instead
    const rows = await this.q(
      `INSERT INTO cart_items (id, data) VALUES ($1, $2)
       ON CONFLICT ((data->>'userId'), (data->>'listingId')) DO UPDATE
         SET data = jsonb_set(
           cart_items.data, '{qty}',
           to_jsonb(COALESCE((cart_items.data->>'qty')::int, 0) + $3::int)
         )
       RETURNING data`,
      [cartItem.id, JSON.stringify(cartItem), item.qty],
    );
    return rows[0].data as CartItem;
  }

  updateCartItem(
    userId: string,
    listingId: string,
    data: Partial<Pick<CartItem, "qty" | "courierId" | "shipping">>,
  ): Promise<CartItem | null> {
    return this.doc<CartItem>(
      `UPDATE cart_items SET data = data || $3::jsonb
       WHERE data->>'userId' = $1 AND data->>'listingId' = $2 RETURNING data`,
      [userId, listingId, JSON.stringify(data)],
    );
  }

  async removeFromCart(userId: string, listingId: string): Promise<boolean> {
    const rows = await this.q(
      "DELETE FROM cart_items WHERE data->>'userId' = $1 AND data->>'listingId' = $2 RETURNING id",
      [userId, listingId],
    );
    return rows.length > 0;
  }

  async clearCart(userId: string): Promise<boolean> {
    await this.q("DELETE FROM cart_items WHERE data->>'userId' = $1", [userId]);
    return true;
  }

  // ─── Seller profile / listings / orders ───

  updateUserAsSeller(userId: string, sellerData: Partial<User>): Promise<User | null> {
    return this.patch<User>("users", userId, sellerData);
  }

  async getSellerProfile(userId: string): Promise<Partial<User> | null> {
    const user = await this.findUserById(userId);
    if (!user || !user.sellerTier) return null;
    const { password: _password, ...profile } = user;
    return profile;
  }

  getSellerListings(sellerId: string): Promise<Listing[]> {
    return this.docs<Listing>(
      "SELECT data FROM listings WHERE data->>'sellerId' = $1 ORDER BY data->>'createdAt' DESC",
      [sellerId],
    );
  }

  getSellerOrders(sellerId: string): Promise<Order[]> {
    // sellers never see unpaid orders
    return this.docs<Order>(
      `SELECT data FROM orders
       WHERE data->>'status' <> 'Pending payment'
         AND data->'items' @> $1::jsonb
       ORDER BY data->>'createdAt' DESC`,
      [JSON.stringify([{ sellerId }])],
    );
  }

  async getSellerStats(sellerId: string): Promise<SellerStats> {
    const [listings, orders, earnings] = await Promise.all([
      this.getSellerListings(sellerId),
      this.getSellerOrders(sellerId),
      this.getSellerEarnings(sellerId),
    ]);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return {
      totalSales: orders.filter((o) => o.status === "Delivered" || o.status === "Confirm receipt").length,
      totalOrders: orders.length,
      revenue30d: earnings
        .filter((e) => new Date(e.createdAt) > thirtyDaysAgo)
        .reduce((s, e) => s + e.netAmount, 0),
      activeListings: listings.filter((l) => l.status === "active").length,
      pendingOrders: orders.filter((o) => o.status === "pending" || o.status === "Processing").length,
      totalRevenue: earnings.reduce((s, e) => s + e.netAmount, 0),
      totalViews: listings.reduce((s, l) => s + (l.views || 0), 0),
      totalWatchers: listings.reduce((s, l) => s + (l.watchers || 0), 0),
    };
  }

  // ─── Seller earnings / activities / payouts ───

  getSellerEarnings(sellerId: string): Promise<SellerEarning[]> {
    return this.docs<SellerEarning>(
      "SELECT data FROM earnings WHERE data->>'sellerId' = $1 ORDER BY data->>'createdAt' DESC",
      [sellerId],
    );
  }

  createEarning(earning: Omit<SellerEarning, "id" | "createdAt">): Promise<SellerEarning> {
    return this.insert("earnings", {
      ...earning,
      id: generateId("ERN"),
      createdAt: new Date().toISOString(),
    } as SellerEarning);
  }

  updateEarningStatus(id: string, status: SellerEarning["status"]): Promise<SellerEarning | null> {
    return this.patch<SellerEarning>("earnings", id, { status });
  }

  getSellerActivities(sellerId: string, limit = 20): Promise<SellerActivity[]> {
    return this.docs<SellerActivity>(
      `SELECT data FROM activities WHERE data->>'sellerId' = $1
       ORDER BY data->>'createdAt' DESC LIMIT $2`,
      [sellerId, limit],
    );
  }

  createActivity(activity: Omit<SellerActivity, "id" | "createdAt">): Promise<SellerActivity> {
    return this.insert("activities", {
      ...activity,
      id: generateId("ACT"),
      createdAt: new Date().toISOString(),
    } as SellerActivity);
  }

  createPayout(payout: Omit<PayoutRecord, "id" | "createdAt">): Promise<PayoutRecord> {
    return this.insert("payouts", {
      ...payout,
      id: generateId("PAY"),
      createdAt: new Date().toISOString(),
    } as PayoutRecord);
  }

  getPayoutsBySeller(sellerId: string): Promise<PayoutRecord[]> {
    return this.docs<PayoutRecord>(
      "SELECT data FROM payouts WHERE data->>'sellerId' = $1 ORDER BY data->>'createdAt' DESC",
      [sellerId],
    );
  }

  getAllPayouts(): Promise<PayoutRecord[]> {
    return this.docs<PayoutRecord>("SELECT data FROM payouts ORDER BY data->>'createdAt' DESC");
  }

  updatePayoutStatus(
    id: string,
    status: PayoutRecord["status"],
    extra?: Partial<PayoutRecord>,
  ): Promise<PayoutRecord | null> {
    const processed =
      status === "completed" || status === "failed"
        ? { processedAt: new Date().toISOString() }
        : {};
    return this.patch<PayoutRecord>("payouts", id, { status, ...processed, ...(extra || {}) });
  }

  // ─── Offers ───

  getSellerOffers(sellerId: string): Promise<Offer[]> {
    return this.docs<Offer>(
      "SELECT data FROM offers WHERE data->>'sellerId' = $1 ORDER BY data->>'createdAt' DESC",
      [sellerId],
    );
  }

  updateOffer(id: string, data: Partial<Offer>): Promise<Offer | null> {
    return this.patch<Offer>("offers", id, data);
  }

  // ─── Returns ───

  getSellerReturns(sellerId: string): Promise<ReturnRequest[]> {
    return this.docs<ReturnRequest>(
      "SELECT data FROM returns WHERE data->>'sellerId' = $1 ORDER BY data->>'createdAt' DESC",
      [sellerId],
    );
  }

  createReturn(
    data: Omit<ReturnRequest, "id" | "createdAt" | "updatedAt">,
  ): Promise<ReturnRequest> {
    const now = new Date().toISOString();
    return this.insert("returns", {
      ...data,
      id: generateId("RET"),
      createdAt: now,
      updatedAt: now,
    } as ReturnRequest);
  }

  updateReturnStatus(
    id: string,
    status: ReturnRequest["status"],
    resolution?: string,
  ): Promise<ReturnRequest | null> {
    return this.patch<ReturnRequest>("returns", id, {
      status,
      ...(resolution !== undefined ? { resolution } : {}),
      updatedAt: new Date().toISOString(),
    });
  }

  // ─── Admin: users / KYC ───

  getAllUsers(): Promise<User[]> {
    return this.docs<User>("SELECT data FROM users ORDER BY seq");
  }

  updateUserStatus(id: string, status: User["sellerStatus"]): Promise<User | null> {
    return this.patch<User>("users", id, { sellerStatus: status });
  }

  updateUserAccountStatus(id: string, status: "active" | "suspended"): Promise<User | null> {
    return this.patch<User>("users", id, { accountStatus: status });
  }

  updateUserKyc(
    id: string,
    status: "approved" | "rejected",
    reason?: string,
  ): Promise<User | null> {
    if (status === "rejected") {
      return this.patch<User>("users", id, { sellerStatus: status, kycRejectionReason: reason });
    }
    return this.doc<User>(
      `UPDATE users SET data = (data || $2::jsonb) - 'kycRejectionReason'
       WHERE id = $1 RETURNING data`,
      [id, JSON.stringify({ sellerStatus: status, id })],
    );
  }

  updateUser(id: string, data: Partial<User>): Promise<User | null> {
    return this.patch<User>("users", id, data);
  }

  // ─── Admin: roles / settings / shipping ───

  async getAdminRoles(): Promise<AdminRole[]> {
    const stored = await this.getKv<AdminRole[]>("admin_roles");
    return normalizeAdminRoles(stored ?? DEFAULT_ADMIN_ROLES);
  }

  async saveAdminRoles(roles: AdminRole[]): Promise<AdminRole[]> {
    const normalized = normalizeAdminRoles(roles);
    await this.setKv("admin_roles", normalized);
    return normalizeAdminRoles(normalized);
  }

  async getPlatformSettings(): Promise<PlatformSettings> {
    const stored = await this.getKv<Partial<PlatformSettings>>("platform_settings");
    return { ...DEFAULT_PLATFORM_SETTINGS, ...(stored || {}) };
  }

  async updatePlatformSettings(data: Partial<PlatformSettings>): Promise<PlatformSettings> {
    const next = { ...(await this.getPlatformSettings()), ...data };
    await this.setKv("platform_settings", next);
    return next;
  }

  async getShippingSettings(): Promise<ShippingSettings> {
    const stored = await this.getKv<ShippingSettings>("shipping_settings");
    return normalizeShippingSettings(stored ?? DEFAULT_SHIPPING_SETTINGS);
  }

  async updateShippingSettings(data: Partial<ShippingSettings>): Promise<ShippingSettings> {
    const current = await this.getShippingSettings();
    const next = normalizeShippingSettings({ ...current, ...data });
    await this.setKv("shipping_settings", next);
    return normalizeShippingSettings(next);
  }

  // ─── Admin: disputes ───

  getDisputes(): Promise<Dispute[]> {
    return this.docs<Dispute>("SELECT data FROM disputes ORDER BY data->>'createdAt' DESC");
  }

  getDisputeById(id: string): Promise<Dispute | null> {
    return this.getById<Dispute>("disputes", id);
  }

  resolveDispute(id: string, resolution: string, adminNotes?: string): Promise<Dispute | null> {
    return this.patch<Dispute>("disputes", id, {
      status: "resolved",
      resolution,
      ...(adminNotes ? { adminNotes } : {}),
      updatedAt: new Date().toISOString(),
    });
  }

  escalateDispute(id: string, adminNotes?: string): Promise<Dispute | null> {
    return this.patch<Dispute>("disputes", id, {
      status: "escalated",
      priority: "high",
      ...(adminNotes ? { adminNotes } : {}),
      updatedAt: new Date().toISOString(),
    });
  }

  createDispute(data: Omit<Dispute, "id" | "createdAt" | "updatedAt">): Promise<Dispute> {
    const now = new Date().toISOString();
    return this.insert("disputes", {
      ...data,
      id: generateId("DSP"),
      createdAt: now,
      updatedAt: now,
    } as Dispute);
  }

  getDisputeByOrder(orderId: string): Promise<Dispute | null> {
    return this.doc<Dispute>(
      `SELECT data FROM disputes WHERE data->>'orderId' = $1
       ORDER BY data->>'createdAt' DESC, seq DESC LIMIT 1`,
      [orderId],
    );
  }

  // ─── Admin: reviews / banners ───

  getAllReviews(): Promise<Review[]> {
    return this.docs<Review>("SELECT data FROM reviews ORDER BY data->>'createdAt' DESC");
  }

  updateReviewStatus(
    id: string,
    status: Review["status"],
    adminNotes?: string,
  ): Promise<Review | null> {
    return this.patch<Review>("reviews", id, {
      status,
      ...(adminNotes !== undefined ? { adminNotes } : {}),
    });
  }

  getAllBanners(): Promise<Banner[]> {
    return this.docs<Banner>(
      `SELECT data FROM banners
       ORDER BY (data->>'priority')::numeric ASC, data->>'createdAt' DESC`,
    );
  }

  createBanner(data: Omit<Banner, "id" | "createdAt">): Promise<Banner> {
    return this.insert("banners", {
      ...data,
      id: generateId("BNR"),
      createdAt: new Date().toISOString(),
    } as Banner);
  }

  updateBanner(id: string, data: Partial<Banner>): Promise<Banner | null> {
    return this.patch<Banner>("banners", id, data);
  }

  deleteBanner(id: string): Promise<boolean> {
    return this.remove("banners", id);
  }

  // ─── Admin: dashboard ───

  async getAdminDashboardStats(): Promise<AdminDashboardStats> {
    const now = Date.now();
    const dayMs = 86400000;
    const cutoff30 = now - 30 * dayMs;

    const lastNDays = (n: number) =>
      Array.from({ length: n }, (_, i) => {
        const d = new Date(now - (n - 1 - i) * dayMs);
        return {
          key: d.toDateString(),
          label: d.toLocaleDateString("en-NG", { day: "numeric", month: "short" }),
          value: 0,
        };
      });

    const revenueDaily = lastNDays(30);
    const commissionDaily = lastNDays(30);
    const newUsersDaily = lastNDays(7);

    const [orders, earnings, users, escrows, listingCounts] = await Promise.all([
      this.getAllOrders(),
      this.docs<SellerEarning>("SELECT data FROM earnings"),
      this.getAllUsers(),
      this.docs<EscrowRecord>("SELECT data FROM escrows"),
      this.q(
        `SELECT count(*)::int AS total,
                count(*) FILTER (WHERE data->>'status' = 'active')::int AS active
         FROM listings`,
      ),
    ]);

    // GMV (30 days)
    let gmv30d = 0;
    for (const o of orders) {
      const t = new Date(o.createdAt).getTime();
      if (t >= cutoff30 && o.status !== "Cancelled" && o.status !== "Pending payment") {
        gmv30d += o.total;
        const slot = revenueDaily.find((d) => d.key === new Date(t).toDateString());
        if (slot) slot.value += o.total;
      }
    }

    // Commission
    let commissionRevenue = 0;
    for (const e of earnings) {
      const t = new Date(e.createdAt).getTime();
      commissionRevenue += e.commission || 0;
      if (t >= cutoff30) {
        const slot = commissionDaily.find((d) => d.key === new Date(t).toDateString());
        if (slot) slot.value += e.commission || 0;
      }
    }

    // Signups (7 days)
    for (const u of users) {
      const slot = newUsersDaily.find((d) => d.key === new Date(u.createdAt).toDateString());
      if (slot) slot.value += 1;
    }

    const statusMap: Record<string, number> = {};
    for (const o of orders) statusMap[o.status] = (statusMap[o.status] || 0) + 1;

    const escrowHeld = escrows
      .filter((r) => r.status === "pending")
      .reduce((s, r) => s + r.amount, 0);

    const pendingKycUsers: AdminKycItem[] = users
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

    return {
      totalUsers: users.length,
      totalSellers: users.filter((u) => u.role === "seller" || u.sellerStatus).length,
      pendingKyc: pendingKycUsers.length,
      totalListings: listingCounts[0].total,
      activeListings: listingCounts[0].active,
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => o.status === "pending" || o.status === "Processing").length,
      disputedOrders: orders.filter((o) => o.status === "dispute").length,
      gmv30d,
      escrowHeld,
      commissionRevenue,
      revenueDaily: revenueDaily.map(({ label, value }) => ({ label, value })),
      commissionDaily: commissionDaily.map(({ label, value }) => ({ label, value })),
      ordersByStatus: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
      newUsersDaily: newUsersDaily.map(({ label, value }) => ({ label, value })),
      recentOrders: [...orders].sort(byNewest).slice(0, 5),
      pendingKycUsers,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────

const globalForPg = globalThis as unknown as { __pgPool?: Pool };

export function createPostgresAdapter(connectionString: string): DatabaseAdapter {
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (and to your host's environment variables).",
    );
  }
  // Reuse one pool across Next.js hot reloads / serverless invocations
  if (!globalForPg.__pgPool) {
    const isLocal = /@(localhost|127\.0\.0\.1)(:|\/|$)/.test(connectionString);
    globalForPg.__pgPool = new Pool({
      connectionString,
      max: 10,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
    });
  }
  return new PostgresAdapter(globalForPg.__pgPool);
}