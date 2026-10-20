import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { appendBudgetLines, createBudgetLine, getBudget } from "@/lib/db/budgets";
import { parseBudgetLines } from "@/lib/services/budget-lines-input";
import { BUCKETS } from "@/lib/budget";
import { handleError } from "@/lib/services/life-goals-api";

type Ctx = { params: Promise<{ id: string }> };

// POST — add a blank line to a section ({ section }), or append several
// lines at once ({ lines }).
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const budget = await getBudget(id);
    if (!budget || budget.family_group_id !== session.user.familyGroupId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const body = (await request.json().catch(() => ({}))) as { section?: unknown; lines?: unknown };
    // Bulk: { lines: [...] } appends several (e.g. from a reviewed import).
    if (body.lines !== undefined) {
      const lines = parseBudgetLines(body.lines);
      if (!lines) return NextResponse.json({ error: "bad_lines" }, { status: 400 });
      return NextResponse.json({ added: await appendBudgetLines(id, lines) }, { status: 201 });
    }
    const section = body.section;
    if (section !== "income" && !(BUCKETS as readonly unknown[]).includes(section)) {
      return NextResponse.json({ error: "bad_section" }, { status: 400 });
    }
    const line = await createBudgetLine(id, section as "income");
    return NextResponse.json({ line }, { status: 201 });
  } catch (e) {
    return handleError("api:budget.lines.POST", e);
  }
}
