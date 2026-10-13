import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { saveLifeGoalProfile, type LifeGoalProfilePatch } from "@/lib/db/life-goals";
import {
  canAccessUser,
  handleError,
  loadOwnedGoal,
  parseText,
} from "@/lib/services/life-goals-api";

// PUT — save the page-level answers. Only the fields sent are changed.
// Body: { userId, lifeVision?, goingWell?, needsChange?, focusGoalId? }
export async function PUT(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const userId = typeof body.userId === "string" ? body.userId : session.user.id;
    if (!(await canAccessUser(userId, session.user.familyGroupId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const patch: LifeGoalProfilePatch = {};
    for (const [key, col] of [
      ["lifeVision", "life_vision"],
      ["goingWell", "going_well"],
      ["needsChange", "needs_change"],
    ] as const) {
      if (body[key] === undefined) continue;
      const v = parseText(body[key]);
      if (v === undefined) {
        return NextResponse.json({ error: `bad_${col}` }, { status: 400 });
      }
      patch[col] = v;
    }
    if (body.focusGoalId !== undefined) {
      if (body.focusGoalId === null) {
        patch.focus_goal_id = null;
      } else {
        const goal =
          typeof body.focusGoalId === "string"
            ? await loadOwnedGoal(body.focusGoalId, session.user.familyGroupId)
            : null;
        if (!goal || goal.user_id !== userId) {
          return NextResponse.json({ error: "bad_focus_goal" }, { status: 400 });
        }
        patch.focus_goal_id = goal.id;
      }
    }
    await saveLifeGoalProfile(userId, session.user.familyGroupId, patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError("api:life-goals.profile.PUT", e);
  }
}
