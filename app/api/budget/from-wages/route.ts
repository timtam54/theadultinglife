import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { isUserInFamilyGroup } from "@/lib/db/users";
import { createServiceClient } from "@/lib/supabase/server";
import { createBudgetLine, listBudgetsForUser, updateBudgetLine } from "@/lib/db/budgets";
import { PERIOD_LABELS, type BudgetPeriod } from "@/lib/budget";

// POST { instanceId, targetUserId?, source? } — "Use in my budget" on a
// wages summary or an annual payment summary: the take-home pay becomes the
// "Wages / salary" income line of the person's current budget, for that
// budget's period (weekly / fortnightly / monthly).
//   wages (default): Net, spread over the summary's own Period from / to.
//   annual: Gross + Allowances − Tax withheld, spread over the year.

const Q = {
  net: "employment_wages_summaries.net",
  from: "employment_wages_summaries.period_from",
  to: "employment_wages_summaries.period_to",
  employer: "employment_wages_summaries.employer",
};
const A = {
  gross: "employment_annual_payment_summary_report.gross",
  allowances: "employment_annual_payment_summary_report.allowances",
  tax: "employment_annual_payment_summary_report.tax_withheld",
  employer: "employment_annual_payment_summary_report.employer",
  year: "employment_annual_payment_summary_report.financial_year",
};
const PERIOD_DAYS: Record<BudgetPeriod, number> = { weekly: 7, fortnightly: 14, monthly: 365.25 / 12 };

const fail = (message: string, status = 400) => NextResponse.json({ error: "cannot_use", message }, { status });

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as { instanceId?: unknown; targetUserId?: unknown; source?: unknown };
    const annual = body.source === "annual";
    let owner = session.user.id;
    if (typeof body.targetUserId === "string" && body.targetUserId && body.targetUserId !== session.user.id) {
      if (!(await isUserInFamilyGroup(body.targetUserId, session.user.familyGroupId))) return fail("Not found.", 404);
      owner = body.targetUserId;
    }
    const instanceId = typeof body.instanceId === "string" ? body.instanceId : "";

    const { data } = await createServiceClient()
      .from("question_responses")
      .select("question_id, value")
      .eq("user_id", owner)
      .eq("instance_id", instanceId)
      .in("question_id", annual ? Object.values(A) : Object.values(Q));
    const a = Object.fromEntries(((data ?? []) as { question_id: string; value: string | null }[]).map((r) => [r.question_id, r.value ?? ""]));
    const num = (id: string) => (a[id] ? Number(a[id]) : 0);

    let net: number;
    let days: number;
    let source: string;
    if (annual) {
      if (!a[A.gross] || !Number.isFinite(num(A.gross))) return fail("Add the Gross payments ($) and save first.");
      net = num(A.gross) + num(A.allowances) - num(A.tax);
      if (!Number.isFinite(net) || net <= 0) return fail("Check the Gross payments and Tax withheld amounts.");
      days = 365.25;
      source = `annual payment summary${a[A.employer] ? ` (${a[A.employer]})` : ""}${a[A.year] ? `, ${a[A.year]}` : ""}: $${net.toLocaleString("en-AU")} take-home for the year (gross + allowances − tax)`;
    } else {
      net = Number(a[Q.net]);
      if (!a[Q.net] || !Number.isFinite(net) || net <= 0) return fail("Add the Net ($) amount and save first.");
      const from = Date.parse(a[Q.from] ?? "");
      const to = Date.parse(a[Q.to] ?? "");
      if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) {
        return fail("Add the Period from and Period to dates and save first, so we can work out the pay per week.");
      }
      days = Math.round((to - from) / 86_400_000) + 1;
      const fmt = (t: number) => new Date(t).toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
      source = `wages summary${a[Q.employer] ? ` (${a[Q.employer]})` : ""}: $${net.toLocaleString("en-AU")} take-home for ${fmt(from)} – ${fmt(to)}`;
    }

    const budgets = await listBudgetsForUser(owner);
    const current = budgets.filter((b) => !b.archived_at);
    const budget = current[current.length - 1];
    if (!budget) return fail("Start a budget in Money & Me first, then use this again.");

    const amount = Math.round(((net / days) * PERIOD_DAYS[budget.period]) * 100) / 100;
    const label = "Wages / salary";
    const notes = `From ${source}`;

    let line = budget.lines.find((l) => l.section === "income" && /wage|salary/i.test(l.label));
    if (!line) {
      line = await createBudgetLine(budget.id, "income");
      await updateBudgetLine(line.id, { label });
    }
    await updateBudgetLine(line.id, { amount, notes });

    return NextResponse.json({
      ok: true,
      amount,
      period: PERIOD_LABELS[budget.period].toLowerCase(),
      budgetName: budget.name,
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("[api/budget/from-wages] failed:", e);
    return fail("Couldn't update the budget. Please try again.", 500);
  }
}
