import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { deleteLifeGoal, updateLifeGoal, type LifeGoalPatch } from "@/lib/db/life-goals";
import {
  handleError,
  loadOwnedGoal,
  parseDate,
  parseText,
} from "@/lib/services/life-goals-api";

type Ctx = { params: Promise<{ id: string }> };

const TEXT_FIELDS = [
  ["lifeArea", "life_area"],
  ["why", "why"],
  ["successMeasure", "success_measure"],
  ["obstacles", "obstacles"],
  ["supports", "supports"],
] as const;
const DATE_FIELDS = [
  ["targetDate", "target_date"],
  ["checkinDate", "checkin_date"],
] as const;
const BOOL_FIELDS = [
  ["remindTarget", "remind_target"],
  ["remindCheckin", "remind_checkin"],
] as const;

// PATCH — update a goal's plan fields. Only the fields sent are changed.
export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    if (!(await loadOwnedGoal(id, session.user.familyGroupId))) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const patch: LifeGoalPatch = {};
    if (body.title !== undefined) {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title || title.length > 300) {
        return NextResponse.json({ error: "title_required" }, { status: 400 });
      }
      patch.title = title;
    }
    for (const [key, col] of TEXT_FIELDS) {
      if (body[key] === undefined) continue;
      const v = parseText(body[key]);
      if (v === undefined) {
        return NextResponse.json({ error: `bad_${col}` }, { status: 400 });
      }
      patch[col] = v;
    }
    for (const [key, col] of DATE_FIELDS) {
      if (body[key] === undefined) continue;
      const v = parseDate(body[key]);
      if (v === undefined) {
        return NextResponse.json({ error: `bad_${col}` }, { status: 400 });
      }
      patch[col] = v;
    }
    for (const [key, col] of BOOL_FIELDS) {
      if (body[key] === undefined) continue;
      if (typeof body[key] !== "boolean") {
        return NextResponse.json({ error: `bad_${col}` }, { status: 400 });
      }
      patch[col] = body[key] as boolean;
    }
    await updateLifeGoal(id, patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError("api:life-goals.PATCH", e);
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    if (!(await loadOwnedGoal(id, session.user.familyGroupId))) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    await deleteLifeGoal(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError("api:life-goals.DELETE", e);
  }
}
