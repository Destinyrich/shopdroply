// lib/payments/service.ts
// Step 2 — start a payment, and turn a CONFIRMED payment into funded escrow.
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { OrderError, availableStock } from "@/lib/orders";
import type { Order, PaymentRecord } from "@/lib/db-interface";
import {
  PaymentError,
  initializeTransaction,
  refundTransaction,
  verifyTransaction,
} from "./paystack";

const REUSE_WINDOW_MS = 25 * 60 * 1000;
const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

/* ─────────────── 1. Start a payment ─────────────── */
export async function startPayment(
  user: { id: string; email: string },
  checkoutId: string,
  callbackBase: string
): Promise<{ authorizationUrl: string; reference: string }> {
  const all = await db.getOrdersByCheckout(checkoutId);
  const mine = all.filter((o) => o.buyerId === user.id);
  if (mine.length === 0) throw new OrderError("Checkout not found", 404);

  const unpaid = mine.filter((o) => o.status === "Pending payment");
  if (unpaid.length === 0) throw new OrderError("This checkout is already paid or was cancelled", 409);

  const amount = unpaid.reduce((s, o) => s + o.total, 0);
  const orderIds = unpaid.map((o) => o.id);

  // Reuse a recent open payment (stops "pay, close tab, retry" from charging twice)
  const latest = await db.getLatestPaymentByCheckout(checkoutId);
  if (
    latest &&
    latest.status === "initialized" &&
    latest.authorizationUrl &&
    latest.amount === amount &&
    Date.now() - new Date(latest.createdAt).getTime() < REUSE_WINDOW_MS
  ) {
    return { authorizationUrl: latest.authorizationUrl, reference: latest.reference };
  }

  const method = unpaid[0].payMethod;
  const reference = `SDP-${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
  const record = await db.createPayment({
    reference,
    checkoutId,
    buyerId: user.id,
    provider: "paystack",
    method,
    amount,
    currency: "NGN",
    status: "initialized",
    orderIds,
  });

  try {
    const init = await initializeTransaction({
      email: user.email,
      amountNaira: amount,
      reference,
      callbackUrl: `${callbackBase}/buyer/cart?checkout=${encodeURIComponent(checkoutId)}`,
      method,
      metadata: { checkoutId, orderIds },
    });
    await db.updatePayment(record.id, { authorizationUrl: init.authorizationUrl });
    return { authorizationUrl: init.authorizationUrl, reference };
  } catch (err) {
    await db.updatePayment(record.id, { status: "failed", failReason: "Could not start payment" });
    throw err;
  }
}

/* ─────────────── 2. Settle a confirmed payment ─────────────── */
export type SettleOutcome = "funded" | "already_funded" | "rejected" | "unknown_reference";

const inFlight = new Set<string>(); // in-process guard; the Postgres adapter should also use a conditional UPDATE

export async function settlePayment(input: {
  reference: string;
  amountKobo: number;
  currency: string;
  providerTransactionId?: string;
}): Promise<SettleOutcome> {
  const payment = await db.getPaymentByReference(input.reference);
  if (!payment) {
    console.error("[payments] confirmed payment for unknown reference", input.reference);
    return "unknown_reference";
  }
  if (payment.status === "success" || payment.status === "duplicate") return "already_funded";
  if (inFlight.has(payment.reference)) return "already_funded";
  inFlight.add(payment.reference);

  try {
    // Never trust the provider amount blindly: it must equal what WE expected to charge.
    if (input.amountKobo !== payment.amount * 100 || input.currency !== payment.currency) {
      console.error("[payments] amount mismatch", payment.reference, input.amountKobo, payment.amount * 100);
      await db.updatePayment(payment.id, { status: "failed", failReason: "Amount or currency mismatch" });
      return "rejected";
    }

    const orders = (await db.getOrdersByCheckout(payment.checkoutId)).filter((o) =>
      payment.orderIds.includes(o.id)
    );
    const pending = orders.filter((o) => o.status === "Pending payment");

    // Already funded by an earlier payment → this one is a duplicate charge: give the money back.
    if (pending.length === 0) {
      await db.updatePayment(payment.id, {
        status: "duplicate",
        paidAt: new Date().toISOString(),
        providerTransactionId: input.providerTransactionId,
      });
      await refundTransaction(payment.reference).catch((e) =>
        console.error("[payments] DUPLICATE CHARGE needs manual refund:", payment.reference, e)
      );
      return "already_funded";
    }

    // Claim the payment BEFORE side effects so a retried webhook can't fund twice.
    await db.updatePayment(payment.id, {
      status: "success",
      paidAt: new Date().toISOString(),
      providerTransactionId: input.providerTransactionId,
    });

    for (const order of pending) {
      try {
        await fundOrder(order, payment);
      } catch (err) {
        console.error("[payments] failed to fund order", order.id, err);
      }
    }

    // Remove only what was just bought from the cart
    const bought = new Set(pending.flatMap((o) => o.items.map((i) => i.listingId)));
    for (const listingId of bought) {
      await db.removeFromCart(payment.buyerId, listingId).catch(() => {});
    }
    return "funded";
  } finally {
    inFlight.delete(payment.reference);
  }
}

async function fundOrder(order: Order, payment: PaymentRecord) {
  // 1) stock check — two buyers can pay for the last item at the same moment
  const listings = await Promise.all(order.items.map((i) => db.getListingById(i.listingId)));
  const short = order.items.find((item, idx) => {
    const l = listings[idx];
    return !l || availableStock(l) < item.qty;
  });
  if (short) {
    await cancelAndRefund(order, payment, `"${short.title}" sold out before your payment cleared`);
    return;
  }

  // 2) take the stock
  for (let i = 0; i < order.items.length; i++) {
    const l = listings[i]!;
    const left = availableStock(l) - order.items[i].qty;
    await db.updateListing(l.id, { stock: left, ...(left <= 0 ? { status: "sold" as const } : {}) });
  }

  // 3) order → Processing, escrow → held
  await db.updateOrderStatus(order.id, "Processing", {
    paymentStatus: "paid",
    paymentReference: payment.reference,
  });
  const escrow = await db.getEscrowByOrder(order.id);
  const fundedAt = new Date().toISOString();
  if (escrow) {
    await db.updateEscrow(escrow.id, { status: "pending", fundedAt, paymentReference: payment.reference });
  } else {
    await db.createEscrow({
      orderId: order.id,
      buyerId: order.buyerId,
      sellerId: order.sellerId ?? order.items[0]?.sellerId ?? "unknown",
      amount: order.total,
      status: "pending",
      fundedAt,
      paymentReference: payment.reference,
    });
  }

  // 4) notify
  await db.createNotification({
    userId: order.buyerId,
    icon: "🛡️",
    title: "Payment received — held in escrow",
    body: `Your payment of ${naira(order.total)} for order ${order.id} is held safely until you confirm delivery.`,
    time: "Just now",
    unread: true,
  });
  if (order.sellerId) {
    await db.createNotification({
      userId: order.sellerId,
      icon: "💰",
      title: "New paid order — ship it",
      body: `Order ${order.id} (${naira(order.total)}) is paid and held in escrow. Ship it to get paid.`,
      time: "Just now",
      unread: true,
    });
    await db.createActivity({
      sellerId: order.sellerId,
      action: "New paid order",
      detail: `${order.id} · ${naira(order.total)}`,
      time: "Just now",
      icon: "💰",
      color: "#16A34A",
    });
  }
}

async function cancelAndRefund(order: Order, payment: PaymentRecord, reason: string) {
  const escrow = await db.getEscrowByOrder(order.id);
  try {
    await refundTransaction(payment.reference, order.total);
    await db.updateOrderStatus(order.id, "Cancelled", { paymentStatus: "refunded", paymentReference: payment.reference });
    if (escrow) await db.updateEscrow(escrow.id, { status: "refunded" });
    await db.createNotification({
      userId: order.buyerId,
      icon: "↩️",
      title: "Order cancelled — refund on the way",
      body: `${reason}. ${naira(order.total)} is being refunded to your original payment method.`,
      time: "Just now",
      unread: true,
    });
  } catch (err) {
    // Refund call failed → surface it to admins (shows in the disputes/escrow screens) instead of losing it.
    console.error("[payments] REFUND FAILED — manual action needed:", payment.reference, order.id, err);
    await db.updateOrderStatus(order.id, "dispute", { paymentStatus: "paid", paymentReference: payment.reference });
    if (escrow) await db.updateEscrow(escrow.id, { status: "disputed" });
  }
}

/* ─────────────── 3. Ask Paystack, then settle (used by verify route / polling) ─────────────── */
export async function refreshPayment(payment: PaymentRecord): Promise<PaymentRecord["status"]> {
  if (payment.status !== "initialized") return payment.status;
  try {
    const tx = await verifyTransaction(payment.reference);
    if (tx.status === "success") {
      await settlePayment({
        reference: payment.reference,
        amountKobo: tx.amount,
        currency: tx.currency,
        providerTransactionId: String(tx.id),
      });
    } else if (tx.status === "failed" || tx.status === "abandoned" || tx.status === "reversed") {
      await db.updatePayment(payment.id, {
        status: tx.status === "abandoned" ? "abandoned" : "failed",
        failReason: `Provider status: ${tx.status}`,
      });
    }
  } catch (err) {
    if (!(err instanceof PaymentError)) throw err;
    // provider unreachable / reference not found yet: treat as still pending
  }
  return (await db.getPaymentByReference(payment.reference))?.status ?? payment.status;
}