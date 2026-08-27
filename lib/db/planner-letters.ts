import { createServiceClient } from "@/lib/supabase/server";

export interface PlannerLetterRow {
  id: number;
  user_id: string;
  recipient: string;
  body: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export async function listPlannerLetters(
  userId: string
): Promise<PlannerLetterRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("planner_letters")
    .select("*")
    .eq("user_id", userId)
    .order("order_index", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return (data as PlannerLetterRow[]) ?? [];
}

export async function createPlannerLetter(input: {
  userId: string;
  recipient: string;
  body: string;
}): Promise<PlannerLetterRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("planner_letters")
    .insert({
      user_id: input.userId,
      recipient: input.recipient,
      body: input.body,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("createPlannerLetter failed");
  return data as PlannerLetterRow;
}

export async function updatePlannerLetter(
  userId: string,
  id: number,
  patch: { recipient?: string; body?: string }
): Promise<PlannerLetterRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("planner_letters")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("updatePlannerLetter failed");
  return data as PlannerLetterRow;
}

export async function deletePlannerLetter(
  userId: string,
  id: number
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("planner_letters")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}
