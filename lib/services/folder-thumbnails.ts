import { subcategoryThumbnailWithFallback } from "@/lib/thumbnails-server";
import { createSignedDownloadUrl } from "@/lib/supabase/storage";
import { listUserFolderThumbnails } from "@/lib/db/user-folder-thumbnails";
import type { CategoryId } from "@/lib/db/types";

const SIGNED_URL_TTL = 60 * 60; // 1 hour

/**
 * Resolves a folder-thumbnail URL for each subcategory, preferring the
 * per-user saved thumbnail (e.g. cropped face from a scanned licence) and
 * falling back to the static subcategory/category thumbnail.
 */
export async function resolveFolderThumbnails(
  userId: string,
  subcats: { id: string; category_id: string }[]
): Promise<Map<string, string>> {
  const out = new Map<string, string>();

  // Seed with static fallbacks first so a failure in the signed-URL path
  // still leaves us with a valid image.
  for (const s of subcats) {
    out.set(s.id, subcategoryThumbnailWithFallback(s.id, s.category_id as CategoryId));
  }

  let userThumbs: Awaited<ReturnType<typeof listUserFolderThumbnails>> = [];
  try {
    userThumbs = await listUserFolderThumbnails(userId);
  } catch {
    return out;
  }

  const wanted = new Set(subcats.map((s) => s.id));
  await Promise.all(
    userThumbs
      .filter((t) => wanted.has(t.subcategory_id))
      .map(async (t) => {
        try {
          const url = await createSignedDownloadUrl(t.storage_path, SIGNED_URL_TTL);
          out.set(t.subcategory_id, url);
        } catch {
          // keep the static fallback
        }
      })
  );

  return out;
}
