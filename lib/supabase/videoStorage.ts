import { createServiceClient } from "./server";

export const LEARN_VIDEOS_BUCKET = "learn-videos";

// Storage layout: {article_id}/{uuid}-{safe-filename}
export function videoStoragePath(articleId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
  return `${articleId}/${crypto.randomUUID()}-${safe}`;
}

// Signed URL the browser PUTs the file to. Client uploads directly to
// Supabase — bytes never touch the Next server.
export async function createSignedVideoUploadUrl(path: string): Promise<{
  signedUrl: string;
  token: string;
}> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(LEARN_VIDEOS_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    throw error ?? new Error("Failed to create signed upload URL");
  }
  return { signedUrl: data.signedUrl, token: data.token };
}

export async function createSignedVideoDownloadUrl(
  path: string,
  expiresInSeconds = 60 * 60
): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(LEARN_VIDEOS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) {
    throw error ?? new Error("Failed to create signed download URL");
  }
  return data.signedUrl;
}

export async function deleteVideoObject(path: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.storage
    .from(LEARN_VIDEOS_BUCKET)
    .remove([path]);
  if (error) throw error;
}
