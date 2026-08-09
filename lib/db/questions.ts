import { createServiceClient } from "@/lib/supabase/server";
import type { PageQuestionRow, QuestionType } from "./types";

export interface NewPageQuestion {
  id: string;
  page_group: string;
  subcategory_id: string;
  label: string;
  hint: string | null;
  question_type: QuestionType;
  options: { value: string; label: string }[] | null;
  col_start: number;
  col_span: number;
  row_order: number;
  required: boolean;
  placeholder: string | null;
  created_by: string | null;
}

export async function insertPageQuestions(
  rows: NewPageQuestion[]
): Promise<void> {
  if (rows.length === 0) return;
  const supabase = createServiceClient();
  const { error } = await supabase.from("page_questions").insert(rows);
  if (error) throw error;
}

export async function listQuestionsByGroup(
  group: string
): Promise<PageQuestionRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("page_questions")
    .select("*")
    .eq("page_group", group)
    .order("row_order", { ascending: true })
    .order("col_start", { ascending: true });
  if (error) throw error;
  return (data as PageQuestionRow[]) ?? [];
}

export async function listQuestionsBySubcategory(
  subcategoryId: string
): Promise<PageQuestionRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("page_questions")
    .select("*")
    .eq("subcategory_id", subcategoryId)
    .order("row_order", { ascending: true })
    .order("col_start", { ascending: true });
  if (error) throw error;
  return (data as PageQuestionRow[]) ?? [];
}

/**
 * Every configured (subcategory_id, page_group) pair plus its field count.
 * Used by the admin folder-forms viewer.
 */
export async function listConfiguredFormSummaries(): Promise<
  { subcategoryId: string; pageGroup: string; fieldCount: number }[]
> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("page_questions")
    .select("subcategory_id, page_group");
  if (error) throw error;
  const rows = (data ?? []) as { subcategory_id: string | null; page_group: string }[];
  const map = new Map<string, { subcategoryId: string; pageGroup: string; fieldCount: number }>();
  for (const r of rows) {
    if (!r.subcategory_id) continue;
    const key = `${r.subcategory_id}:${r.page_group}`;
    const existing = map.get(key);
    if (existing) existing.fieldCount += 1;
    else
      map.set(key, {
        subcategoryId: r.subcategory_id,
        pageGroup: r.page_group,
        fieldCount: 1,
      });
  }
  return Array.from(map.values());
}
