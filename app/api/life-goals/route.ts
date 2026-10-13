import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import {
  createLifeGoal,
  getLifeGoalProfile,
  listLifeGoals,
} from "@/lib/db/life-goals";
import { canAccessUser, handleError } from "@/lib/services/life-goals-api";

// GET — one family member's goals (with steps) and page-level answers.
// Query: ?userId=…
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const userId = request.nextUrl.searchParams.get("userId") ?? session.user.id;
    if (!(await canAccessUser(userId, session.user.familyGroupId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const [goals, profile] = await Promise.all([
      listLifeGoals(userId),
      getLifeGoalProfile(userId),
    ]);
    return NextResponse.json({ goals, profile });
  } catch (e) {
    return handleError("api:life-goals.GET", e);
  }
}

// POST — add a goal. Body: { userId, title }
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as {
      userId?: unknown;
      title?: unknown;
    };
    const userId = typeof body.userId === "string" ? body.userId : session.user.id;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || title.length > 300) {
      return NextResponse.json({ error: "title_required" }, { status: 400 });
    }
    if (!(await canAccessUser(userId, session.user.familyGroupId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const goal = await createLifeGoal({
      userId,
      familyGroupId: session.user.familyGroupId,
      title,
    });
    return NextResponse.json({ goal }, { status: 201 });
  } catch (e) {
    return handleError("api:life-goals.POST", e);
  }
}
