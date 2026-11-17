import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";
import {
  DEFAULT_FEE_CAP,
  DEFAULT_FEE_MIN,
  DEFAULT_ICON,
  checkParent,
  nameTaken,
  parseCategoryFields,
  slugify,
  uniqueSlug,
} from "@/lib/category-utils";

const bad = (error: string, status = 400) =>
  NextResponse.json<ApiResponse>({ success: false, error }, { status });

/** GET /api/admin/categories — list all categories */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const categories = await db.getCategories();
    return NextResponse.json<ApiResponse>({ success: true, data: categories });
  } catch {
    return bad("Failed to load categories", 500);
  }
}

/** POST /api/admin/categories — create a new category */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return bad("Invalid JSON body");
    }

    const parsed = parseCategoryFields(body);
    if (!parsed.ok) return bad(parsed.error);
    const f = parsed.value;

    if (!f.name) return bad("Category name is required");
    if (f.commissionRate === undefined) return bad("Commission is required (between 1 and 50)");

    const all = await db.getCategories();

    if (nameTaken(f.name, all)) return bad("A category with that name already exists", 409);

    const parentError = checkParent(f.parent, all);
    if (parentError) return bad(parentError);

    const feeCap = f.feeCap ?? DEFAULT_FEE_CAP;
    const feeMin = f.feeMin ?? DEFAULT_FEE_MIN;
    if (feeMin > feeCap) return bad("Minimum fee can't be higher than the fee cap");

    const category = await db.createCategory({
      name: f.name,
      icon: f.icon ?? DEFAULT_ICON,
      slug: uniqueSlug(slugify(f.name), all),
      commissionRate: f.commissionRate,
      parent: f.parent || null,
      attributes: f.attributes ?? [],
      active: f.active ?? true,
      featured: f.featured ?? false,
      feeCap,
      feeMin,
    });

    return NextResponse.json<ApiResponse>({ success: true, data: category });
  } catch {
    return bad("Failed to create category", 500);
  }
}