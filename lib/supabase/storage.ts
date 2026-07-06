import { createServiceClient } from "./server";

export const USER_FILES_BUCKET = "user-files";

export function userFilePath(userId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${crypto.randomUUID()}-${safe}`;
}

export async function createSignedDownloadUrl(
  path: string,
  expiresInSeconds = 60 * 5
): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(USER_FILES_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) throw error ?? new Error("Failed to create signed URL");
  return data.signedUrl;
}

export async function uploadUserFile(
  path: string,
  body: Blob | ArrayBuffer | Uint8Array,
  contentType: string
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.storage
    .from(USER_FILES_BUCKET)
    .upload(path, body, { contentType, upsert: false });
  if (error) throw error;
}

export async function deleteUserFile(path: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.storage
    .from(USER_FILES_BUCKET)
    .remove([path]);
  if (error) throw error;
}
