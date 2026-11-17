// lib/orders.ts
// Step 1 — server-side order logic. The server is the ONLY source of truth for prices.
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import type { Listing, Order, OrderItem } from "@/lib/db-interface";

/* ─── Errors ─── */
export class OrderError extends Error {
  status: number;
  data?: unknown;
  constructor(message: string, status = 400, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/* ─── Constants ─── */
export const PAY_METHODS = ["card", "transfer", "ussd", "opay", "palmpay", "bnpl"] as const;

// TEMPORARY server-side coupon table. Move to the database in the coupons step.
const COUPONS: Record<string, { percent: number }> = { SDP5: { percent: 5 } };

export function resolveCoupon(code?: unknown): { code: string; percent: number } | null {
  if (typeof code !== "string" || !code.trim()) return null;
  const key = code.trim().toUpperCase();
  const hit = COUPONS[key];
  if (!hit) throw new OrderError("Invalid coupon code");
  return { code: key, percent: hit.percent };
}

/* ─── Input validation ─── */
export function parseQty(v: unknown): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) {
    throw new OrderError("Quantity must be a whole number of 1 or more");
  }
  return n;
}

export function parseAddress(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") throw new OrderError("Delivery address is required");
  const a = raw as Record<string, unknown>;
  const get = (k: string, max: number) =>
    typeof a[k] === "string" ? (a[k] as string).trim().slice(0, max) : "";

  const out: Record<string, string> = {
    firstName: get("firstName", 60),
    lastName: get("lastName", 60),
    phone: get("phone", 20),
    state: get("state", 40),
    lga: get("lga", 60),
    address: get("address", 250),
    landmark: get("landmark", 150),
    plusCode: get("plusCode", 30),
    note: get("note", 300), // delivery note shown to the seller/courier
  };
  for (const k of ["firstName", "lastName", "phone", "state", "address"]) {
    if (!out[k]) throw new OrderError(`Delivery address: ${k} is required`);
  }
  if (!/^\+?[\d\s]{10,15}$/.test(out.phone)) {
    throw new OrderError("Delivery address: enter a valid phone number");
  }
  return out;
}

/* ─── Stock / buyability ─── */
export function availableStock(listing: Listing): number {
  // Listings without a stock value are treated as a single item (safe default).
  return typeof listing.stock === "number" ? listing.stock : 1;
}

export function assertBuyable(
  listing: Listing | null,
  userId: string,
  qty: number
): asserts listing is Listing {
  if (!listing) throw new OrderError("An item in your cart no longer exists", 404);
  if (listing.status !== "active") {
    throw new OrderError(`"${listing.title}" is no longer available`, 409);
  }
  if (listing.type !== "fixed") {
    throw new OrderError(`"${listing.title}" is an auction — place a bid instead`, 409);
  }
  if (listing.sellerId === userId) {
    throw new OrderError("You can't buy your own listing", 403);
  }
  const stock = availableStock(listing);
  if (qty > stock) {
    throw new OrderError(
      stock <= 0 ? `"${listing.title}" is out of stock` : `Only ${stock} of "${listing.title}" available`,
      409
    );
  }
}

/* ─── Shipping (stopgap until Step 4: zones + courier quotes) ─── */
export async function getShippingCap(): Promise<number> {
  try {
    const s = await db.getShippingSettings();
    const caps = s.zones.filter((z) => z.active).map((z) => z.maxFee);
    if (caps.length) return Math.max(...caps);
  } catch {
    /* fall through */
  }
  return 7000;
}

export function capShipping(fee: unknown, cap: number): number {
  const n = Number(fee);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.round(n), cap);
}

/* ─── Pricing ─── */
export interface PricedLine {
  listing: Listing;
  qty: number;
  lineTotal: number;
  shipping: number;
}

