import {
  deleteFileRow,
  findExistingFilenameInSubcategory,
  getFile,
  insertFileRow,
  listFiles,
  storageUsage,
  updateFileRow,
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
  allowDuplicate?: boolean;
}): Promise<
  | { file: FileRow; duplicateOf?: never }
  | { file: null; duplicateOf: FileRow }
> {
  if (!input.allowDuplicate && input.subcategoryId) {
    const existing = await findExistingFilenameInSubcategory(
      input.userId,
      input.subcategoryId,
      input.file.name
    );
    if (existing) {
      return { file: null, duplicateOf: existing };
    }
  }
  const path = userFilePath(input.userId, input.file.name);
  const buffer = new Uint8Array(await input.file.arrayBuffer());
  await uploadUserFile(path, buffer, input.file.type || "application/octet-stream");
  const row = await insertFileRow({
    userId: input.userId,
    recordId: input.recordId ?? null,
    subcategoryId: input.subcategoryId ?? null,
    storagePath: path,
    filename: input.file.name,
    mimeType: input.file.type || null,
    sizeBytes: input.file.size,
    tags: input.tags,
  });
  return { file: row };
}

export async function replaceUserFile(input: {
  userId: string;
  fileId: string;
  file: File;
}): Promise<FileRow> {
  const existing = await getFile(input.userId, input.fileId);
  if (!existing) throw new Error("not_found");
  const path = userFilePath(input.userId, input.file.name);
  const buffer = new Uint8Array(await input.file.arrayBuffer());
  await uploadUserFile(path, buffer, input.file.type || "application/octet-stream");
  await deleteUserFile(existing.storage_path).catch(() => {});
  const updated = await updateFileRow(input.userId, input.fileId, {
    storagePath: path,
    filename: input.file.name,
    mimeType: input.file.type || null,
    sizeBytes: input.file.size,
  });
  if (!updated) throw new Error("update_failed");
  return updated;
}

export async function relinkUserFile(input: {
  userId: string;
  fileId: string;
  subcategoryId: string | null;
  recordId: string | null;
}): Promise<FileRow> {
  const updated = await updateFileRow(input.userId, input.fileId, {
    subcategoryId: input.subcategoryId,
    recordId: input.recordId,
  });
  if (!updated) throw new Error("not_found");
  return updated;
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
