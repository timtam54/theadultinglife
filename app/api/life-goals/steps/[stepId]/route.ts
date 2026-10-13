import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import {
  STEP_STATUSES,
  deleteLifeGoalStep,
  getLifeGoalStep,
  updateLifeGoalStep,
  type LifeGoalStepPatch,
  type StepStatus,
} from "@/lib/db/life-goals";
import {
  handleError,
  loadOwnedGoal,
  parseDate,
  parseText,
} from "@/lib/services/life-goals-api";

type Ctx = { params: Promise<{ stepId: string }> };

async function ownedStep(stepId: string, familyGroupId: string) {
  const step = await getLifeGoalStep(stepId);
  if (!step) return null;
  return (await loadOwnedGoal(step.goal_id, familyGroupId)) ? step : null;
}

// PATCH — update one action step. Only the fields sent are changed.
export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { stepId } = await ctx.params;
    if (!(await ownedStep(stepId, session.user.familyGroupId))) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const patch: LifeGoalStepPatch = {};
    if (body.action !== undefined) {
      const v = parseText(body.action);
      if (v === undefined) {
        return NextResponse.json({ error: "bad_action" }, { status: 400 });
      }
      patch.action = v ?? "";
    }
    for (const key of ["needs", "notes"] as const) {
      if (body[key] === undefined) continue;
      const v = parseText(body[key]);
      if (v === undefined) {
        return NextResponse.json({ error: `bad_${key}` }, { status: 400 });
      }
      patch[key] = v;
    }
    if (body.dueDate !== undefined) {
      const v = parseDate(body.dueDate);
      if (v === undefined) {
        return NextResponse.json({ error: "bad_due_date" }, { status: 400 });
      }
      patch.due_date = v;
    }
    if (body.remind !== undefined) {
      if (typeof body.remind !== "boolean") {
        return NextResponse.json({ error: "bad_remind" }, { status: 400 });
      }
      patch.remind = body.remind;
    }
    if (body.status !== undefined) {
      if (!(STEP_STATUSES as readonly unknown[]).includes(body.status)) {
        return NextResponse.json({ error: "bad_status" }, { status: 400 });
      }
      patch.status = body.status as StepStatus;
    }
    await updateLifeGoalStep(stepId, patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError("api:life-goals.step.PATCH", e);
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { stepId } = await ctx.params;
    if (!(await ownedStep(stepId, session.user.familyGroupId))) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    await deleteLifeGoalStep(stepId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError("api:life-goals.step.DELETE", e);
  }
}
