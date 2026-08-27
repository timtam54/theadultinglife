import { createServiceClient } from "@/lib/supabase/server";

export interface PlannerLastWordsRow {
  user_id: string;
  body: string;
  updated_at: string;
}

export async function getPlannerLastWords(
  userId: string
): Promise<PlannerLastWordsRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("planner_last_words")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as PlannerLastWordsRow | null) ?? null;
}

export async function upsertPlannerLastWords(
  userId: string,
  body: string
): Promise<PlannerLastWordsRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("planner_last_words")
    .upsert(
      {
        user_id: userId,
        body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("upsertPlannerLastWords failed");
  return data as PlannerLastWordsRow;
}
