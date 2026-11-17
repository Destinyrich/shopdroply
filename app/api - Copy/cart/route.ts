import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  // Try common session cookie names — adjust if your auth uses a different name
  const token = cookieStore.get("session")?.value 
    || cookieStore.get("token")?.value
    || cookieStore.get("auth-token")?.value;
  
  if (!token) return null;
  const session = await db.getSession(token);
  return session?.userId || null;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await db.getCartByUser(userId);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const item = await db.addToCart({ ...body, userId });
  return NextResponse.json({ item, success: true });
}

export async function PATCH(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listingId, qty, courierId, shipping } = await req.json();
  const updated = await db.updateCartItem(userId, listingId, { qty, courierId, shipping });
  return NextResponse.json({ item: updated });
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listingId } = await req.json();
  await db.removeFromCart(userId, listingId);
  return NextResponse.json({ success: true });
}