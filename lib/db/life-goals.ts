import { createServiceClient } from "@/lib/supabase/server";

export const STEP_STATUSES = ["not_started", "in_progress", "done"] as const;
export type StepStatus = (typeof STEP_STATUSES)[number];

export interface LifeGoalStepRow {
  id: string;
  goal_id: string;
  action: string;
  needs: string | null;
  due_date: string | null;
  remind: boolean;
  status: StepStatus;
  notes: string | null;
  sort_order: number;
}

export interface LifeGoalRow {
  id: string;
  user_id: string;
  family_group_id: string;
  title: string;
  life_area: string | null;
  why: string | null;
  success_measure: string | null;
  target_date: string | null;
  remind_target: boolean;
  checkin_date: string | null;
  remind_checkin: boolean;
  obstacles: string | null;
  supports: string | null;
  created_at: string;
}

export interface LifeGoalWithSteps extends LifeGoalRow {
  steps: LifeGoalStepRow[];
}

export interface LifeGoalProfileRow {
  user_id: string;
  life_vision: string | null;
  going_well: string | null;
  needs_change: string | null;
  focus_goal_id: string | null;
}

const STEP_COLS =
  "id, goal_id, action, needs, due_date, remind, status, notes, sort_order";

export async function listLifeGoals(userId: string): Promise<LifeGoalWithSteps[]> {
  const supabase = createServiceClient();
  const { data: goals, error } = await supabase
    .from("life_goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (goals as LifeGoalRow[] | null) ?? [];
  if (rows.length === 0) return [];
  const { data: steps, error: sErr } = await supabase
    .from("life_goal_steps")
    .select(STEP_COLS)
    .in("goal_id", rows.map((g) => g.id))
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (sErr) throw sErr;
  const byGoal = new Map<string, LifeGoalStepRow[]>();
  for (const s of (steps as LifeGoalStepRow[] | null) ?? []) {
    const list = byGoal.get(s.goal_id) ?? [];
    list.push(s);
    byGoal.set(s.goal_id, list);
  }
  return rows.map((g) => ({ ...g, steps: byGoal.get(g.id) ?? [] }));
}

export async function getLifeGoalProfile(
  userId: string
): Promise<LifeGoalProfileRow | null> {
  const { data, error } = await createServiceClient()
    .from("life_goal_profiles")
    .select("user_id, life_vision, going_well, needs_change, focus_goal_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as LifeGoalProfileRow | null) ?? null;
}

export type LifeGoalProfilePatch = Partial<
  Pick<LifeGoalProfileRow, "life_vision" | "going_well" | "needs_change" | "focus_goal_id">
>;

export async function saveLifeGoalProfile(
  userId: string,
  familyGroupId: string,
  patch: LifeGoalProfilePatch
): Promise<void> {
  const { error } = await createServiceClient()
    .from("life_goal_profiles")
    .upsert(
      {
        user_id: userId,
        family_group_id: familyGroupId,
        ...patch,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  if (error) throw error;
}

export async function getLifeGoal(id: string): Promise<LifeGoalRow | null> {
  const { data, error } = await createServiceClient()
    .from("life_goals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as LifeGoalRow | null) ?? null;
}

export async function createLifeGoal(input: {
  userId: string;
  familyGroupId: string;
  title: string;
}): Promise<LifeGoalWithSteps> {
  const { data, error } = await createServiceClient()
    .from("life_goals")
    .insert({
      user_id: input.userId,
      family_group_id: input.familyGroupId,
      title: input.title,
    })
    .select("*")
    .single();
  if (error) throw error;
  return { ...(data as LifeGoalRow), steps: [] };
}

export type LifeGoalPatch = Partial<
  Pick<
    LifeGoalRow,
    | "title"
    | "life_area"
    | "why"
    | "success_measure"
    | "target_date"
    | "remind_target"
    | "checkin_date"
    | "remind_checkin"
    | "obstacles"
    | "supports"
  >
>;

export async function updateLifeGoal(id: string, patch: LifeGoalPatch): Promise<void> {
  const { error } = await createServiceClient()
    .from("life_goals")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteLifeGoal(id: string): Promise<void> {
  const { error } = await createServiceClient()
    .from("life_goals")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getLifeGoalStep(id: string): Promise<LifeGoalStepRow | null> {
  const { data, error } = await createServiceClient()
    .from("life_goal_steps")
    .select(STEP_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as LifeGoalStepRow | null) ?? null;
}

export async function createLifeGoalStep(goalId: string): Promise<LifeGoalStepRow> {
  const supabase = createServiceClient();
  const { data: last } = await supabase
    .from("life_goal_steps")
    .select("sort_order")
    .eq("goal_id", goalId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const next = ((last as { sort_order: number }[] | null)?.[0]?.sort_order ?? 0) + 1;
  const { data, error } = await supabase
    .from("life_goal_steps")
    .insert({ goal_id: goalId, sort_order: next })
    .select(STEP_COLS)
    .single();
  if (error) throw error;
  return data as LifeGoalStepRow;
}

export type LifeGoalStepPatch = Partial<
  Pick<LifeGoalStepRow, "action" | "needs" | "due_date" | "remind" | "status" | "notes">
>;

export async function updateLifeGoalStep(
  id: string,
  patch: LifeGoalStepPatch
): Promise<void> {
  const { error } = await createServiceClient()
    .from("life_goal_steps")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteLifeGoalStep(id: string): Promise<void> {
  const { error } = await createServiceClient()
    .from("life_goal_steps")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
