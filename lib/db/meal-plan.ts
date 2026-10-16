import { createServiceClient } from "@/lib/supabase/server";

export const MEAL_SLOTS = ["breakfast", "snack1", "lunch", "snack2", "dinner"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];
/** Meal slots plus the per-week "Notes / prep" box (stored on the Monday). */
export type MealPlanSlot = MealSlot | "notes";

export function isMealPlanSlot(v: unknown): v is MealPlanSlot {
  return v === "notes" || (MEAL_SLOTS as readonly unknown[]).includes(v);
}

export interface MealPlanEntryRow {
  id: string;
  user_id: string;
  family_group_id: string;
  plan_date: string; // yyyy-MM-dd
  slot: MealPlanSlot;
  body: string;
  created_at: string;
  updated_at: string;
}

/** Entries with startDate <= plan_date <= endDate (both yyyy-MM-dd). */
export async function listMealPlanEntries(
  userId: string,
  startDate: string,
  endDate: string
): Promise<MealPlanEntryRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("meal_plan_entries")
    .select("*")
    .eq("user_id", userId)
    .gte("plan_date", startDate)
    .lte("plan_date", endDate)
    .order("plan_date", { ascending: true });
  if (error) throw error;
  return (data as MealPlanEntryRow[] | null) ?? [];
}

/** Saves one cell. An empty body clears the cell. */
export async function setMealPlanEntry(input: {
  userId: string;
  familyGroupId: string;
  planDate: string;
  slot: MealPlanSlot;
  body: string;
}): Promise<void> {
  const supabase = createServiceClient();
  const body = input.body.trim();
  if (!body) {
    const { error } = await supabase
      .from("meal_plan_entries")
      .delete()
      .eq("user_id", input.userId)
      .eq("plan_date", input.planDate)
      .eq("slot", input.slot);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("meal_plan_entries").upsert(
    {
      user_id: input.userId,
      family_group_id: input.familyGroupId,
      plan_date: input.planDate,
      slot: input.slot,
      body,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,plan_date,slot" }
  );
  if (error) throw error;
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Copies `days` days of meals starting at `fromDate` forward by `offsetDays`.
 * Only fills cells that are empty at the destination — it never overwrites
 * something already planned. Returns how many cells were written.
 */
export async function copyMealPlanRange(input: {
  userId: string;
  familyGroupId: string;
  fromDate: string;
  days: number;
  offsetDays: number;
}): Promise<number> {
  const fromEnd = shiftDate(input.fromDate, input.days - 1);
  const [source, target] = await Promise.all([
    listMealPlanEntries(input.userId, input.fromDate, fromEnd),
    listMealPlanEntries(
      input.userId,
      shiftDate(input.fromDate, input.offsetDays),
      shiftDate(fromEnd, input.offsetDays)
    ),
  ]);
  const taken = new Set(target.map((t) => `${t.plan_date}|${t.slot}`));
  const rows = source
    .filter((s) => s.slot !== "notes")
    .map((s) => ({
      user_id: input.userId,
      family_group_id: input.familyGroupId,
      plan_date: shiftDate(s.plan_date, input.offsetDays),
      slot: s.slot,
      body: s.body,
    }))
    .filter((r) => !taken.has(`${r.plan_date}|${r.slot}`));
  if (rows.length === 0) return 0;
  const { error } = await createServiceClient()
    .from("meal_plan_entries")
    .insert(rows);
  if (error) throw error;
  return rows.length;
}

/** Distinct meals this person has entered recently, newest first. */
export async function listMealSuggestions(userId: string): Promise<string[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("meal_plan_entries")
    .select("body")
    .eq("user_id", userId)
    .neq("slot", "notes")
    .order("updated_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of (data as { body: string }[] | null) ?? []) {
    const key = r.body.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r.body);
  }
  return out;
}

/**
 * Saves many cells at once. With overwrite false, cells that already hold a
 * meal are skipped. Returns how many cells were written.
 */
export async function saveMealPlanEntries(input: {
  userId: string;
  familyGroupId: string;
  entries: { date: string; slot: MealPlanSlot; body: string }[];
  overwrite: boolean;
}): Promise<number> {
  if (input.entries.length === 0) return 0;
  const dates = input.entries.map((e) => e.date).sort();
  const existing = input.overwrite
    ? []
    : await listMealPlanEntries(input.userId, dates[0], dates[dates.length - 1]);
  const taken = new Set(existing.map((e) => `${e.plan_date}|${e.slot}`));
  const now = new Date().toISOString();
  const rows = input.entries
    .filter((e) => !taken.has(`${e.date}|${e.slot}`))
    .map((e) => ({
      user_id: input.userId,
      family_group_id: input.familyGroupId,
      plan_date: e.date,
      slot: e.slot,
      body: e.body,
      updated_at: now,
    }));
  if (rows.length === 0) return 0;
  const { error } = await createServiceClient()
    .from("meal_plan_entries")
    .upsert(rows, { onConflict: "user_id,plan_date,slot" });
  if (error) throw error;
  return rows.length;
}
