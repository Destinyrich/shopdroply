import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.response) return auth.response;

    const { phone } = await req.json();
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Valid phone number required" },
        { status: 400 }
      );
    }

    const code = await db.createOTP(phone);

    // ═══ DEVELOPMENT: OTP prints in your terminal ═══
    console.log(`\n╔════════════════════════════════════╗`);
    console.log(`║  🔐 DEV OTP for ${phone.padEnd(14)} ║`);
    console.log(`║     Code: ${code}                    ║`);
    console.log(`╚════════════════════════════════════╝\n`);

    // ═══ WHATSAPP (optional) ═══
    // Uncomment when you add Twilio keys to .env.local
    // try {
    //   const { sendWhatsAppOTP } = await import("@/lib/whatsapp");
    //   await sendWhatsAppOTP(phone, code);
    // } catch (err) {
    //   console.log("WhatsApp failed, but OTP is in terminal above");
    // }

    return NextResponse.json<ApiResponse>({ success: true, message: "OTP sent" });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to send OTP" },
      { status: 500 }
    );
  }
}