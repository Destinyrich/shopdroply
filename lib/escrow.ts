// lib/escrow.ts
// Step 5 — commission, releasing escrow to the seller, refunding the buyer, opening a dispute.
// Money rules (change them here, nowhere else):
//   • Commission = category rate × ITEM price only. Shipping is never commissioned.
//   • Seller receives  items − commission + shipping.
//   • Coupon discounts are paid by Shopdroply, not the seller (see STEP5-NOTES.md, decision #1).
import { db } from "@/lib/db";
import type { Dispute, Order } from "@/lib/db-interface";
import { OrderError, availableStock } from "@/lib/orders";
import { refundTransaction } from "@/lib/payments/paystack";

const DEFAULT_RATE = 0.1; // used if a listing's category can't be found
const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

/* ─────────────── Commission ─────────────── */

/** Categories store a FRACTION (0.08 = 8%), but an admin screen could save "8". Accept both. */
export function normalizeRate(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_RATE;
  const fraction = n >= 1 ? n / 100 : n;
  return Math.min(fraction, 0.5); // never more than 50%, even if someone mistypes
}

export async function calculateCommission(order: Order): Promise<number> {
  const categories = await db.getCategories();
  let total = 0;

  for (const item of order.items) {
    const listing = await db.getListingById(item.listingId);
    const key = listing?.category?.toLowerCase();
    const cat = key
      ? categories.find((c) => c.name.toLowerCase() === key || c.slug.toLowerCase() === key)
      : undefined;

    const line = item.price * item.qty; // item price only, never shipping
    let fee = Math.round(line * (cat ? normalizeRate(cat.commissionRate) : DEFAULT_RATE));
    if (cat?.feeCap && cat.feeCap > 0) fee = Math.min(fee, cat.feeCap); // e.g. vehicles max ₦100,000
    if (cat?.feeMin && cat.feeMin > 0) fee = Math.max(fee, cat.feeMin);
    total += Math.min(fee, line); // commission can never exceed the item price
  }
  return total;
}

/* ─────────────── Release escrow → seller ─────────────── */

export interface ReleaseResult {
  orderId: string;
  commission: number;
  sellerNet: number;
  alreadyReleased: boolean;
}

const releasing = new Set<string>(); // in-process guard; the Postgres adapter should use a conditional UPDATE

export async function releaseEscrow(orderId: string, by: "buyer" | "admin" | "system"): Promise<ReleaseResult> {
  if (releasing.has(orderId)) throw new OrderError("This order is already being processed", 409);
  releasing.add(orderId);

  try {
    const order = await db.getOrderById(orderId);
    if (!order) throw new OrderError("Order not found", 404);
    const escrow = await db.getEscrowByOrder(orderId);
    if (!escrow) throw new OrderError("No escrow found for this order", 404);

    const gross = order.subtotal + order.shipping;

    if (escrow.status === "released") {
      const commission = escrow.commission ?? 0;
      return { orderId, commission, sellerNet: gross - commission, alreadyReleased: true };
    }

    // Admins may release a disputed escrow (dispute decided in the seller's favour)
    const allowed = by === "admin" ? ["pending", "disputed"] : ["pending"];
    if (!allowed.includes(escrow.status)) {
      throw new OrderError(`Funds can't be released while escrow is "${escrow.status}"`, 409);
    }
    if (order.paymentStatus && order.paymentStatus !== "paid") {
      throw new OrderError("This order has not been paid", 409);
    }

    // Older orders may have escrow.sellerId = "unknown": fall back to the item's seller
    const sellerId =
      escrow.sellerId && escrow.sellerId !== "unknown"
        ? escrow.sellerId
        : (order.sellerId ?? order.items[0]?.sellerId);
    if (!sellerId) throw new OrderError("Cannot work out who to pay for this order", 409);

    const commission = await calculateCommission(order);
    const net = gross - commission;

    // Claim the escrow BEFORE paying out so a double-click or retry can't pay twice
    const previous = escrow.status;
    await db.updateEscrow(escrow.id, { status: "released", commission });

    try {
      const existing = (await db.getSellerEarnings(sellerId)).some((e) => e.orderId === orderId);
      if (!existing) {
        await db.createEarning({
          sellerId,
          orderId,
          amount: gross,
          commission,
          netAmount: net,
          status: "available",
          description: `Order ${orderId}`,
        });
      }
    } catch (err) {
      await db.updateEscrow(escrow.id, { status: previous }); // undo the claim
      throw err;
    }

    await db.updateOrderStatus(orderId, "Confirm receipt");

    await db.createNotification({
      userId: sellerId,
      icon: "💸",
      title: "Payment released to you",
      body: `${naira(net)} from order ${orderId} is now in your available balance (${naira(commission)} commission deducted).`,
      time: "Just now",
      unread: true,
    });
    await db.createNotification({
      userId: order.buyerId,
      icon: "✅",
      title: "Order complete",
      body: `Thanks for confirming order ${orderId}. Your payment has been released to the seller.`,
      time: "Just now",
      unread: true,
    });
    await db.createActivity({
      sellerId,
      action: "Payment released",
      detail: `${orderId} · ${naira(net)}`,
      time: "Just now",
      icon: "💸",
      color: "#16A34A",
    });

    return { orderId, commission, sellerNet: net, alreadyReleased: false };
  } finally {
    releasing.delete(orderId);
  }
}