export interface SellerGroup {
  sellerId: string;
  sellerName: string;
  lines: PricedLine[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
}

export interface PricedCheckout {
  groups: SellerGroup[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  coupon: string | null;
}

export async function priceCheckout(
  userId: string,
  requested: { listingId: string; qty: number }[],
  couponCode?: unknown
): Promise<PricedCheckout> {
  if (!requested.length) throw new OrderError("Your cart is empty");

  // merge duplicate listings
  const merged = new Map<string, number>();
  for (const r of requested) merged.set(r.listingId, (merged.get(r.listingId) ?? 0) + r.qty);

  const cap = await getShippingCap();
  const bySeller = new Map<string, SellerGroup>();

  for (const [listingId, qty] of merged) {
    const listing = await db.getListingById(listingId);
    assertBuyable(listing, userId, qty);

    const line: PricedLine = {
      listing,
      qty,
      lineTotal: listing.price * qty,
      shipping: capShipping(listing.shippingFee, cap),
    };
    const g =
      bySeller.get(listing.sellerId) ??
      ({
        sellerId: listing.sellerId,
        sellerName: listing.sellerName,
        lines: [],
        subtotal: 0,
        shipping: 0,
        discount: 0,
        total: 0,
      } as SellerGroup);
    g.lines.push(line);
    g.subtotal += line.lineTotal;
    g.shipping += line.shipping;
    bySeller.set(listing.sellerId, g);
  }

  const groups = [...bySeller.values()];
  const subtotal = groups.reduce((s, g) => s + g.subtotal, 0);
  const shipping = groups.reduce((s, g) => s + g.shipping, 0);

  // coupon: percent of the whole subtotal, split across seller orders
  const coupon = resolveCoupon(couponCode);
  const discount = coupon ? Math.round((subtotal * coupon.percent) / 100) : 0;
  let allocated = 0;
  groups.forEach((g, i) => {
    g.discount =
      i === groups.length - 1
        ? discount - allocated
        : Math.round((g.subtotal / subtotal) * discount);
    allocated += g.discount;
    g.total = g.subtotal + g.shipping - g.discount;
  });

  return { groups, subtotal, shipping, discount, total: subtotal + shipping - discount, coupon: coupon?.code ?? null };
}

/* ─── Order creation (one order + one escrow per seller) ─── */
export async function createCheckoutOrders(
  buyerId: string,
  priced: PricedCheckout,
  address: Record<string, string>,
  payMethod: string
): Promise<{ checkoutId: string; orders: Order[] }> {
  const checkoutId = `CHK-${randomUUID().slice(0, 8).toUpperCase()}`;
  const created: Order[] = [];

  try {
    for (const g of priced.groups) {
      const items: OrderItem[] = g.lines.map((l) => ({
        id: randomUUID(),
        listingId: l.listing.id,
        title: l.listing.title,
        image: l.listing.images?.[0] || "📦",
        price: l.listing.price,
        qty: l.qty,
        seller: l.listing.sellerName,
        sellerId: l.listing.sellerId,
        shipping: l.shipping,
        courier: l.listing.shippingMethod || "Standard",
        condition: l.listing.condition,
      }));

      const order = await db.createOrder({
        buyerId,
        buyerName: `${address.firstName} ${address.lastName}`,
        items,
        status: "Pending payment",
        total: g.total,
        subtotal: g.subtotal,
        shipping: g.shipping,
        discount: g.discount,
        address,
        payMethod,
        courier: items[0]?.courier || "Standard",
        eta: "2–3 days",
        sellerId: g.sellerId,
        checkoutId,
        paymentStatus: "unpaid",
      });
      created.push(order);

      await db.createEscrow({
        orderId: order.id,
        buyerId,
        sellerId: g.sellerId,
        amount: order.total,
        status: "awaiting_payment",
        checkoutId,
      });
    }
  } catch (err) {
    // best-effort rollback (no DB transactions in the adapter interface)
    for (const o of created) {
      await db.updateOrderStatus(o.id, "Cancelled").catch(() => {});
    }
    throw err;
  }

  return { checkoutId, orders: created };
}