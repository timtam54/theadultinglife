import { createServiceClient } from "@/lib/supabase/server";
import type { ProgressRow, QuizResultRow } from "./types";

export async function upsertProgress(input: {
  userId: string;
  itemType: "content" | "quiz";
  itemId: string;
  status: "started" | "completed";
  meta?: Record<string, unknown>;
}): Promise<ProgressRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("progress_items")
    .upsert(
      {
        user_id: input.userId,
        item_type: input.itemType,
        item_id: input.itemId,
        status: input.status,
        meta: input.meta ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,item_type,item_id" }
    )
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("upsertProgress failed");
  return data as ProgressRow;
}

export async function listProgress(userId: string): Promise<ProgressRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("progress_items")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return (data as ProgressRow[]) ?? [];
}

export async function recordQuizResult(input: {
  userId: string;
  quizId: string;
  score: number;
  total: number;
  answers: Record<string, string>;
}): Promise<QuizResultRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("quiz_results")
    .insert({
      user_id: input.userId,
      quiz_id: input.quizId,
      score: input.score,
      total: input.total,
      answers: input.answers,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("recordQuizResult failed");
  return data as QuizResultRow;
}

export async function latestQuizResult(
  userId: string,
  quizId: string
): Promise<QuizResultRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("quiz_results")
    .select("*")
    .eq("user_id", userId)
    .eq("quiz_id", quizId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as QuizResultRow | null) ?? null;
}
