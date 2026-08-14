import { createServiceClient } from "@/lib/supabase/server";
import type { CategoryId, RecordField, RecordRow } from "./types";

export async function listRecords(
  userId: string,
  opts?: {
    categoryId?: CategoryId;
    subcategoryId?: string;
    search?: string;
    tag?: string;
  }
): Promise<RecordRow[]> {
  const supabase = createServiceClient();
  let q = supabase.from("records").select("*").eq("user_id", userId);
  if (opts?.categoryId) q = q.eq("category_id", opts.categoryId);
  if (opts?.subcategoryId) q = q.eq("subcategory_id", opts.subcategoryId);
  if (opts?.search) {
    const safe = opts.search
      .replace(/[%_]/g, (c) => `\\${c}`)
      .replace(/[(),*]/g, " ");
    const pattern = `%${safe}%`;
    q = q.or(
      [`title.ilike.${pattern}`, `notes.ilike.${pattern}`].join(",")
    );
  }
  if (opts?.tag) q = q.contains("tags", [opts.tag]);
  const { data, error } = await q.order("updated_at", { ascending: false });
  if (error) throw error;
  const rows = (data as RecordRow[]) ?? [];
  if (!opts?.search) return rows;

  // Also match any field label/value. jsonb columns can't be substring-searched
  // inside PostgREST's .or() grammar (fields::text is rejected), so filter the
  // remainder client-side and merge — the per-folder result set is small.
  const matched = new Set(rows.map((r) => r.id));
  const needle = opts.search.toLowerCase();
  let supplemental = supabase.from("records").select("*").eq("user_id", userId);
  if (opts.categoryId) supplemental = supplemental.eq("category_id", opts.categoryId);
  if (opts.subcategoryId) supplemental = supplemental.eq("subcategory_id", opts.subcategoryId);
  if (opts.tag) supplemental = supplemental.contains("tags", [opts.tag]);
  const { data: fieldData, error: fieldErr } = await supplemental;
  if (fieldErr) throw fieldErr;
  for (const row of (fieldData as RecordRow[]) ?? []) {
    if (matched.has(row.id)) continue;
    const fields = (row.fields ?? []) as RecordField[];
    const hit = fields.some(
      (f) =>
        (f.label ?? "").toLowerCase().includes(needle) ||
        (f.value ?? "").toLowerCase().includes(needle)
    );
    if (hit) rows.push(row);
  }
  return rows.sort((a, b) => (a.updated_at > b.updated_at ? -1 : 1));
}

export async function listAllTagsForUser(userId: string): Promise<string[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("records")
    .select("tags")
    .eq("user_id", userId);
  if (error) throw error;
  const set = new Set<string>();
  for (const row of (data as { tags: string[] | null }[]) ?? []) {
    for (const t of row.tags ?? []) set.add(t);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
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
  tags?: string[];
  sourceFileId?: string | null;
  actorUserId?: string;
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
      tags: input.tags ?? [],
      source_file_id: input.sourceFileId ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("createRecord failed");
  const row = data as RecordRow;
  await logHistory({
    recordId: row.id,
    userId: input.userId,
    actorUserId: input.actorUserId ?? input.userId,
    action: "created",
    changes: { title: input.title },
  });
  return row;
}

export async function updateRecord(
  userId: string,
  id: string,
  patch: Partial<
    Pick<
      RecordRow,
      "title" | "fields" | "expiry_date" | "notes" | "category_id" | "subcategory_id" | "tags"
    >
  >,
  actorUserId?: string
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
  await logHistory({
    recordId: id,
    userId,
    actorUserId: actorUserId ?? userId,
    action: "updated",
    changes: Object.keys(patch).reduce<Record<string, unknown>>((a, k) => {
      a[k] = true;
      return a;
    }, {}),
  });
  return data as RecordRow;
}

export async function deleteRecord(
  userId: string,
  id: string,
  actorUserId?: string
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("records")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
  await logHistory({
    recordId: id,
    userId,
    actorUserId: actorUserId ?? userId,
    action: "deleted",
    changes: {},
  });
}

async function logHistory(input: {
  recordId: string;
  userId: string;
  actorUserId: string;
  action: "created" | "updated" | "deleted";
  changes: Record<string, unknown>;
}): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("record_history").insert({
    record_id: input.recordId,
    user_id: input.userId,
    actor_user_id: input.actorUserId,
    action: input.action,
    changes: input.changes,
  });
}

export async function listRecordHistory(
  recordId: string,
  limit = 50
): Promise<
  {
    id: string;
    record_id: string;
    user_id: string | null;
    actor_user_id: string | null;
    action: "created" | "updated" | "deleted";
    changes: Record<string, unknown>;
    created_at: string;
  }[]
> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("record_history")
    .select("*")
    .eq("record_id", recordId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (
    (data as {
      id: string;
      record_id: string;
      user_id: string | null;
      actor_user_id: string | null;
      action: "created" | "updated" | "deleted";
      changes: Record<string, unknown>;
      created_at: string;
    }[]) ?? []
  );
}
