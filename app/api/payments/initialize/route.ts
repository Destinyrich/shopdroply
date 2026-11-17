import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { OrderError } from "@/lib/orders";
import { PaymentError } from "@/lib/payments/paystack";
import { startPayment } from "@/lib/payments/service";
import type { ApiResponse } from "@/types";

// POST /api/buyer/payments/initialize  { checkoutId }  →  { authorizationUrl, reference }
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return auth.response;

  try {
    const { checkoutId } = await req.json();
    if (typeof checkoutId !== "string" || !checkoutId) {
      throw new OrderError("checkoutId is required");
    }
    const callbackBase = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const data = await startPayment({ id: auth.user.id, email: auth.user.email }, checkoutId, callbackBase);
    return NextResponse.json<ApiResponse>({ success: true, data });
  } catch (err) {
    if (err instanceof OrderError || err instanceof PaymentError) {
      return NextResponse.json<ApiResponse>({ success: false, error: err.message }, { status: err.status });
    }
    console.error("Initialize payment error:", err);
    return NextResponse.json<ApiResponse>({ success: false, error: "Could not start payment" }, { status: 500 });
  }
}