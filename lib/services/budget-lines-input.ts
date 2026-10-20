import { BUCKETS, REPEATS, type Repeats } from "@/lib/budget";
import type { NewBudgetLine } from "@/lib/db/budgets";

/**
 * Validates a list of budget lines sent by the client (e.g. after reviewing
 * an import). Returns null if anything is malformed.
 */
export function parseBudgetLines(raw: unknown, max = 200): NewBudgetLine[] | null {
  if (!Array.isArray(raw) || raw.length > max) return null;
  const out: NewBudgetLine[] = [];
  for (const r of raw as Record<string, unknown>[]) {
    if (!r || typeof r !== "object") return null;
    const section = r.section;
    if (section !== "income" && !(BUCKETS as readonly unknown[]).includes(section)) return null;
    const label = typeof r.label === "string" ? r.label.trim().slice(0, 200) : "";
    const amount =
      r.amount === null || r.amount === undefined
        ? null
        : typeof r.amount === "number" && Number.isFinite(r.amount) && Math.abs(r.amount) <= 99_999_999
          ? Math.round(r.amount * 100) / 100
          : undefined;
    if (amount === undefined) return null;
    const due =
      typeof r.due_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.due_date) ? r.due_date : null;
    const repeats = (REPEATS as readonly unknown[]).includes(r.repeats) ? (r.repeats as Repeats) : null;
    const notes = typeof r.notes === "string" && r.notes.trim() ? r.notes.trim().slice(0, 2000) : null;
    out.push({ section: section as NewBudgetLine["section"], label, amount, notes, due_date: due, repeats });
  }
  return out;
}
