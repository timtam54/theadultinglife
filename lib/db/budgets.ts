import { createServiceClient } from "@/lib/supabase/server";
import { DEFAULT_LINES, type BudgetPeriod, type BudgetSection, type Repeats } from "@/lib/budget";

export interface BudgetLineRow {
  id: string;
  budget_id: string;
  section: BudgetSection;
  label: string;
  amount: number | null;
  notes: string | null;
  due_date: string | null;
  repeats: Repeats | null;
  remind_days_before: number | null;
  sort_order: number;
}

export interface BudgetRow {
  id: string;
  user_id: string;
  family_group_id: string;
  period: BudgetPeriod;
  start_date: string | null;
  pct_needs: number;
  pct_emergencies: number;
  pct_wants: number;
  pct_goals: number;
}

export interface BudgetWithLines extends BudgetRow {
  lines: BudgetLineRow[];
}

const BUDGET_COLS =
  "id, user_id, family_group_id, period, start_date, pct_needs, pct_emergencies, pct_wants, pct_goals";
const LINE_COLS =
  "id, budget_id, section, label, amount, notes, due_date, repeats, remind_days_before, sort_order";

// numeric columns can come back from PostgREST as strings.
const toBudget = (r: BudgetRow): BudgetRow => ({
  ...r,
  pct_needs: Number(r.pct_needs),
  pct_emergencies: Number(r.pct_emergencies),
  pct_wants: Number(r.pct_wants),
  pct_goals: Number(r.pct_goals),
});
const toLine = (r: BudgetLineRow): BudgetLineRow => ({
  ...r,
  amount: r.amount == null ? null : Number(r.amount),
});

/** This person's budget with its lines, or null if they haven't started one. */
export async function getBudgetForUser(userId: string): Promise<BudgetWithLines | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("budgets")
    .select(BUDGET_COLS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const budget = toBudget(data as BudgetRow);
  const { data: lines, error: lErr } = await supabase
    .from("budget_lines")
    .select(LINE_COLS)
    .eq("budget_id", budget.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (lErr) throw lErr;
  return { ...budget, lines: ((lines as BudgetLineRow[] | null) ?? []).map(toLine) };
}

export async function getBudget(id: string): Promise<BudgetRow | null> {
  const { data, error } = await createServiceClient()
    .from("budgets")
    .select(BUDGET_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toBudget(data as BudgetRow) : null;
}

/** Starts a budget pre-filled with the template's lines. Returns the existing one if there is one. */
export async function createBudget(userId: string, familyGroupId: string): Promise<BudgetWithLines> {
  const existing = await getBudgetForUser(userId);
  if (existing) return existing;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("budgets")
    .insert({ user_id: userId, family_group_id: familyGroupId })
    .select(BUDGET_COLS)
    .single();
  if (error) throw error;
  const budget = toBudget(data as BudgetRow);
  const { error: lErr } = await supabase
    .from("budget_lines")
    .insert(DEFAULT_LINES.map((l, i) => ({ ...l, budget_id: budget.id, sort_order: i + 1 })));
  if (lErr) throw lErr;
  return (await getBudgetForUser(userId)) as BudgetWithLines;
}

export type BudgetPatch = Partial<
  Pick<BudgetRow, "period" | "start_date" | "pct_needs" | "pct_emergencies" | "pct_wants" | "pct_goals">
>;

export async function updateBudget(id: string, patch: BudgetPatch): Promise<void> {
  const { error } = await createServiceClient()
    .from("budgets")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function getBudgetLine(id: string): Promise<BudgetLineRow | null> {
  const { data, error } = await createServiceClient()
    .from("budget_lines")
    .select(LINE_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toLine(data as BudgetLineRow) : null;
}

export async function createBudgetLine(budgetId: string, section: BudgetSection): Promise<BudgetLineRow> {
  const supabase = createServiceClient();
  const { data: last } = await supabase
    .from("budget_lines")
    .select("sort_order")
    .eq("budget_id", budgetId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const next = ((last as { sort_order: number }[] | null)?.[0]?.sort_order ?? 0) + 1;
  const { data, error } = await supabase
    .from("budget_lines")
    .insert({ budget_id: budgetId, section, sort_order: next })
    .select(LINE_COLS)
    .single();
  if (error) throw error;
  return toLine(data as BudgetLineRow);
}

export type BudgetLinePatch = Partial<
  Pick<BudgetLineRow, "label" | "amount" | "notes" | "due_date" | "repeats" | "remind_days_before">
>;

export async function updateBudgetLine(id: string, patch: BudgetLinePatch): Promise<void> {
  const update: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
  // A changed due date, repeat or reminder timing re-arms the notification.
  if (
    patch.due_date !== undefined ||
    patch.repeats !== undefined ||
    patch.remind_days_before !== undefined
  ) {
    update.notified_for = null;
  }
  const { error } = await createServiceClient().from("budget_lines").update(update).eq("id", id);
  if (error) throw error;
}

export async function deleteBudgetLine(id: string): Promise<void> {
  const { error } = await createServiceClient().from("budget_lines").delete().eq("id", id);
  if (error) throw error;
}

export interface BillReminderRow {
  id: string;
  label: string;
  amount: number | null;
  due_date: string;
  repeats: Repeats | null;
  remind_days_before: number;
  notified_for: string | null;
  user_id: string;
}

/** Every bill line with a due date and a chosen reminder, for these people. */
export async function listBillRemindersForUsers(userIds: string[]): Promise<BillReminderRow[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await createServiceClient()
    .from("budget_lines")
    .select(
      "id, label, amount, due_date, repeats, remind_days_before, notified_for, budgets!inner(user_id)"
    )
    .not("due_date", "is", null)
    .not("remind_days_before", "is", null)
    .in("budgets.user_id", userIds);
  if (error) throw error;
  return (
    (data as unknown as (Omit<BillReminderRow, "user_id"> & { budgets: { user_id: string } })[]) ?? []
  ).map(({ budgets, ...l }) => ({
    ...l,
    amount: l.amount == null ? null : Number(l.amount),
    user_id: budgets.user_id,
  }));
}

export async function markBillNotified(id: string, occurrence: string): Promise<void> {
  const { error } = await createServiceClient()
    .from("budget_lines")
    .update({ notified_for: occurrence })
    .eq("id", id);
  if (error) throw error;
}
