import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { refreshPayment } from "@/lib/payments/service";
import type { ApiResponse } from "@/types";

// GET /api/buyer/payments/verify?checkoutId=CHK-XXXX   (or ?reference=SDP-XXXX)
// Used when the buyer returns from Paystack AND for polling. Works even if the webhook is late/unreachable.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return auth.response;

  try {
    const sp = req.nextUrl.searchParams;
    const reference = sp.get("reference");
    const checkoutId = sp.get("checkoutId");

    const payment = reference
      ? await db.getPaymentByReference(reference)
      : checkoutId
        ? await db.getLatestPaymentByCheckout(checkoutId)
        : null;

    // 404 for both "doesn't exist" and "not yours" so IDs can't be probed
    if (!payment || payment.buyerId !== auth.user.id) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Payment not found" }, { status: 404 });
    }

    const status = await refreshPayment(payment);
    const orders = (await db.getOrdersByCheckout(payment.checkoutId)).filter((o) => o.buyerId === auth.user.id);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        status, // initialized | success | failed | abandoned | duplicate
        checkoutId: payment.checkoutId,
        reference: payment.reference,
        orders: orders.map((o) => ({ id: o.id, status: o.status, total: o.total, paymentStatus: o.paymentStatus })),
      },
    });
  } catch (err) {
    console.error("Verify payment error:", err);
    return NextResponse.json<ApiResponse>({ success: false, error: "Could not check payment" }, { status: 500 });
  }
}