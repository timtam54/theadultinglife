import "server-only";

/*
 * Server-only thumbnail resolver — uses node:fs to check whether a specific
 * subcategory PNG has been generated. Falls back to the category thumbnail
 * when not. Kept separate from `lib/thumbnails.ts` so client components can
 * still import the pure URL builders without pulling `node:fs` into the
 * browser bundle.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { CategoryId } from "@/lib/db/types";
import { categoryThumbnail } from "@/lib/thumbnails";

const PUBLIC_ROOT = resolve(process.cwd(), "public");

function fileExists(relPath: string): boolean {
  try {
    return existsSync(resolve(PUBLIC_ROOT, relPath));
  } catch {
    return false;
  }
}

/**
 * Returns the subcategory-specific thumbnail URL if one exists on disk,
 * else falls back to the category-level thumbnail. Server-only.
 */
export function subcategoryThumbnailWithFallback(
  subcategoryId: string,
  categoryId: CategoryId
): string {
  const rel = `thumbnails/subcategories/${subcategoryId}.png`;
  if (fileExists(rel)) return `/${rel}`;
  return categoryThumbnail(categoryId);
}
