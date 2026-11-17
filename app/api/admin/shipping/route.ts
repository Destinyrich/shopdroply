import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";
import type { Courier, ShippingZone } from "@/lib/shipping-db";

type Result<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Validates + whitelists courier fields (unknown keys are dropped). */
function cleanCouriers(input: unknown): Result<Courier[]> {
  if (!Array.isArray(input)) return { error: "couriers must be an array" };

  const ids = new Set<string>();
  const names = new Set<string>();
  const out: Courier[] = [];

  for (const c of input as any[]) {
    const id = str(c?.id);
    const name = str(c?.name);
    if (!id) return { error: "Every courier needs an id" };
    if (!name) return { error: "Every courier needs a name" };
    if (typeof c.active !== "boolean") return { error: `Courier "${name}": active must be true/false` };
    if (c.apiStatus !== "connected" && c.apiStatus !== "disconnected") {
      return { error: `Courier "${name}": apiStatus must be "connected" or "disconnected"` };
    }
    if (ids.has(id)) return { error: `Duplicate courier id: ${id}` };
    if (names.has(name.toLowerCase())) return { error: `Duplicate courier name: ${name}` };
    ids.add(id);
    names.add(name.toLowerCase());

    out.push({
      id,
      name,
      logo: str(c.logo) || "🚚",
      type: str(c.type),
      coverage: str(c.coverage),
      avgTime: str(c.avgTime),
      apiStatus: c.apiStatus,
      active: c.active,
    });
  }
  return { data: out };
}

/** Validates + whitelists zone fields. courierIds must exist in `knownCourierIds`. */
function cleanZones(input: unknown, knownCourierIds: Set<string>): Result<ShippingZone[]> {
  if (!Array.isArray(input)) return { error: "zones must be an array" };

  const ids = new Set<string>();
  const names = new Set<string>();
  const out: ShippingZone[] = [];

  for (const z of input as any[]) {
    const id = str(z?.id);
    const name = str(z?.name);
    if (!id) return { error: "Every zone needs an id" };
    if (!name) return { error: "Every zone needs a name" };
    if (typeof z.active !== "boolean") return { error: `Zone "${name}": active must be true/false` };
    if (!isInt(z.maxFee) || z.maxFee < 0) return { error: `Zone "${name}": maxFee must be a whole number ≥ 0` };
    if (!isInt(z.minDays) || z.minDays < 0) return { error: `Zone "${name}": minDays must be a whole number ≥ 0` };
    if (!isInt(z.maxDays) || z.maxDays < 0) return { error: `Zone "${name}": maxDays must be a whole number ≥ 0` };
    if (z.minDays > z.maxDays) return { error: `Zone "${name}": minDays cannot be greater than maxDays` };
    if (!Array.isArray(z.courierIds) || z.courierIds.some((x: unknown) => typeof x !== "string")) {
      return { error: `Zone "${name}": courierIds must be an array of courier ids` };
    }
    const unknown = (z.courierIds as string[]).find((cid) => !knownCourierIds.has(cid));
    if (unknown) return { error: `Zone "${name}": unknown courier "${unknown}"` };
    if (ids.has(id)) return { error: `Duplicate zone id: ${id}` };
    if (names.has(name.toLowerCase())) return { error: `Duplicate zone name: ${name}` };
    ids.add(id);
    names.add(name.toLowerCase());

    out.push({
      id,
      name,
      description: str(z.description),
      maxFee: z.maxFee,
      minDays: z.minDays,
      maxDays: z.maxDays,
      courierIds: Array.from(new Set<string>(z.courierIds)),
      active: z.active,
    });
  }
  return { data: out };
}

/** GET /api/admin/shipping — couriers + zones (fee caps, delivery days, allowed couriers) */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const settings = await db.getShippingSettings();
    return NextResponse.json<ApiResponse>({ success: true, data: settings });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load shipping settings" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/shipping
 * Body: { couriers?: Courier[], zones?: ShippingZone[] }
 * Each array is replaced wholesale. Sending only `zones` is fine —
 * courier references are then checked against the stored couriers.
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json<ApiResponse>({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const { couriers, zones } = body ?? {};
    if (couriers === undefined && zones === undefined) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Nothing to update" }, { status: 400 });
    }

    const patch: { couriers?: Courier[]; zones?: ShippingZone[] } = {};

    if (couriers !== undefined) {
      const res = cleanCouriers(couriers);
      if (res.error) return NextResponse.json<ApiResponse>({ success: false, error: res.error }, { status: 400 });
      patch.couriers = res.data;
    }

    if (zones !== undefined) {
      // Courier list zones are checked against = incoming couriers, else stored ones.
      const courierList = patch.couriers ?? (await db.getShippingSettings()).couriers;
      const res = cleanZones(zones, new Set(courierList.map((c) => c.id)));
      if (res.error) return NextResponse.json<ApiResponse>({ success: false, error: res.error }, { status: 400 });
      patch.zones = res.data;
    }

    const updated = await db.updateShippingSettings(patch);
    return NextResponse.json<ApiResponse>({ success: true, data: updated });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to update shipping settings" },
      { status: 500 }
    );
  }
}