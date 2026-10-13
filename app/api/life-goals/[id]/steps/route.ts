import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createLifeGoalStep } from "@/lib/db/life-goals";
import { handleError, loadOwnedGoal } from "@/lib/services/life-goals-api";

type Ctx = { params: Promise<{ id: string }> };

// POST — add a blank action step to the end of a goal's plan.
export async function POST(_request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    if (!(await loadOwnedGoal(id, session.user.familyGroupId))) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const step = await createLifeGoalStep(id);
    return NextResponse.json({ step }, { status: 201 });
  } catch (e) {
    return handleError("api:life-goals.steps.POST", e);
  }
}
