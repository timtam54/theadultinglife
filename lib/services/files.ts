import {
  deleteFileRow,
  getFile,
  insertFileRow,
  listFiles,
  storageUsage,
} from "@/lib/db/files";
import {
  createSignedDownloadUrl,
  deleteUserFile,
  uploadUserFile,
  userFilePath,
} from "@/lib/supabase/storage";
import type { FileRow } from "@/lib/db/types";

export async function listUserFiles(
  userId: string,
  opts?: { search?: string; subcategoryId?: string; recordId?: string }
): Promise<FileRow[]> {
  return listFiles(userId, opts);
}

export async function uploadForUser(input: {
  userId: string;
  file: File;
  recordId?: string | null;
  subcategoryId?: string | null;
  tags?: string[];
}): Promise<FileRow> {
  const path = userFilePath(input.userId, input.file.name);
  const buffer = new Uint8Array(await input.file.arrayBuffer());
  await uploadUserFile(path, buffer, input.file.type || "application/octet-stream");
  return insertFileRow({
    userId: input.userId,
    recordId: input.recordId ?? null,
    subcategoryId: input.subcategoryId ?? null,
    storagePath: path,
    filename: input.file.name,
    mimeType: input.file.type || null,
    sizeBytes: input.file.size,
    tags: input.tags,
  });
}

export async function getSignedDownload(
  userId: string,
  fileId: string
): Promise<string> {
  const row = await getFile(userId, fileId);
  if (!row) throw new Error("not_found");
  return createSignedDownloadUrl(row.storage_path);
}

export async function removeUserFile(userId: string, fileId: string): Promise<void> {
  const row = await getFile(userId, fileId);
  if (!row) return;
  await deleteUserFile(row.storage_path).catch(() => {});
  await deleteFileRow(userId, fileId);
}

export async function usageForUser(userId: string) {
  return storageUsage(userId);
}
