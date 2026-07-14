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
  answers: { question_id: string; value: string | null; instance_id?: string }[]
): Promise<void> {
  if (!answers.length) return;
  const supabase = createServiceClient();
  const rows = answers.map((a) => ({
    user_id: userId,
    question_id: a.question_id,
    instance_id: a.instance_id ?? "default",
    value: a.value,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from("question_responses")
    .upsert(rows, { onConflict: "user_id,question_id,instance_id" });
  if (error) throw error;
}

export async function deleteResponseInstance(
  userId: string,
  questionIds: string[],
  instanceId: string
): Promise<void> {
  if (!questionIds.length) return;
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("question_responses")
    .delete()
    .eq("user_id", userId)
    .eq("instance_id", instanceId)
    .in("question_id", questionIds);
  if (error) throw error;
}

// For each subcategory in `subcategoryIds`, returns the count of distinct
// non-'default' instance_ids that the user has stored responses for. Used
// by repeater hub pages (e.g. PoM Planner) to show "N entries" per section.
export async function countInstancesBySubcategory(
  userId: string,
  subcategoryIds: string[]
): Promise<Map<string, number>> {
  if (!subcategoryIds.length) return new Map();
  const supabase = createServiceClient();

  const qRes = await supabase
    .from("page_questions")
    .select("id, subcategory_id")
    .in("subcategory_id", subcategoryIds);
  if (qRes.error) throw qRes.error;
  const questions = (qRes.data ?? []) as {
    id: string;
    subcategory_id: string;
  }[];
  if (!questions.length) return new Map();

  const subByQuestion = new Map(questions.map((q) => [q.id, q.subcategory_id]));

  const rRes = await supabase
    .from("question_responses")
    .select("question_id, instance_id")
    .eq("user_id", userId)
    .neq("instance_id", "default")
    .in(
      "question_id",
      questions.map((q) => q.id)
    );
  if (rRes.error) throw rRes.error;
  const responses = (rRes.data ?? []) as {
    question_id: string;
    instance_id: string;
  }[];

  const seen = new Map<string, Set<string>>();
  for (const r of responses) {
    const sub = subByQuestion.get(r.question_id);
    if (!sub) continue;
    const set = seen.get(sub) ?? new Set<string>();
    set.add(r.instance_id);
    seen.set(sub, set);
  }
  const out = new Map<string, number>();
  for (const [sub, ids] of seen) out.set(sub, ids.size);
  return out;
}
