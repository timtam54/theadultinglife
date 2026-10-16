import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import {
  deleteBudgetLine,
  getBudget,
  getBudgetLine,
  updateBudgetLine,
  type BudgetLinePatch,
} from "@/lib/db/budgets";
import { REPEATS, type Repeats } from "@/lib/budget";
import { handleError, parseDate, parseText } from "@/lib/services/life-goals-api";

type Ctx = { params: Promise<{ lineId: string }> };

async function ownedLine(lineId: string, familyGroupId: string) {
  const line = await getBudgetLine(lineId);
  if (!line) return null;
  const budget = await getBudget(line.budget_id);
  return budget && budget.family_group_id === familyGroupId ? line : null;
}

// PATCH — update one line. Body keys are column names; only those sent change.
export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { lineId } = await ctx.params;
    if (!(await ownedLine(lineId, session.user.familyGroupId))) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const patch: BudgetLinePatch = {};
    if (body.label !== undefined) {
      const v = parseText(body.label);
      if (v === undefined || (v ?? "").length > 200) {
        return NextResponse.json({ error: "bad_label" }, { status: 400 });
      }
      patch.label = v ?? "";
    }
    if (body.notes !== undefined) {
      const v = parseText(body.notes);
      if (v === undefined) return NextResponse.json({ error: "bad_notes" }, { status: 400 });
      patch.notes = v;
    }
    if (body.amount !== undefined) {
      const v = body.amount;
      if (v !== null && (typeof v !== "number" || !Number.isFinite(v) || Math.abs(v) > 99_999_999)) {
        return NextResponse.json({ error: "bad_amount" }, { status: 400 });
      }
      patch.amount = v === null ? null : Math.round((v as number) * 100) / 100;
    }
    if (body.due_date !== undefined) {
      const v = parseDate(body.due_date);
      if (v === undefined) return NextResponse.json({ error: "bad_due_date" }, { status: 400 });
      patch.due_date = v;
    }
    if (body.repeats !== undefined) {
      if (body.repeats !== null && !(REPEATS as readonly unknown[]).includes(body.repeats)) {
        return NextResponse.json({ error: "bad_repeats" }, { status: 400 });
      }
      patch.repeats = body.repeats as Repeats | null;
    }
    if (body.remind_days_before !== undefined) {
      const v = body.remind_days_before;
      if (v !== null && !(typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 31)) {
        return NextResponse.json({ error: "bad_remind" }, { status: 400 });
      }
      patch.remind_days_before = v as number | null;
    }
    await updateBudgetLine(lineId, patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError("api:budget.line.PATCH", e);
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { lineId } = await ctx.params;
    if (!(await ownedLine(lineId, session.user.familyGroupId))) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    await deleteBudgetLine(lineId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError("api:budget.line.DELETE", e);
  }
}
