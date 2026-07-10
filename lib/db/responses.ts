import { createServiceClient } from "@/lib/supabase/server";
import type { QuestionResponseRow } from "./types";

export async function listResponsesForUser(
  userId: string,
  questionIds?: string[]
): Promise<QuestionResponseRow[]> {
  const supabase = createServiceClient();
  let q = supabase.from("question_responses").select("*").eq("user_id", userId);
  if (questionIds && questionIds.length) q = q.in("question_id", questionIds);
  const { data, error } = await q;
  if (error) throw error;
  return (data as QuestionResponseRow[]) ?? [];
}

export async function upsertResponses(
  userId: string,
  answers: { question_id: string; value: string | null }[]
): Promise<void> {
  if (!answers.length) return;
  const supabase = createServiceClient();
  const rows = answers.map((a) => ({
    user_id: userId,
    question_id: a.question_id,
    value: a.value,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from("question_responses")
    .upsert(rows, { onConflict: "user_id,question_id" });
  if (error) throw error;
}
