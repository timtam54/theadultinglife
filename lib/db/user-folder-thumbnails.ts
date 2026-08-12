import { createServiceClient } from "@/lib/supabase/server";

export interface UserFolderThumbnailRow {
  user_id: string;
  subcategory_id: string;
  storage_path: string;
  mime_type: string;
  updated_at: string;
}

export async function upsertUserFolderThumbnail(
  userId: string,
  subcategoryId: string,
  storagePath: string,
  mimeType: string
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("user_folder_thumbnails")
    .upsert(
      {
        user_id: userId,
        subcategory_id: subcategoryId,
        storage_path: storagePath,
        mime_type: mimeType,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,subcategory_id" }
    );
  if (error) throw error;
}

export async function getUserFolderThumbnail(
  userId: string,
  subcategoryId: string
): Promise<UserFolderThumbnailRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("user_folder_thumbnails")
    .select("*")
    .eq("user_id", userId)
    .eq("subcategory_id", subcategoryId)
    .maybeSingle();
  if (error) throw error;
  return (data as UserFolderThumbnailRow) ?? null;
}

export async function listUserFolderThumbnails(
  userId: string
): Promise<UserFolderThumbnailRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("user_folder_thumbnails")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return (data as UserFolderThumbnailRow[]) ?? [];
}
