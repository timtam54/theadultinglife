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
