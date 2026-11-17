// ─────────────────────────────────────────────────────────────
// lib/shipping-db.ts
// Defaults + normalizer for Admin Shipping (full version).
// Types are defined in lib/db-interface.ts.
// ─────────────────────────────────────────────────────────────

import type {
  Courier,
  CourierApiStatus,
  ShippingZone,
  ShippingSettings,
} from "./db-interface";

// Types live in lib/db-interface.ts; re-exported here so existing imports keep working.
export type { Courier, CourierApiStatus, ShippingZone, ShippingSettings };

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  couriers: [
    { id: "courier-gig", name: "GIG Logistics", logo: "🚚", type: "Nationwide", coverage: "36 states", avgTime: "2-5 days", apiStatus: "connected", active: true },
    { id: "courier-fez", name: "Fez Delivery", logo: "📦", type: "Same-day / Express", coverage: "Lagos, Abuja, PH", avgTime: "Same day", apiStatus: "connected", active: true },
    { id: "courier-kwik", name: "Kwik Delivery", logo: "⚡", type: "Last-mile", coverage: "Lagos only", avgTime: "1-2 hours", apiStatus: "connected", active: false },
    { id: "courier-dhl", name: "DHL Nigeria", logo: "🌍", type: "International", coverage: "Global", avgTime: "5-10 days", apiStatus: "connected", active: true },
    { id: "courier-max", name: "MAX NG", logo: "🏍", type: "Same-day", coverage: "Lagos, Ibadan", avgTime: "Same day", apiStatus: "disconnected", active: false },
  ],
  zones: [
    { id: "zone-city", name: "Same city", description: "Buyer and seller in same city (e.g. Lagos → Lagos)", maxFee: 1500, minDays: 1, maxDays: 2, courierIds: ["courier-gig", "courier-fez", "courier-kwik"], active: true },
    { id: "zone-state", name: "Same state", description: "Different cities, same state (e.g. Ikeja → Ikorodu)", maxFee: 2500, minDays: 1, maxDays: 3, courierIds: ["courier-gig", "courier-fez"], active: true },
    { id: "zone-region", name: "Neighbouring states", description: "Adjacent states (e.g. Lagos → Ogun, Abuja → Nasarawa)", maxFee: 4000, minDays: 2, maxDays: 4, courierIds: ["courier-gig", "courier-dhl"], active: true },
    { id: "zone-national", name: "Nationwide", description: "Any state to any state across Nigeria", maxFee: 7000, minDays: 3, maxDays: 7, courierIds: ["courier-gig", "courier-dhl"], active: true },
    { id: "zone-remote", name: "Remote / Rural", description: "Areas outside major cities and state capitals", maxFee: 9000, minDays: 5, maxDays: 10, courierIds: ["courier-gig"], active: false },
    { id: "zone-intl", name: "International", description: "Cross-border shipping from Nigeria", maxFee: 50000, minDays: 7, maxDays: 14, courierIds: ["courier-dhl"], active: false },
  ],
};

/**
 * Fills in missing fields so data saved with the OLD shape
 * ({id,name,active} / {id,name,maxFee,active}) still loads.
 * Call this on every read in every adapter.
 */
export function normalizeShippingSettings(raw: Partial<ShippingSettings> | null | undefined): ShippingSettings {
  const couriers: Courier[] = (raw?.couriers ?? DEFAULT_SHIPPING_SETTINGS.couriers).map((c: any) => ({
    id: String(c.id),
    name: String(c.name ?? ""),
    logo: c.logo || "🚚",
    type: c.type ?? "",
    coverage: c.coverage ?? "",
    avgTime: c.avgTime ?? "",
    apiStatus: c.apiStatus === "connected" ? "connected" : "disconnected",
    active: !!c.active,
  }));

  const zones: ShippingZone[] = (raw?.zones ?? DEFAULT_SHIPPING_SETTINGS.zones).map((z: any) => ({
    id: String(z.id),
    name: String(z.name ?? ""),
    description: z.description ?? "",
    maxFee: typeof z.maxFee === "number" ? z.maxFee : 0,
    minDays: typeof z.minDays === "number" ? z.minDays : 1,
    maxDays: typeof z.maxDays === "number" ? z.maxDays : 3,
    courierIds: Array.isArray(z.courierIds) ? z.courierIds.map(String) : [],
    active: !!z.active,
  }));

  return { couriers, zones };
}

// ═════════════════════════════════════════════════════════════
// 1. lib/db-mongo-adapter.ts — one settings document, replaced wholesale
//    (adjust `this.db` to however your adapter exposes the Mongo Db):
//
//    async getShippingSettings() {
//      const doc = await this.db.collection("settings").findOne({ _id: "shipping" as any });
//      return normalizeShippingSettings(doc as any);
//    }
//    async updateShippingSettings(data: Partial<ShippingSettings>) {
//      const current = await this.getShippingSettings();
//      const next = normalizeShippingSettings({ ...current, ...data });
//      await this.db.collection("settings").updateOne(
//        { _id: "shipping" as any },
//        { $set: { couriers: next.couriers, zones: next.zones, updatedAt: new Date() } },
//        { upsert: true },
//      );
//      return next;
//    }
//
// 2. lib/db-postgres-adapter.ts — one jsonb row (adjust `this.pool` to your client):
//
//    -- migration
//    CREATE TABLE IF NOT EXISTS shipping_settings (
//      id          TEXT PRIMARY KEY DEFAULT 'shipping',
//      couriers    JSONB NOT NULL DEFAULT '[]',
//      zones       JSONB NOT NULL DEFAULT '[]',
//      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
//    );
//
//    async getShippingSettings() {
//      const { rows } = await this.pool.query(
//        "SELECT couriers, zones FROM shipping_settings WHERE id = 'shipping'",
//      );
//      return normalizeShippingSettings(rows[0]);
//    }
//    async updateShippingSettings(data: Partial<ShippingSettings>) {
//      const next = normalizeShippingSettings({ ...(await this.getShippingSettings()), ...data });
//      await this.pool.query(
//        `INSERT INTO shipping_settings (id, couriers, zones) VALUES ('shipping', $1, $2)
//         ON CONFLICT (id) DO UPDATE SET couriers = $1, zones = $2, updated_at = now()`,
//        [JSON.stringify(next.couriers), JSON.stringify(next.zones)],
//      );
//      return next;
//    }
// ═════════════════════════════════════════════════════════════