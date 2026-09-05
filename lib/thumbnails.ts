/*
 * Thumbnail URL builders — safe to import from client OR server code.
 *
 * These are *pure* URL string builders. They do NOT check whether the file
 * exists on disk. Missing files will 404 in the browser — components that
 * render these should have a visible fallback (e.g. bg color / ring).
 *
 * For the fs-checking variant that falls back to the category thumbnail
 * when the specific PNG isn't present, import from `lib/thumbnails-server.ts`
 * instead. That module must only be imported from server components / route
 * handlers because it uses `node:fs`.
 */

import type { CategoryId } from "@/lib/db/types";

export function categoryThumbnail(categoryId: CategoryId): string {
  return `/thumbnails/categories/${categoryId}.png`;
}

/**
 * Returns the URL where a subcategory thumbnail *would* live. Does NOT
 * check whether the file exists. Use `subcategoryThumbnailWithFallback`
 * from `lib/thumbnails-server.ts` if you need the fs-checked fallback.
 */
export function subcategoryThumbnail(
  subcategoryId: string,
  _categoryId: CategoryId
): string {
  return `/thumbnails/subcategories/${subcategoryId}.png`;
}

export type DashboardThumbnailId =
  | "records-documents"
  | "expiring-soon"
  | "tasks"
  | "all-good"
  | "add-record"
  | "upload-document"
  | "scan-document"
  | "add-reminder";

export function dashboardThumbnail(id: DashboardThumbnailId): string {
  return `/thumbnails/dashboard/${id}.png`;
}

export type LearnThumbnailId =
  | "adulting-hub"
  | "articles"
  | "videos"
  | "quizzes"
  | "guides"
  | "downloads"
  | "peace-of-mind-planner"
  | "tal-ai";

export function learnThumbnail(id: LearnThumbnailId): string {
  return `/thumbnails/learn/${id}.png`;
}
