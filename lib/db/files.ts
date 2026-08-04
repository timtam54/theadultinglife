import { createServiceClient } from "@/lib/supabase/server";
import type { FileRow } from "./types";

export async function listFiles(
  userId: string,
  opts?: { recordId?: string; subcategoryId?: string; search?: string }
): Promise<FileRow[]> {
  const supabase = createServiceClient();
  let q = supabase.from("file_objects").select("*").eq("user_id", userId);
  if (opts?.recordId) q = q.eq("record_id", opts.recordId);
  if (opts?.subcategoryId) q = q.eq("subcategory_id", opts.subcategoryId);
  if (opts?.search) q = q.ilike("filename", `%${opts.search}%`);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return (data as FileRow[]) ?? [];
}

export async function getFile(
  userId: string,
  id: string
): Promise<FileRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("file_objects")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as FileRow | null) ?? null;
}

export async function insertFileRow(input: {
  userId: string;
  recordId?: string | null;
  subcategoryId?: string | null;
  storagePath: string;
  filename: string;
  mimeType?: string | null;
  sizeBytes: number;
  tags?: string[];
}): Promise<FileRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("file_objects")
    .insert({
      user_id: input.userId,
      record_id: input.recordId ?? null,
      subcategory_id: input.subcategoryId ?? null,
      storage_path: input.storagePath,
      filename: input.filename,
      mime_type: input.mimeType ?? null,
      size_bytes: input.sizeBytes,
      tags: input.tags ?? [],
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("insertFileRow failed");
  return data as FileRow;
}

export async function updateFileRow(
  userId: string,
  id: string,
  patch: {
    subcategoryId?: string | null;
    recordId?: string | null;
    storagePath?: string;
    filename?: string;
    mimeType?: string | null;
    sizeBytes?: number;
  }
): Promise<FileRow | null> {
  const supabase = createServiceClient();
  const update: Record<string, unknown> = {};
  if (patch.subcategoryId !== undefined) update.subcategory_id = patch.subcategoryId;
  if (patch.recordId !== undefined) update.record_id = patch.recordId;
  if (patch.storagePath !== undefined) update.storage_path = patch.storagePath;
  if (patch.filename !== undefined) update.filename = patch.filename;
  if (patch.mimeType !== undefined) update.mime_type = patch.mimeType;
  if (patch.sizeBytes !== undefined) update.size_bytes = patch.sizeBytes;
  if (Object.keys(update).length === 0) return getFile(userId, id);
  const { data, error } = await supabase
    .from("file_objects")
    .update(update)
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as FileRow | null) ?? null;
}

export async function findExistingFilenameInSubcategory(
  userId: string,
  subcategoryId: string,
  filename: string
): Promise<FileRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("file_objects")
    .select("*")
    .eq("user_id", userId)
    .eq("subcategory_id", subcategoryId)
    .eq("filename", filename)
    .maybeSingle();
  if (error) throw error;
  return (data as FileRow | null) ?? null;
}

export async function deleteFileRow(userId: string, id: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("file_objects")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}

export async function storageUsage(
  userId: string
): Promise<{ count: number; totalBytes: number }> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("file_objects")
    .select("size_bytes")
    .eq("user_id", userId);
  if (error) throw error;
  const rows = (data ?? []) as { size_bytes: number }[];
  return {
    count: rows.length,
    totalBytes: rows.reduce((sum, r) => sum + Number(r.size_bytes ?? 0), 0),
  };
}
