// lib/payments/paystack.ts
// Thin Paystack REST client. Server-only: never import this from a client component.
import { createHmac, timingSafeEqual } from "crypto";

const BASE = "https://api.paystack.co";

export class PaymentError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new PaymentError("Payments are not configured yet", 500);
  return key;
}

async function paystack<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null;
  if (!res.ok || !json?.status) {
    throw new PaymentError(json?.message || "Payment provider error", 502);
  }
  return json.data as T;
}

/** Map our pay-method ids to Paystack channels. Unknown methods show every channel enabled on your account. */
export function channelsFor(method: string): string[] | undefined {
  switch (method) {
    case "card":
      return ["card"];
    case "transfer":
      return ["bank_transfer", "bank"];
    case "ussd":
      return ["ussd"];
    default:
      return undefined; // opay / palmpay / bnpl need their own integrations later
  }
}

export async function initializeTransaction(input: {
  email: string;
  amountNaira: number;
  reference: string;
  callbackUrl: string;
  method: string;
  metadata?: Record<string, unknown>;
}) {
  const data = await paystack<{ authorization_url: string; access_code: string; reference: string }>(
    "/transaction/initialize",
    {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        amount: Math.round(input.amountNaira * 100), // kobo
        currency: "NGN",
        reference: input.reference,
        callback_url: input.callbackUrl,
        channels: channelsFor(input.method),
        metadata: input.metadata,
      }),
    }
  );
  return { authorizationUrl: data.authorization_url, accessCode: data.access_code, reference: data.reference };
}

export interface PaystackVerifyResult {
  status: string; // success | failed | abandoned | ongoing | pending | reversed
  amount: number; // kobo
  currency: string;
  reference: string;
  id: number;
}

export function verifyTransaction(reference: string) {
  return paystack<PaystackVerifyResult>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

export function refundTransaction(reference: string, amountNaira?: number) {
  return paystack<unknown>("/refund", {
    method: "POST",
    body: JSON.stringify({
      transaction: reference,
      ...(amountNaira ? { amount: Math.round(amountNaira * 100) } : {}),
    }),
  });
}

/** Paystack signs the RAW body with HMAC-SHA512 using your secret key (header: x-paystack-signature). */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", secretKey()).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}