import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createBudget, getBudgetInFamily, listBudgetsForUser } from "@/lib/db/budgets";
import { canAccessUser, handleError } from "@/lib/services/life-goals-api";
import { parseBudgetLines } from "@/lib/services/budget-lines-input";
import { PERIODS, type BudgetPeriod } from "@/lib/budget";

// GET — all of a family member's budgets (current and archived) with lines.
// Query: ?userId=…
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const userId = request.nextUrl.searchParams.get("userId") ?? session.user.id;
    if (!(await canAccessUser(userId, session.user.familyGroupId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return NextResponse.json({ budgets: await listBudgetsForUser(userId) });
  } catch (e) {
    return handleError("api:budget.GET", e);
  }
}

// POST — start a budget. Body: { userId, name, copyFromId?, lines?, period? }.
// With copyFromId it copies that budget's settings and lines; with lines
// (e.g. a reviewed import) it starts with those; otherwise the template.
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as {
      userId?: unknown;
      name?: unknown;
      copyFromId?: unknown;
      lines?: unknown;
      period?: unknown;
    };
    const userId = typeof body.userId === "string" ? body.userId : session.user.id;
    if (!(await canAccessUser(userId, session.user.familyGroupId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 100) : "My budget";
    let copyFrom = null;
    if (typeof body.copyFromId === "string" && body.copyFromId) {
      copyFrom = await getBudgetInFamily(body.copyFromId, session.user.familyGroupId);
      if (!copyFrom) return NextResponse.json({ error: "copy_not_found" }, { status: 404 });
    }
    let lines = undefined;
    if (body.lines !== undefined) {
      lines = parseBudgetLines(body.lines) ?? undefined;
      if (!lines) return NextResponse.json({ error: "bad_lines" }, { status: 400 });
    }
    const period = (PERIODS as readonly unknown[]).includes(body.period)
      ? (body.period as BudgetPeriod)
      : undefined;
    const budget = await createBudget({
      userId,
      familyGroupId: session.user.familyGroupId,
      name,
      copyFrom,
      lines,
      period,
    });
    return NextResponse.json({ budget }, { status: 201 });
  } catch (e) {
    return handleError("api:budget.POST", e);
  }
}
