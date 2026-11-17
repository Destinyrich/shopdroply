// lib/reports.ts
// Builds the Reports & Analytics numbers from your existing data.
// Everything is computed from db methods that already exist — no new tables.
//
// Definitions
//  • Revenue  = sum of Order.total for orders that aren't Cancelled (GMV)
//  • Orders   = count of those same orders
//  • Commission = sum of SellerEarning.commission recorded in the period
//  • Active sellers = distinct sellers with ≥ 1 such order in the period
//  • Dispute rate = disputes opened in the period ÷ orders in the period
//  • Dates use UTC day boundaries
//
// NOTE: this loads whole collections and aggregates in memory. Fine for the
// local adapter and moderate data; for large Mongo/Postgres datasets, move
// the aggregation into the database.

import type {
  DatabaseAdapter,
  Dispute,
  EscrowRecord,
  Listing,
  Order,
  PayoutRecord,
  SellerEarning,
  User,
} from "./db-interface";

const DAY = 86_400_000;

export type RangeKey = "7d" | "30d" | "90d" | "ytd" | "custom";
export const REPORT_TYPES = [
  "revenue", "orders", "users", "sellers", "listings", "payments", "shipping", "disputes", "reviews",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export interface ReportRange {
  key: RangeKey;
  from: number; // ms, inclusive
  to: number; // ms, inclusive
  label: string;
  days: number;
}

export interface ReportData {
  orders: Order[];
  users: User[];
  listings: Listing[];
  disputes: Dispute[];
  escrow: EscrowRecord[];
  payouts: PayoutRecord[];
  earnings: SellerEarning[];
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

// ─── Ranges ───
const startOfDay = (t: number) => {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};
const ymd = (t: number) => new Date(t).toISOString().slice(0, 10);

export function resolveRange(
  key: string | null,
  fromStr?: string | null,
  toStr?: string | null,
  now: number = Date.now()
): Result<ReportRange> {
  const todayStart = startOfDay(now);
  const k = (key || "30d") as RangeKey;

  if (k === "7d" || k === "30d" || k === "90d") {
    const n = k === "7d" ? 7 : k === "30d" ? 30 : 90;
    const from = todayStart - (n - 1) * DAY;
    return { ok: true, value: { key: k, from, to: todayStart + DAY - 1, label: `Last ${n} days`, days: n } };
  }

  if (k === "ytd") {
    const from = Date.UTC(new Date(now).getUTCFullYear(), 0, 1);
    const to = todayStart + DAY - 1;
    return { ok: true, value: { key: k, from, to, label: "Year to date", days: Math.round((to - from + 1) / DAY) } };
  }

  if (k === "custom") {
    const re = /^\d{4}-\d{2}-\d{2}$/;
    if (!fromStr || !toStr || !re.test(fromStr) || !re.test(toStr)) {
      return { ok: false, error: "Pick a start and end date" };
    }
    const from = Date.parse(`${fromStr}T00:00:00Z`);
    const to = Date.parse(`${toStr}T00:00:00Z`) + DAY - 1;
    if (Number.isNaN(from) || Number.isNaN(to)) return { ok: false, error: "Invalid date" };
    if (from > to) return { ok: false, error: "Start date must be before end date" };
    const days = Math.round((to - from + 1) / DAY);
    if (days > 366) return { ok: false, error: "Custom range can't be longer than 366 days" };
    return { ok: true, value: { key: k, from, to, label: `${fromStr} → ${toStr}`, days } };
  }

  return { ok: false, error: "Invalid range" };
}

// ─── Data loading ───
export async function loadReportData(db: DatabaseAdapter): Promise<ReportData> {
  const [orders, users, listings, disputes, escrow, payouts] = await Promise.all([
    db.getAllOrders(),
    db.getAllUsers(),
    db.getListings(),
    db.getDisputes(),
    db.getAllEscrow(),
    db.getAllPayouts(),
  ]);
  const sellerIds = users.filter((u) => u.role === "seller" || u.sellerStatus).map((u) => u.id);
  const earnings = (await Promise.all(sellerIds.map((id) => db.getSellerEarnings(id)))).flat();
  return { orders, users, listings, disputes, escrow, payouts, earnings };
}

// ─── Aggregation ───
const isCancelled = (o: Order) => String(o.status).toLowerCase() === "cancelled";
const ts = (iso?: string) => (iso ? Date.parse(iso) : NaN);
const inRange = (iso: string | undefined, from: number, to: number) => {
  const t = ts(iso);
  return t >= from && t <= to;
};

interface SellerAgg { name: string; sales: number; orders: Set<string> }

function aggregate(d: ReportData, from: number, to: number) {
  const orders = d.orders.filter((o) => inRange(o.createdAt, from, to) && !isCancelled(o));
  const sellerSales = new Map<string, SellerAgg>();
  let revenue = 0;
  for (const o of orders) {
    revenue += o.total || 0;
    for (const it of o.items || []) {
      const key = it.sellerId || it.seller;
      const cur = sellerSales.get(key) ?? { name: it.seller, sales: 0, orders: new Set<string>() };
      cur.sales += (it.price || 0) * (it.qty || 1);
      cur.orders.add(o.id);
      sellerSales.set(key, cur);
    }
  }
  return {
    orders,
    revenue,
    commission: d.earnings.filter((e) => inRange(e.createdAt, from, to)).reduce((s, e) => s + (e.commission || 0), 0),
    newUsers: d.users.filter((u) => inRange(u.createdAt, from, to)).length,
    newListings: d.listings.filter((l) => inRange(l.createdAt, from, to)).length,
    disputes: d.disputes.filter((x) => inRange(x.createdAt, from, to)).length,
    sellerSales,
  };
}

const pct = (cur: number, prev: number): number | null =>
  prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null;

export interface Kpi {
  value: number;
  prev: number;
  change: number | null; // % change (or percentage-points for disputeRate); null = no baseline
}
const kpi = (value: number, prev: number): Kpi => ({ value, prev, change: pct(value, prev) });

// ─── Trend buckets ───
type Granularity = "day" | "week" | "month";
interface Bucket { start: number; end: number; label: string }

function makeBuckets(from: number, to: number): { granularity: Granularity; buckets: Bucket[] } {
  const days = Math.round((to - from + 1) / DAY);
  const fmt = (t: number, opts: Intl.DateTimeFormatOptions) =>
    new Date(t).toLocaleDateString("en-NG", { ...opts, timeZone: "UTC" });
  const buckets: Bucket[] = [];

  if (days <= 14) {
    for (let t = from; t <= to; t += DAY) buckets.push({ start: t, end: Math.min(t + DAY - 1, to), label: fmt(t, { day: "numeric", month: "short" }) });
    return { granularity: "day", buckets };
  }
  if (days <= 92) {
    for (let t = from; t <= to; t += 7 * DAY) buckets.push({ start: t, end: Math.min(t + 7 * DAY - 1, to), label: fmt(t, { day: "numeric", month: "short" }) });
    return { granularity: "week", buckets };
  }
  let t = from;
  while (t <= to) {
    const d = new Date(t);
    const monthEnd = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - 1;
    buckets.push({ start: t, end: Math.min(monthEnd, to), label: fmt(t, { month: "short", year: "2-digit" }) });
    t = monthEnd + 1;
  }
  return { granularity: "month", buckets };
}

// ─── Overview ───
export function buildOverview(d: ReportData, range: ReportRange) {
  const len = range.to - range.from + 1;
  const prevFrom = range.from - len;
  const prevTo = range.from - 1;

  const cur = aggregate(d, range.from, range.to);
  const prev = aggregate(d, prevFrom, prevTo);

  const aov = cur.orders.length ? Math.round(cur.revenue / cur.orders.length) : 0;
  const prevAov = prev.orders.length ? Math.round(prev.revenue / prev.orders.length) : 0;
  const rate = cur.orders.length ? (cur.disputes / cur.orders.length) * 100 : 0;
  const prevRate = prev.orders.length ? (prev.disputes / prev.orders.length) * 100 : 0;
  const round1 = (n: number) => Math.round(n * 10) / 10;

  // Trend
  const { granularity, buckets } = makeBuckets(range.from, range.to);
  const points = buckets.map((b) => ({ label: b.label, revenue: 0, orders: 0, commission: 0, newUsers: 0 }));
  const idx = (t: number) => buckets.findIndex((b) => t >= b.start && t <= b.end);
  for (const o of cur.orders) {
    const i = idx(ts(o.createdAt));
    if (i >= 0) { points[i].revenue += o.total || 0; points[i].orders += 1; }
  }
  for (const e of d.earnings) {
    if (!inRange(e.createdAt, range.from, range.to)) continue;
    const i = idx(ts(e.createdAt));
    if (i >= 0) points[i].commission += e.commission || 0;
  }
  for (const u of d.users) {
    if (!inRange(u.createdAt, range.from, range.to)) continue;
    const i = idx(ts(u.createdAt));
    if (i >= 0) points[i].newUsers += 1;
  }

  // Top sellers
  const ratingBySeller = new Map<string, number[]>();
  for (const l of d.listings) {
    if (typeof l.sellerRating === "number" && l.sellerRating > 0) {
      ratingBySeller.set(l.sellerId, [...(ratingBySeller.get(l.sellerId) ?? []), l.sellerRating]);
    }
  }
  const topSellers = Array.from(cur.sellerSales.entries())
    .sort((a, b) => b[1].sales - a[1].sales)
    .slice(0, 5)
    .map(([id, s]) => {
      const r = ratingBySeller.get(id);
      return {
        id,
        name: s.name,
        sales: s.sales,
        orders: s.orders.size,
        rating: r?.length ? round1(r.reduce((a, b) => a + b, 0) / r.length) : null,
        trend: pct(s.sales, prev.sellerSales.get(id)?.sales ?? 0),
      };
    });

  // Revenue by category (top 5 + Others)
  const listingById = new Map(d.listings.map((l) => [l.id, l]));
  const cat = new Map<string, { revenue: number; orders: Set<string> }>();
  for (const o of cur.orders) {
    for (const it of o.items || []) {
      const name = listingById.get(it.listingId)?.category || "Uncategorised";
      const c = cat.get(name) ?? { revenue: 0, orders: new Set<string>() };
      c.revenue += (it.price || 0) * (it.qty || 1);
      c.orders.add(o.id);
      cat.set(name, c);
    }
  }
  const catTotal = Array.from(cat.values()).reduce((s, c) => s + c.revenue, 0);
  const sorted = Array.from(cat.entries()).sort((a, b) => b[1].revenue - a[1].revenue);
  const toRow = (name: string, revenue: number, orders: number) => ({
    name, revenue, orders, share: catTotal ? round1((revenue / catTotal) * 100) : 0,
  });
  const categories = sorted.slice(0, 5).map(([n, c]) => toRow(n, c.revenue, c.orders.size));
  const rest = sorted.slice(5);
  if (rest.length) {
    const allOrders = new Set<string>();
    rest.forEach(([, c]) => c.orders.forEach((x) => allOrders.add(x)));
    categories.push(toRow("Others", rest.reduce((s, [, c]) => s + c.revenue, 0), allOrders.size));
  }

  return {
    range: { key: range.key, from: ymd(range.from), to: ymd(range.to), label: range.label, days: range.days },
    kpis: {
      revenue: kpi(cur.revenue, prev.revenue),
      orders: kpi(cur.orders.length, prev.orders.length),
      commission: kpi(cur.commission, prev.commission),
      avgOrderValue: kpi(aov, prevAov),
      newUsers: kpi(cur.newUsers, prev.newUsers),
      activeSellers: kpi(cur.sellerSales.size, prev.sellerSales.size),
      newListings: kpi(cur.newListings, prev.newListings),
      // change = percentage-point difference, not a % change
      disputeRate: { value: round1(rate), prev: round1(prevRate), change: round1(rate - prevRate) } as Kpi,
    },
    listingsLive: d.listings.filter((l) => l.status === "active").length,
    trend: { granularity, points },
    topSellers,
    categories,
    generatedAt: new Date().toISOString(),
  };
}

// ─── CSV ───
type Cell = string | number | null | undefined;

function csvCell(v: Cell): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  // stop spreadsheet formula injection from user-supplied text (names, reasons…)
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const toCsv = (rows: Cell[][]) => "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
const dt = (iso?: string) => (iso && !Number.isNaN(Date.parse(iso)) ? new Date(iso).toISOString().slice(0, 16).replace("T", " ") : "");

export function buildCsv(type: ReportType, d: ReportData, range: ReportRange): { filename: string; csv: string } | null {
  const { from, to } = range;
  const within = <T extends { createdAt: string }>(xs: T[]) => xs.filter((x) => inRange(x.createdAt, from, to));
  let rows: Cell[][];

  switch (type) {
    case "revenue": {
      const days: Record<string, { orders: number; revenue: number; commission: number; newUsers: number }> = {};
      for (let t = from; t <= to; t += DAY) days[ymd(t)] = { orders: 0, revenue: 0, commission: 0, newUsers: 0 };
      for (const o of within(d.orders)) if (!isCancelled(o)) { const r = days[ymd(ts(o.createdAt))]; if (r) { r.orders++; r.revenue += o.total || 0; } }
      for (const e of within(d.earnings)) { const r = days[ymd(ts(e.createdAt))]; if (r) r.commission += e.commission || 0; }
      for (const u of within(d.users)) { const r = days[ymd(ts(u.createdAt))]; if (r) r.newUsers++; }
      rows = [["Date", "Orders", "Revenue (NGN)", "Commission (NGN)", "New users"],
        ...Object.entries(days).map(([k, v]) => [k, v.orders, v.revenue, v.commission, v.newUsers])];
      break;
    }
    case "orders":
      rows = [["Order ID", "Date (UTC)", "Buyer", "Status", "Items", "Subtotal", "Shipping", "Discount", "Total", "Courier", "Payment method"],
        ...within(d.orders).map((o) => [o.id, dt(o.createdAt), o.buyerName, o.status, (o.items || []).reduce((s, i) => s + (i.qty || 1), 0), o.subtotal, o.shipping, o.discount, o.total, o.courier, o.payMethod])];
      break;
    case "users":
      rows = [["User ID", "Name", "Email", "Role", "Account status", "Seller status", "Joined (UTC)"],
        ...within(d.users).map((u) => [u.id, u.name, u.email, u.role ?? "buyer", u.accountStatus ?? "active", u.sellerStatus ?? "", dt(u.createdAt)])];
      break;
    case "sellers": {
      const agg = aggregate(d, from, to).sellerSales;
      const commissionBySeller = new Map<string, number>();
      for (const e of within(d.earnings)) commissionBySeller.set(e.sellerId, (commissionBySeller.get(e.sellerId) ?? 0) + (e.commission || 0));
      rows = [["Seller ID", "Seller", "Orders", "Sales (NGN)", "Commission (NGN)"],
        ...Array.from(agg.entries()).sort((a, b) => b[1].sales - a[1].sales).map(([id, s]) => [id, s.name, s.orders.size, s.sales, commissionBySeller.get(id) ?? 0])];
      break;
    }
    case "listings":
      rows = [["Listing ID", "Title", "Category", "Seller", "Type", "Price (NGN)", "Status", "Views", "Watchers", "Created (UTC)"],
        ...within(d.listings).map((l) => [l.id, l.title, l.category, l.sellerName, l.type, l.price, l.status, l.views ?? 0, l.watchers ?? 0, dt(l.createdAt)])];
      break;
    case "payments":
      rows = [["Type", "ID", "Date (UTC)", "Amount (NGN)", "Status", "Reference"],
        ...within(d.escrow).map((e) => ["Escrow", e.id, dt(e.createdAt), e.amount, e.status, e.orderId]),
        ...within(d.payouts).map((p) => ["Payout", p.id, dt(p.createdAt), p.amount, p.status, p.sellerName ?? p.sellerId])];
      break;
    case "shipping": {
      const by = new Map<string, { orders: number; delivered: number; cancelled: number; fees: number }>();
      for (const o of within(d.orders)) {
        const k = o.courier || "Unspecified";
        const r = by.get(k) ?? { orders: 0, delivered: 0, cancelled: 0, fees: 0 };
        r.orders++;
        if (String(o.status).toLowerCase() === "delivered") r.delivered++;
        if (isCancelled(o)) r.cancelled++; else r.fees += o.shipping || 0;
        by.set(k, r);
      }
      rows = [["Courier", "Orders", "Delivered", "Cancelled", "Shipping fees (NGN)", "Avg fee (NGN)"],
        ...Array.from(by.entries()).map(([k, r]) => [k, r.orders, r.delivered, r.cancelled, r.fees, r.orders - r.cancelled ? Math.round(r.fees / (r.orders - r.cancelled)) : 0])];
      break;
    }
    case "disputes":
      rows = [["Dispute ID", "Order", "Opened (UTC)", "Buyer", "Seller", "Item", "Amount (NGN)", "Status", "Priority", "Reason"],
        ...within(d.disputes).map((x) => [x.id, x.orderId, dt(x.createdAt), x.buyerName, x.sellerName, x.item, x.amount, x.status, x.priority, x.reason])];
      break;
    default:
      return null; // "reviews": no review data exists yet
  }

  return { filename: `shopdroply-${type}-${ymd(from)}_${ymd(to)}.csv`, csv: toCsv(rows) };
}
