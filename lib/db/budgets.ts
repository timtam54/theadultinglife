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
  name: string;
  archived_at: string | null;
  title_needs: string | null;
  title_emergencies: string | null;
  title_wants: string | null;
  title_goals: string | null;
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
  "id, user_id, family_group_id, name, archived_at, title_needs, title_emergencies, title_wants, title_goals, period, start_date, pct_needs, pct_emergencies, pct_wants, pct_goals, created_at";
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

/** All of this person's budgets (current and archived), each with its lines. */
export async function listBudgetsForUser(userId: string): Promise<BudgetWithLines[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("budgets")
    .select(BUDGET_COLS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const budgets = ((data as BudgetRow[] | null) ?? []).map(toBudget);
  if (budgets.length === 0) return [];
  const { data: lines, error: lErr } = await supabase
    .from("budget_lines")
    .select(LINE_COLS)
    .in("budget_id", budgets.map((b) => b.id))
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (lErr) throw lErr;
  const byBudget = new Map<string, BudgetLineRow[]>();
  for (const l of (lines as BudgetLineRow[] | null) ?? []) {
    const list = byBudget.get(l.budget_id) ?? [];
    list.push(toLine(l));
    byBudget.set(l.budget_id, list);
  }
  return budgets.map((b) => ({ ...b, lines: byBudget.get(b.id) ?? [] }));
}

async function getBudgetWithLines(id: string): Promise<BudgetWithLines | null> {
  const budget = await getBudget(id);
  if (!budget) return null;
  const { data: lines, error } = await createServiceClient()
    .from("budget_lines")
    .select(LINE_COLS)
    .eq("budget_id", id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
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

/**
 * Starts a new budget. With copyFrom it copies that budget's settings, bucket
 * names and lines (amounts and bills included), so a new year only needs
 * updating; otherwise it starts from the template's lines.
 */
export interface NewBudgetLine {
  section: BudgetSection;
  label: string;
  amount: number | null;
  notes: string | null;
  due_date: string | null;
  repeats: Repeats | null;
  remind_days_before?: number | null;
}

/** Adds lines to the end of a budget (e.g. from an imported file). */
export async function appendBudgetLines(budgetId: string, lines: NewBudgetLine[]): Promise<number> {
  if (lines.length === 0) return 0;
  const supabase = createServiceClient();
  const { data: last } = await supabase
    .from("budget_lines")
    .select("sort_order")
    .eq("budget_id", budgetId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const start = (last as { sort_order: number }[] | null)?.[0]?.sort_order ?? 0;
  const { error } = await supabase
    .from("budget_lines")
    .insert(lines.map((l, i) => ({ ...l, budget_id: budgetId, sort_order: start + i + 1 })));
  if (error) throw error;
  return lines.length;
}

export async function createBudget(input: {
  userId: string;
  familyGroupId: string;
  name: string;
  copyFrom?: BudgetWithLines | null;
  /** Start with these lines (e.g. an imported budget) instead of the template. */
  lines?: NewBudgetLine[];
  period?: BudgetPeriod;
}): Promise<BudgetWithLines> {
  const supabase = createServiceClient();
  const src = input.copyFrom;
  const { data, error } = await supabase
    .from("budgets")
    .insert({
      user_id: input.userId,
      family_group_id: input.familyGroupId,
      name: input.name,
      ...(input.period ? { period: input.period } : {}),
      ...(src
        ? {
            period: src.period,
            pct_needs: src.pct_needs,
            pct_emergencies: src.pct_emergencies,
            pct_wants: src.pct_wants,
            pct_goals: src.pct_goals,
            title_needs: src.title_needs,
            title_emergencies: src.title_emergencies,
            title_wants: src.title_wants,
            title_goals: src.title_goals,
          }
        : {}),
    })
    .select(BUDGET_COLS)
    .single();
  if (error) throw error;
  const budget = toBudget(data as BudgetRow);
  const lines = input.lines
    ? input.lines.map((l, i) => ({ ...l, budget_id: budget.id, sort_order: i + 1 }))
    : src
    ? src.lines.map((l, i) => ({
        budget_id: budget.id,
        section: l.section,
        label: l.label,
        amount: l.amount,
        notes: l.notes,
        due_date: l.due_date,
        repeats: l.repeats,
        remind_days_before: l.remind_days_before,
        sort_order: i + 1,
      }))
    : DEFAULT_LINES.map((l, i) => ({
        budget_id: budget.id,
        section: l.section,
        label: l.label,
        repeats: l.repeats ?? null,
        sort_order: i + 1,
      }));
  if (lines.length) {
    const { error: lErr } = await supabase.from("budget_lines").insert(lines);
    if (lErr) throw lErr;
  }
  return (await getBudgetWithLines(budget.id)) as BudgetWithLines;
}

/** One budget with its lines, if it belongs to this family group. */
export async function getBudgetInFamily(
  id: string,
  familyGroupId: string
): Promise<BudgetWithLines | null> {
  const b = await getBudgetWithLines(id);
  return b && b.family_group_id === familyGroupId ? b : null;
}

export type BudgetPatch = Partial<
  Pick<
    BudgetRow,
    | "name"
    | "archived_at"
    | "title_needs"
    | "title_emergencies"
    | "title_wants"
    | "title_goals"
    | "period"
    | "start_date"
    | "pct_needs"
    | "pct_emergencies"
    | "pct_wants"
    | "pct_goals"
  >
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
      "id, label, amount, due_date, repeats, remind_days_before, notified_for, budgets!inner(user_id, archived_at)"
    )
    .is("budgets.archived_at", null)
    .not("due_date", "is", null)
    .not("remind_days_before", "is", null)
    .in("budgets.user_id", userIds);
  if (error) throw error;
  return (
    (data as unknown as (Omit<BillReminderRow, "user_id"> & {
      budgets: { user_id: string; archived_at: string | null };
    })[]) ?? []
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
