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
