// lib/category-utils.ts
// Validation + slug helpers shared by the admin category routes.

import type { Category } from "./db-interface";

export const DEFAULT_ICON = "🏷️";
export const DEFAULT_FEE_CAP = 50000;
export const DEFAULT_FEE_MIN = 500;

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isWholeNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0;

/** Counts user-perceived characters, so "🏷️" and "👨‍👩‍👧" each count as 1. */
function graphemeCount(s: string): number {
  const Seg = (Intl as any).Segmenter;
  return Seg ? [...new Seg().segment(s)].length : [...s].length;
}

/** "Phones & Tablets" -> "phones-tablets" (matches the existing seeded slugs). */
export function slugify(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "category";
}

/** Adds -2, -3… if another category already uses the slug. */
export function uniqueSlug(base: string, categories: Category[], ignoreId?: string): string {
  const taken = new Set(categories.filter((c) => c.id !== ignoreId).map((c) => c.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/**
 * Type-checks and cleans whichever fields are present in the body.
 * `commission` (percent, 1–50) is converted to `commissionRate` (decimal).
 * Cross-record rules (duplicates, parent, fee range) are checked in the routes.
 */
export function parseCategoryFields(body: unknown): Result<Partial<Category>> {
  if (!isObj(body)) return fail("Invalid request body");
  const out: Partial<Category> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) return fail("Category name is required");
    const name = body.name.trim().replace(/\s+/g, " ");
    if (name.length > 60) return fail("Category name must be 60 characters or fewer");
    out.name = name;
  }

  if (body.icon !== undefined) {
    if (typeof body.icon !== "string") return fail("Icon must be a single emoji");
    const icon = body.icon.trim();
    if (icon && graphemeCount(icon) > 1) return fail("Icon must be a single emoji");
    out.icon = icon || DEFAULT_ICON;
  }

  if (body.commission !== undefined) {
    const c = body.commission;
    if (typeof c !== "number" || !Number.isFinite(c) || c < 1 || c > 50) {
      return fail("Commission must be a number between 1 and 50");
    }
    out.commissionRate = Math.round(c * 100) / 10000; // 7.5 -> 0.075, no float drift
  }

  if (body.feeCap !== undefined) {
    if (!isWholeNumber(body.feeCap)) return fail("Fee cap must be a whole number ≥ 0");
    out.feeCap = body.feeCap;
  }
  if (body.feeMin !== undefined) {
    if (!isWholeNumber(body.feeMin)) return fail("Minimum fee must be a whole number ≥ 0");
    out.feeMin = body.feeMin;
  }

  if (body.attributes !== undefined) {
    if (!Array.isArray(body.attributes) || body.attributes.some((a) => typeof a !== "string")) {
      return fail("Attributes must be a list of text values");
    }
    const seen = new Set<string>();
    const attrs: string[] = [];
    for (const raw of body.attributes as string[]) {
      const a = raw.trim();
      if (!a) continue;
      if (a.length > 30) return fail(`Attribute "${a.slice(0, 12)}…" is too long (max 30 characters)`);
      if (seen.has(a.toLowerCase())) continue;
      seen.add(a.toLowerCase());
      attrs.push(a);
    }
    if (attrs.length > 20) return fail("A category can have at most 20 attributes");
    out.attributes = attrs;
  }

  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") return fail("active must be true or false");
    out.active = body.active;
  }
  if (body.featured !== undefined) {
    if (typeof body.featured !== "boolean") return fail("featured must be true or false");
    out.featured = body.featured;
  }

  if (body.parent !== undefined) {
    if (body.parent === null || body.parent === "") out.parent = null;
    else if (typeof body.parent === "string") out.parent = body.parent.trim();
    else return fail("Invalid parent category");
  }

  return { ok: true, value: out };
}

/** Case-insensitive duplicate-name check (ignores the category being edited). */
export function nameTaken(name: string, categories: Category[], ignoreId?: string): boolean {
  const n = name.toLowerCase();
  return categories.some((c) => c.id !== ignoreId && c.name.toLowerCase() === n);
}

/**
 * Two-level hierarchy rules:
 *  - parent must exist and be top-level
 *  - a category can't be its own parent
 *  - a category that already has subcategories can't become a subcategory
 */
export function checkParent(
  parentId: string | null | undefined,
  categories: Category[],
  selfId?: string
): string | null {
  if (!parentId) return null;
  if (parentId === selfId) return "A category can't be its own parent";
  const parent = categories.find((c) => c.id === parentId);
  if (!parent) return "Parent category not found";
  if (parent.parent) return "Parent must be a top-level category (only two levels are supported)";
  if (selfId && categories.some((c) => c.parent === selfId)) {
    return "This category has subcategories, so it can't be moved under another category";
  }
  return null;
}
