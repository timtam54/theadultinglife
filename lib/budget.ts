/*
 * "Money & Me" budget rules, from Donna's simple budget template — pure,
 * safe for client or server. Every amount is for the chosen period; totals
 * are sums of whatever lines exist, so lines a user adds are always counted.
 */

export const PERIODS = ["weekly", "fortnightly", "monthly"] as const;
export type BudgetPeriod = (typeof PERIODS)[number];
export const PERIOD_LABELS: Record<BudgetPeriod, string> = {
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
};

export const BUCKETS = ["needs", "emergencies", "wants", "goals"] as const;
export type Bucket = (typeof BUCKETS)[number];
export type BudgetSection = "income" | Bucket;

export const BUCKET_INFO: Record<
  Bucket,
  { title: string; pctField: `pct_${Bucket}`; bills: boolean }
> = {
  needs: { title: "Needs", pctField: "pct_needs", bills: true },
  emergencies: { title: "Emergencies", pctField: "pct_emergencies", bills: false },
  wants: { title: "Wants", pctField: "pct_wants", bills: true },
  goals: { title: "Goals savings", pctField: "pct_goals", bills: false },
};

export const REPEATS = ["weekly", "fortnightly", "monthly", "quarterly", "yearly"] as const;
export type Repeats = (typeof REPEATS)[number];
export const REPEAT_LABELS: Record<Repeats, string> = {
  weekly: "Every week",
  fortnightly: "Every fortnight",
  monthly: "Every month",
  quarterly: "Every quarter",
  yearly: "Every year",
};

/** Bill reminder choices: days before the due date. */
export const REMIND_OPTIONS: { days: number; label: string }[] = [
  { days: 7, label: "A week before" },
  { days: 1, label: "The day before" },
  { days: 0, label: "On the due date" },
];

/** Repeat used when a bill gets a due date but has no repeat set yet. */
export const DEFAULT_REPEATS: Repeats = "monthly";

/**
 * The starting lines for a new budget, as in the template. Lines that are
 * usually bills carry how often they normally fall due, so a due date is all
 * the user needs to add (migration 183 back-fills the same on early budgets).
 */
export const DEFAULT_LINES: { section: BudgetSection; label: string; repeats?: Repeats }[] = [
  { section: "income", label: "Wages / salary" },
  { section: "income", label: "Other income" },
  { section: "needs", label: "Rent / board / mortgage", repeats: "monthly" },
  { section: "needs", label: "Groceries" },
  { section: "needs", label: "Fuel / transport" },
  { section: "needs", label: "Phone / internet", repeats: "monthly" },
  { section: "needs", label: "Electricity / water", repeats: "quarterly" },
  { section: "needs", label: "Insurance", repeats: "monthly" },
  { section: "needs", label: "Rego set-aside", repeats: "yearly" },
  { section: "needs", label: "Required loan repayments", repeats: "monthly" },
  { section: "needs", label: "Medical / health" },
  { section: "needs", label: "Other needs" },
  { section: "emergencies", label: "Emergency fund contribution" },
  { section: "emergencies", label: "Other emergency savings" },
  { section: "wants", label: "Subscriptions", repeats: "monthly" },
  { section: "wants", label: "Takeaway / coffee" },
  { section: "wants", label: "Entertainment / outings" },
  { section: "wants", label: "Hobbies / shopping" },
  { section: "wants", label: "Other wants" },
  { section: "goals", label: "Car goal" },
  { section: "goals", label: "Holiday goal" },
  { section: "goals", label: "Home / moving goal" },
  { section: "goals", label: "Other goal" },
];

export interface BudgetLike {
  pct_needs: number;
  pct_emergencies: number;
  pct_wants: number;
  pct_goals: number;
}
export interface BudgetLineLike {
  section: BudgetSection;
  amount: number | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface BudgetSummary {
  /** null until at least one income amount is entered (as in the template). */
  totalIncome: number | null;
  buckets: Record<Bucket, { pct: number; suggested: number | null; assigned: number; left: number | null }>;
  pctTotal: number;
  pctOk: boolean;
  totalAssigned: number;
  leftToAssign: number | null;
}

export function summariseBudget(budget: BudgetLike, lines: BudgetLineLike[]): BudgetSummary {
  const incomeAmounts = lines
    .filter((l) => l.section === "income" && l.amount != null)
    .map((l) => Number(l.amount));
  const totalIncome = incomeAmounts.length ? round2(incomeAmounts.reduce((a, b) => a + b, 0)) : null;
  const buckets = {} as BudgetSummary["buckets"];
  let totalAssigned = 0;
  for (const b of BUCKETS) {
    const pct = Number(budget[BUCKET_INFO[b].pctField]);
    const assigned = round2(
      lines.filter((l) => l.section === b).reduce((t, l) => t + Number(l.amount ?? 0), 0)
    );
    totalAssigned += assigned;
    const suggested = totalIncome == null ? null : round2((totalIncome * pct) / 100);
    buckets[b] = {
      pct,
      suggested,
      assigned,
      left: suggested == null ? null : round2(suggested - assigned),
    };
  }
  const pctTotal = round2(BUCKETS.reduce((t, b) => t + buckets[b].pct, 0));
  totalAssigned = round2(totalAssigned);
  return {
    totalIncome,
    buckets,
    pctTotal,
    pctOk: Math.abs(pctTotal - 100) < 0.005,
    totalAssigned,
    leftToAssign: totalIncome == null ? null : round2(totalIncome - totalAssigned),
  };
}

function addMonthsClamped(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = total % 12;
  const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${String(nm + 1).padStart(2, "0")}-${String(Math.min(d, lastDay)).padStart(2, "0")}`;
}

function addDaysIso(iso: string, days: number): string {
  const dt = new Date(`${iso}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * A bill's next due date on or after `today` (YYYY-MM-DD). A bill that
 * doesn't repeat keeps its date (and shows as overdue once passed). Month
 * steps count from the original date so a bill due on the 31st stays at
 * month end.
 */
export function nextDueDate(due: string, repeats: Repeats | null, today: string): string {
  if (!repeats || due >= today) return due;
  for (let n = 1; n < 2000; n++) {
    const next =
      repeats === "weekly"
        ? addDaysIso(due, 7 * n)
        : repeats === "fortnightly"
          ? addDaysIso(due, 14 * n)
          : addMonthsClamped(due, n * (repeats === "monthly" ? 1 : repeats === "quarterly" ? 3 : 12));
    if (next >= today) return next;
  }
  return due;
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round(
    (Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000
  );
}

/** Today's date (YYYY-MM-DD) in a timezone. */
export function localToday(timezone: string | null | undefined, at: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "Australia/Sydney",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(at);
  } catch {
    return at.toISOString().slice(0, 10);
  }
}
