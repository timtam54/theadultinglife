import { createServiceClient } from "@/lib/supabase/server";
import type { PageQuestionRow } from "./types";

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
