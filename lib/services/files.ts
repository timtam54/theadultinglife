import {
  deleteFileRow,
  findExistingFilenameInSubcategory,
  getFile,
  getFileInFamily,
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
  familyGroupId: string;
  fileId: string;
  file: File;
}): Promise<FileRow> {
  const existing = await getFileInFamily(input.familyGroupId, input.fileId);
  if (!existing) throw new Error("not_found");
  const ownerId = existing.user_id;
  const path = userFilePath(ownerId, input.file.name);
  const buffer = new Uint8Array(await input.file.arrayBuffer());
  await uploadUserFile(path, buffer, input.file.type || "application/octet-stream");
  await deleteUserFile(existing.storage_path).catch(() => {});
  const updated = await updateFileRow(ownerId, input.fileId, {
    storagePath: path,
    filename: input.file.name,
    mimeType: input.file.type || null,
    sizeBytes: input.file.size,
  });
  if (!updated) throw new Error("update_failed");
  return updated;
}

export async function relinkUserFile(input: {
  familyGroupId: string;
  fileId: string;
  subcategoryId: string | null;
  recordId: string | null;
}): Promise<FileRow> {
  const existing = await getFileInFamily(input.familyGroupId, input.fileId);
  if (!existing) throw new Error("not_found");
  const updated = await updateFileRow(existing.user_id, input.fileId, {
    subcategoryId: input.subcategoryId,
    recordId: input.recordId,
  });
  if (!updated) throw new Error("not_found");
  return updated;
}

export async function getSignedDownload(
  familyGroupId: string,
  fileId: string
): Promise<string> {
  const row = await getFileInFamily(familyGroupId, fileId);
  if (!row) throw new Error("not_found");
  return createSignedDownloadUrl(row.storage_path);
}

// Same as above but allows access via an item_access_grants row too.
// Called by the download API for signed-in users who might be a grantee
// on the file (directly, or via a shared record the file is attached to).
export async function getSignedDownloadForGranteeOrFamily(
  granteeUserId: string,
  familyGroupId: string,
  fileId: string
): Promise<string> {
  // Fast path: caller is in the file's family group.
  const familyRow = await getFileInFamily(familyGroupId, fileId);
  if (familyRow) return createSignedDownloadUrl(familyRow.storage_path);

  // Otherwise: check for a grant.
  const supabase = (await import("@/lib/supabase/server")).createServiceClient();

  // Grant directly on this file.
  const { data: fileRow } = await supabase
    .from("file_objects")
    .select("id, storage_path, record_id")
    .eq("id", fileId)
    .maybeSingle();
  if (!fileRow) throw new Error("not_found");
  const f = fileRow as {
    id: string;
    storage_path: string;
    record_id: string | null;
  };

  const { count: directCount } = await supabase
    .from("item_access_grants")
    .select("id", { count: "exact", head: true })
    .eq("grantee_user_id", granteeUserId)
    .eq("item_kind", "file")
    .eq("item_id", fileId)
    .limit(1);
  if ((directCount ?? 0) > 0) return createSignedDownloadUrl(f.storage_path);

  // Grant on the parent record (record → files auto-cascade).
  if (f.record_id) {
    const { count: recCount } = await supabase
      .from("item_access_grants")
      .select("id", { count: "exact", head: true })
      .eq("grantee_user_id", granteeUserId)
      .eq("item_kind", "record")
      .eq("item_id", f.record_id)
      .limit(1);
    if ((recCount ?? 0) > 0) return createSignedDownloadUrl(f.storage_path);
  }

  throw new Error("not_found");
}

export async function removeUserFile(
  familyGroupId: string,
  fileId: string
): Promise<void> {
  const row = await getFileInFamily(familyGroupId, fileId);
  if (!row) return;
  await deleteUserFile(row.storage_path).catch(() => {});
  await deleteFileRow(row.user_id, fileId);
}

export async function usageForUser(userId: string) {
  return storageUsage(userId);
}
