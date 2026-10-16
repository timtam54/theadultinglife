import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getBudget, updateBudget, type BudgetPatch } from "@/lib/db/budgets";
import { PERIODS, type BudgetPeriod } from "@/lib/budget";
import { handleError, parseDate } from "@/lib/services/life-goals-api";

type Ctx = { params: Promise<{ id: string }> };

const PCT_FIELDS = ["pct_needs", "pct_emergencies", "pct_wants", "pct_goals"] as const;

// PATCH — budget period, starting date or bucket percentages.
export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const budget = await getBudget(id);
    if (!budget || budget.family_group_id !== session.user.familyGroupId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const patch: BudgetPatch = {};
    if (body.period !== undefined) {
      if (!(PERIODS as readonly unknown[]).includes(body.period)) {
        return NextResponse.json({ error: "bad_period" }, { status: 400 });
      }
      patch.period = body.period as BudgetPeriod;
    }
    if (body.start_date !== undefined) {
      const v = parseDate(body.start_date);
      if (v === undefined) return NextResponse.json({ error: "bad_start_date" }, { status: 400 });
      patch.start_date = v;
    }
    for (const f of PCT_FIELDS) {
      if (body[f] === undefined) continue;
      const v = body[f];
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 100) {
        return NextResponse.json({ error: `bad_${f}` }, { status: 400 });
      }
      patch[f] = Math.round(v * 100) / 100;
    }
    await updateBudget(id, patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError("api:budget.PATCH", e);
  }
}
