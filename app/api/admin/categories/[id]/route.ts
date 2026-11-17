import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";
import type { Category } from "@/lib/db-interface";
import {
  DEFAULT_FEE_CAP,
  DEFAULT_FEE_MIN,
  checkParent,
  nameTaken,
  parseCategoryFields,
  slugify,
  uniqueSlug,
} from "@/lib/category-utils";

const bad = (error: string, status = 400) =>
  NextResponse.json<ApiResponse>({ success: false, error }, { status });

/** PATCH /api/admin/categories/[id] — edit or toggle a category */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return bad("Invalid JSON body");
    }

    const parsed = parseCategoryFields(body);
    if (!parsed.ok) return bad(parsed.error);
    const updates: Partial<Category> = { ...parsed.value };

    if (Object.keys(updates).length === 0) return bad("Nothing to update");

    const all = await db.getCategories();
    const existing = all.find((c) => c.id === id);
    if (!existing) return bad("Category not found", 404);

    // ── Rename: only touch name/slug when the name actually changed ──
    const renamedFrom = updates.name !== undefined && updates.name !== existing.name ? existing.name : null;
    if (updates.name !== undefined) {
      if (renamedFrom === null) {
        delete updates.name; // unchanged — keep the existing slug untouched
      } else {
        if (nameTaken(updates.name, all, id)) return bad("A category with that name already exists", 409);
        updates.slug = uniqueSlug(slugify(updates.name), all, id);
      }
    }

    // ── Parent rules ──
    if (updates.parent !== undefined) {
      const parentError = checkParent(updates.parent, all, id);
      if (parentError) return bad(parentError);
    }

    // ── Fee range (check against the values that will be stored) ──
    if (updates.feeCap !== undefined || updates.feeMin !== undefined) {
      const cap = updates.feeCap ?? existing.feeCap ?? DEFAULT_FEE_CAP;
      const min = updates.feeMin ?? existing.feeMin ?? DEFAULT_FEE_MIN;
      if (min > cap) return bad("Minimum fee can't be higher than the fee cap");
    }

    const updated = await db.updateCategory(id, updates);
    if (!updated) return bad("Category not found", 404);

    // Listings reference their category by NAME, so move them to the new name
    // or they'd silently drop out of this category.
    if (renamedFrom !== null && updates.name) {
      try {
        const affected = await db.getListings({ category: renamedFrom });
        await Promise.all(affected.map((l) => db.updateListing(l.id, { category: updates.name })));
      } catch (err) {
        console.error(`Category "${renamedFrom}" renamed but listing migration failed:`, err);
      }
    }

    return NextResponse.json<ApiResponse>({ success: true, data: updated });
  } catch {
    return bad("Failed to update category", 500);
  }
}

/** DELETE /api/admin/categories/[id] — remove a category (only when nothing depends on it) */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req);
    if (auth.response) return auth.response;

    const { id } = await params;

    const all = await db.getCategories();
    const target = all.find((c) => c.id === id);
    if (!target) return bad("Category not found", 404);

    const children = all.filter((c) => c.parent === id);
    if (children.length > 0) {
      return bad(`Move or delete its ${children.length} subcategor${children.length === 1 ? "y" : "ies"} first`, 409);
    }

    const listings = await db.getListings({ category: target.name });
    if (listings.length > 0) {
      return bad(
        `${listings.length} listing${listings.length === 1 ? " still uses" : "s still use"} this category — deactivate it instead`,
        409
      );
    }

    const deleted = await db.deleteCategory(id);
    if (!deleted) return bad("Category not found", 404);

    return NextResponse.json<ApiResponse>({ success: true });
  } catch {
    return bad("Failed to delete category", 500);
  }
}