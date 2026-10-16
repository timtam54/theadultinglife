import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createBudgetLine, getBudget } from "@/lib/db/budgets";
import { BUCKETS } from "@/lib/budget";
import { handleError } from "@/lib/services/life-goals-api";

type Ctx = { params: Promise<{ id: string }> };

// POST — add a blank line to a section. Body: { section }
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const budget = await getBudget(id);
    if (!budget || budget.family_group_id !== session.user.familyGroupId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const body = (await request.json().catch(() => ({}))) as { section?: unknown };
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
