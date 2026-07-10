import { createServiceClient } from "@/lib/supabase/server";
import type { CategoryId, RecordField, RecordRow } from "./types";

export async function listRecords(
  userId: string,
  opts?: { categoryId?: CategoryId; subcategoryId?: string; search?: string }
): Promise<RecordRow[]> {
  const supabase = createServiceClient();
  let q = supabase.from("records").select("*").eq("user_id", userId);
  if (opts?.categoryId) q = q.eq("category_id", opts.categoryId);
  if (opts?.subcategoryId) q = q.eq("subcategory_id", opts.subcategoryId);
  if (opts?.search) q = q.ilike("title", `%${opts.search}%`);
  const { data, error } = await q.order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as RecordRow[]) ?? [];
}

export async function getRecord(
  userId: string,
  id: string
): Promise<RecordRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("records")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as RecordRow | null) ?? null;
}

export async function createRecord(input: {
  userId: string;
  categoryId: CategoryId;
  subcategoryId?: string | null;
  title: string;
  fields: RecordField[];
  expiryDate?: string | null;
  notes?: string | null;
}): Promise<RecordRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("records")
    .insert({
      user_id: input.userId,
      category_id: input.categoryId,
      subcategory_id: input.subcategoryId ?? null,
      title: input.title,
      fields: input.fields,
      expiry_date: input.expiryDate ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("createRecord failed");
  return data as RecordRow;
}

export async function updateRecord(
  userId: string,
  id: string,
  patch: Partial<
    Pick<
      RecordRow,
      "title" | "fields" | "expiry_date" | "notes" | "category_id" | "subcategory_id"
    >
  >
): Promise<RecordRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("records")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("updateRecord failed");
  return data as RecordRow;
}

export async function deleteRecord(userId: string, id: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("records")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}
