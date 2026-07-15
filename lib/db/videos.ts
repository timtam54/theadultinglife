import { createServiceClient } from "@/lib/supabase/server";
import type { VideoRow, VideoSource } from "./types";

export async function listVideosForArticle(
  articleId: string
): Promise<VideoRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .eq("article_id", articleId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as VideoRow[] | null) ?? [];
}

export async function listAllVideos(): Promise<VideoRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .order("article_id", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as VideoRow[] | null) ?? [];
}

export async function videoCountsByArticle(): Promise<Map<string, number>> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("videos").select("article_id");
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of (data as { article_id: string }[] | null) ?? []) {
    counts.set(row.article_id, (counts.get(row.article_id) ?? 0) + 1);
  }
  return counts;
}

export async function getVideo(id: string): Promise<VideoRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as VideoRow | null) ?? null;
}

export interface InsertVideoInput {
  articleId: string;
  title: string;
  description: string | null;
  source: VideoSource;
  storagePath: string | null;
  url: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  createdBy: string | null;
}

export async function insertVideo(input: InsertVideoInput): Promise<VideoRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("videos")
    .insert({
      article_id: input.articleId,
      title: input.title,
      description: input.description,
      source: input.source,
      storage_path: input.storagePath,
      url: input.url,
      content_type: input.contentType,
      size_bytes: input.sizeBytes,
      created_by: input.createdBy,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("insertVideo failed");
  return data as VideoRow;
}

export interface UpdateVideoInput {
  title?: string;
  description?: string | null;
  sortOrder?: number;
}

export async function updateVideo(
  id: string,
  patch: UpdateVideoInput
): Promise<void> {
  const supabase = createServiceClient();
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  const { error } = await supabase.from("videos").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteVideo(id: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("videos").delete().eq("id", id);
  if (error) throw error;
}
