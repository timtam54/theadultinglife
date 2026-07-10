import {
  countFilesBySubcategory,
  countRecordsBySubcategory,
  createUserSubcategory,
  getSubcategoryForUser,
  listSubcategoriesForUser,
} from "@/lib/db/subcategories";
import type { CategoryId, SubcategoryRow } from "@/lib/db/types";
import { isCategoryId } from "./records";

export async function listUserSubcategories(
  userId: string,
  categoryId?: CategoryId
): Promise<SubcategoryRow[]> {
  return listSubcategoriesForUser(userId, categoryId);
}

export async function getUserSubcategory(
  userId: string,
  id: string
): Promise<SubcategoryRow | null> {
  return getSubcategoryForUser(userId, id);
}

export async function countsForUser(
  userId: string
): Promise<Map<string, number>> {
  const [records, files] = await Promise.all([
    countRecordsBySubcategory(userId),
    countFilesBySubcategory(userId),
  ]);
  const out = new Map<string, number>();
  for (const [k, v] of records) out.set(k, v);
  for (const [k, v] of files) out.set(k, (out.get(k) ?? 0) + v);
  return out;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export async function createUserFolder(input: {
  userId: string;
  categoryId: unknown;
  name: unknown;
}): Promise<SubcategoryRow> {
  if (!isCategoryId(input.categoryId)) throw new Error("Invalid category");
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) throw new Error("Folder name is required");
  const slug = slugify(name);
  if (!slug) throw new Error("Folder name is required");
  const existing = await listSubcategoriesForUser(input.userId, input.categoryId);
  const maxOrder = existing.reduce((m, r) => Math.max(m, r.sort_order), 0);
  const id = `${input.categoryId}.u_${input.userId.slice(0, 8)}_${slug}_${Date.now().toString(36)}`;
  return createUserSubcategory({
    id,
    userId: input.userId,
    categoryId: input.categoryId,
    name,
    sortOrder: maxOrder + 1,
  });
}
