import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  OrderError,
  assertBuyable,
  capShipping,
  getShippingCap,
  parseQty,
} from "@/lib/orders";
import type { ApiResponse } from "@/types";

function fail(err: unknown, fallback: string) {
  if (err instanceof OrderError) {
    return NextResponse.json<ApiResponse>({ success: false, error: err.message }, { status: err.status });
  }
  console.error(fallback, err);
  return NextResponse.json<ApiResponse>({ success: false, error: fallback }, { status: 500 });
}

// The cart page sends the cart-row id (itemId / id); other callers send listingId. Accept both,
// and always resolve against the CURRENT USER's cart so nobody can touch another user's rows.
async function findCartItem(userId: string, p: { listingId?: string | null; itemId?: string | null }) {
  const cart = await db.getCartByUser(userId);
  return (
    cart.find(
      (i) => (p.listingId && i.listingId === p.listingId) || (p.itemId && i.id === p.itemId)
    ) ?? null
  );
}

/* ─── GET cart (prices + shipping refreshed from the live listing) ─── */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return auth.response;

  try {
    const [items, cap] = await Promise.all([db.getCartByUser(auth.user.id), getShippingCap()]);
    const fresh = await Promise.all(
      items.map(async (item) => {
        const listing = await db.getListingById(item.listingId);
        if (!listing) return item;
        return {
          ...item,
          price: listing.price,
          shipping: capShipping(listing.shippingFee, cap),
        };
      })
    );
    return NextResponse.json<ApiResponse>({ success: true, data: fresh });
  } catch (err) {
    return fail(err, "Failed to load cart");
  }
}

/* ─── POST add to cart ─── */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return auth.response;

  try {
    const body = await req.json();
    const { listingId, courierId = 0 } = body;
    if (!listingId) throw new OrderError("listingId is required");
    const qty = parseQty(body.qty ?? 1);

    const listing = await db.getListingById(listingId);
    if (!listing) throw new OrderError("Listing not found", 404);
    const existing = await findCartItem(auth.user.id, { listingId });
    const newQty = (existing?.qty ?? 0) + qty;
    assertBuyable(listing, auth.user.id, newQty);

    if (existing) {
      const updated = await db.updateCartItem(auth.user.id, listingId, { qty: newQty });
      return NextResponse.json<ApiResponse>({ success: true, data: updated, message: "Quantity updated" });
    }

    const cap = await getShippingCap();
    const item = await db.addToCart({
      userId: auth.user.id,
      listingId,
      title: listing.title,
      image: listing.images?.[0] || "📦",
      price: listing.price,
      qty,
      seller: listing.sellerName,
      shipping: capShipping(listing.shippingFee, cap),
      courierId,
      condition: listing.condition,
    });
    return NextResponse.json<ApiResponse>({ success: true, data: item });
  } catch (err) {
    return fail(err, "Failed to add to cart");
  }
}

/* ─── PATCH update qty / courier (shipping is NEVER accepted from the client) ─── */
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return auth.response;

  try {
    const body = await req.json();
    const item = await findCartItem(auth.user.id, {
      listingId: body.listingId,
      itemId: body.itemId ?? body.id,
    });
    if (!item) throw new OrderError("Item not in cart", 404);

    const patch: { qty?: number; courierId?: number } = {};
    if (body.qty !== undefined) {
      const qty = parseQty(body.qty);
      const listing = await db.getListingById(item.listingId);
      assertBuyable(listing, auth.user.id, qty);
      patch.qty = qty;
    }
    if (typeof body.courierId === "number") patch.courierId = body.courierId;

    const updated = await db.updateCartItem(auth.user.id, item.listingId, patch);
    return NextResponse.json<ApiResponse>({ success: true, data: updated });
  } catch (err) {
    return fail(err, "Failed to update cart");
  }
}

/* ─── DELETE remove one item (?listingId= or ?id=) or empty the cart (?all=true) ─── */
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return auth.response;

  try {
    const sp = req.nextUrl.searchParams;

    if (sp.get("all") === "true") {
      await db.clearCart(auth.user.id);
      return NextResponse.json<ApiResponse>({ success: true, message: "Cart cleared" });
    }

    const item = await findCartItem(auth.user.id, {
      listingId: sp.get("listingId"),
      itemId: sp.get("id"),
    });
    if (!item) throw new OrderError("Item not in cart", 404);

    await db.removeFromCart(auth.user.id, item.listingId);
    return NextResponse.json<ApiResponse>({ success: true, message: "Item removed" });
  } catch (err) {
    return fail(err, "Failed to remove item");
  }
}