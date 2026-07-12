import { createServiceClient } from "@/lib/supabase/server";
import type { PlannerEventRow } from "./types";

export async function listPlannerEventsForRange(
  userId: string,
  startAt: string,
  endAt: string
): Promise<PlannerEventRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("planner_events")
    .select("*")
    .eq("user_id", userId)
    .gte("start_at", startAt)
    .lt("start_at", endAt)
    .order("start_at", { ascending: true });
  if (error) throw error;
  return (data as PlannerEventRow[] | null) ?? [];
}

export async function getPlannerEvent(
  userId: string,
  id: string
): Promise<PlannerEventRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("planner_events")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as PlannerEventRow | null) ?? null;
}

export interface InsertPlannerEventInput {
  userId: string;
  familyGroupId: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
}

export async function insertPlannerEvent(
  input: InsertPlannerEventInput
): Promise<PlannerEventRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("planner_events")
    .insert({
      user_id: input.userId,
      family_group_id: input.familyGroupId,
      title: input.title,
      description: input.description,
      start_at: input.startAt,
      end_at: input.endAt,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("insertPlannerEvent failed");
  return data as PlannerEventRow;
}

export interface UpdatePlannerEventInput {
  title?: string;
  description?: string | null;
  startAt?: string;
  endAt?: string;
}

export async function updatePlannerEvent(
  userId: string,
  id: string,
  patch: UpdatePlannerEventInput
): Promise<PlannerEventRow> {
  const supabase = createServiceClient();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.startAt !== undefined) update.start_at = patch.startAt;
  if (patch.endAt !== undefined) update.end_at = patch.endAt;
  const { data, error } = await supabase
    .from("planner_events")
    .update(update)
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("updatePlannerEvent failed");
  return data as PlannerEventRow;
}

export async function deletePlannerEvent(
  userId: string,
  id: string
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("planner_events")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}
