import { createServiceClient } from "@/lib/supabase/server";

export interface PlannerApologyRow {
  id: number;
  user_id: string;
  recipient: string;
  body: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export async function listPlannerApologies(
  userId: string
): Promise<PlannerApologyRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("planner_apologies")
    .select("*")
    .eq("user_id", userId)
    .order("order_index", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return (data as PlannerApologyRow[]) ?? [];
}

export async function createPlannerApology(input: {
  userId: string;
  recipient: string;
  body: string;
}): Promise<PlannerApologyRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("planner_apologies")
    .insert({
      user_id: input.userId,
      recipient: input.recipient,
      body: input.body,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("createPlannerApology failed");
  return data as PlannerApologyRow;
}

export async function updatePlannerApology(
  userId: string,
  id: number,
  patch: { recipient?: string; body?: string }
): Promise<PlannerApologyRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("planner_apologies")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("updatePlannerApology failed");
  return data as PlannerApologyRow;
}

export async function deletePlannerApology(
  userId: string,
  id: number
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("planner_apologies")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}