/* ─────────────── Refund escrow → buyer ─────────────── */

const refunding = new Set<string>();

export async function refundEscrow(
  orderId: string,
  reason: string,
  by: "seller" | "admin" | "system"
): Promise<void> {
  if (refunding.has(orderId)) throw new OrderError("This order is already being processed", 409);
  refunding.add(orderId);

  try {
    const order = await db.getOrderById(orderId);
    if (!order) throw new OrderError("Order not found", 404);
    const escrow = await db.getEscrowByOrder(orderId);
    if (!escrow) throw new OrderError("No escrow found for this order", 404);
    if (escrow.status === "refunded") return; // already done

    const allowed = by === "admin" ? ["pending", "disputed"] : ["pending"];
    if (!allowed.includes(escrow.status)) {
      throw new OrderError(`This order can't be refunded while escrow is "${escrow.status}"`, 409);
    }

    const payment = order.paymentReference ? await db.getPaymentByReference(order.paymentReference) : null;
    if (!payment) {
      throw new OrderError(
        "There is no payment on record for this order, so it can't be refunded automatically. Please contact support.",
        409
      );
    }

    // Provider first: if Paystack refuses, nothing in our database changes
    await refundTransaction(payment.reference, order.total);

    await db.updateEscrow(escrow.id, { status: "refunded" });
    await db.updateOrderStatus(orderId, "Cancelled", { paymentStatus: "refunded" });
    await restockItems(order);

    await db.createNotification({
      userId: order.buyerId,
      icon: "↩️",
      title: "Order cancelled — refund on the way",
      body: `${reason}. ${naira(order.total)} is being refunded to your original payment method.`,
      time: "Just now",
      unread: true,
    });
    const sellerId = order.sellerId ?? order.items[0]?.sellerId;
    if (sellerId) {
      await db.createNotification({
        userId: sellerId,
        icon: "❌",
        title: "Order cancelled",
        body: `Order ${orderId} was cancelled and refunded to the buyer.`,
        time: "Just now",
        unread: true,
      });
    }
  } finally {
    refunding.delete(orderId);
  }
}

async function restockItems(order: Order) {
  for (const item of order.items) {
    const listing = await db.getListingById(item.listingId);
    if (!listing) continue;
    await db.updateListing(listing.id, {
      stock: availableStock(listing) + item.qty,
      ...(listing.status === "sold" ? { status: "active" as const } : {}),
    });
  }
}

/* ─────────────── Buyer opens a dispute ─────────────── */

export async function openDispute(input: {
  order: Order;
  buyerName: string;
  reason: string;
  description?: string;
}): Promise<Dispute> {
  const { order } = input;

  const escrow = await db.getEscrowByOrder(order.id);
  if (!escrow || escrow.status !== "pending") {
    throw new OrderError("This order has no funds held in escrow to dispute", 409);
  }
  const existing = await db.getDisputeByOrder(order.id);
  if (existing && existing.status !== "resolved") {
    throw new OrderError("A dispute is already open for this order", 409);
  }

  // Freeze the money FIRST, so the seller can't be paid while the dispute is being created
  const previousOrderStatus = order.status;
  await db.updateEscrow(escrow.id, { status: "disputed" });

  let dispute: Dispute;
  try {
    await db.updateOrderStatus(order.id, "dispute");
    const first = order.items[0];
    dispute = await db.createDispute({
      orderId: order.id,
      buyerId: order.buyerId,
      buyerName: input.buyerName,
      sellerId: order.sellerId ?? first?.sellerId,
      sellerName: first?.seller ?? "Seller",
      item: first ? first.title + (order.items.length > 1 ? ` +${order.items.length - 1} more` : "") : "Order",
      image: first?.image,
      amount: order.total,
      reason: input.description ? `${input.reason} — ${input.description}` : input.reason,
      status: "open",
      priority: order.total >= 100_000 ? "high" : order.total >= 20_000 ? "medium" : "low",
      buyerEvidence: [],
    });
  } catch (err) {
    await db.updateEscrow(escrow.id, { status: "pending" }); // undo the freeze
    await db.updateOrderStatus(order.id, previousOrderStatus);
    throw err;
  }

  const sellerId = order.sellerId ?? order.items[0]?.sellerId;
  if (sellerId) {
    await db.createNotification({
      userId: sellerId,
      icon: "⚖️",
      title: "A buyer opened a dispute",
      body: `Order ${order.id} (${naira(order.total)}) is under review. Payment is on hold until it is resolved.`,
      time: "Just now",
      unread: true,
    });
  }
  await db.createNotification({
    userId: order.buyerId,
    icon: "🛡️",
    title: "Dispute received",
    body: `We're reviewing order ${order.id}. Your payment stays protected in escrow.`,
    time: "Just now",
    unread: true,
  });
  return dispute;
}