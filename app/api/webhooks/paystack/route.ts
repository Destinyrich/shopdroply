import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments/paystack";
import { settlePayment } from "@/lib/payments/service";

export const runtime = "nodejs"; // needs node:crypto

// POST /api/webhooks/paystack — called by Paystack, NOT by the browser (no login cookie here).
// Set this URL in Paystack Dashboard → Settings → API Keys & Webhooks.
export async function POST(req: NextRequest) {
  const raw = await req.text(); // signature is computed over the RAW body — don't req.json() first

  let valid = false;
  try {
    valid = verifyWebhookSignature(raw, req.headers.get("x-paystack-signature"));
  } catch (err) {
    console.error("[webhook] cannot verify signature:", err);
    return NextResponse.json({ received: false }, { status: 500 });
  }
  if (!valid) return NextResponse.json({ received: false }, { status: 401 });

  try {
    const event = JSON.parse(raw) as {
      event: string;
      data: { reference: string; amount: number; currency: string; id: number };
    };

    if (event.event === "charge.success") {
      await settlePayment({
        reference: event.data.reference,
        amountKobo: event.data.amount,
        currency: event.data.currency,
        providerTransactionId: String(event.data.id),
      });
    }
    // other events: acknowledge so Paystack stops retrying
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook] processing failed:", err);
    return NextResponse.json({ received: false }, { status: 500 }); // non-200 → Paystack retries
  }
}