import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { isUserInFamilyGroup } from "@/lib/db/users";
import {
  isMealPlanSlot,
  listMealPlanEntries,
  listMealSuggestions,
  setMealPlanEntry,
} from "@/lib/db/meal-plan";
import { apiError } from "@/lib/api-error";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BODY = 2000;

function isDate(v: unknown): v is string {
  return typeof v === "string" && DATE_RE.test(v);
}

// GET — one family member's meals for a date range (inclusive), plus the
// meals they've entered before for type-ahead suggestions.
// Query: ?userId=…&start=yyyy-MM-dd&end=yyyy-MM-dd
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const sp = request.nextUrl.searchParams;
    const userId = sp.get("userId") ?? session.user.id;
    const start = sp.get("start");
    const end = sp.get("end");
    if (!isDate(start) || !isDate(end)) {
      return NextResponse.json({ error: "start_and_end_required" }, { status: 400 });
    }
    if (!(await isUserInFamilyGroup(userId, session.user.familyGroupId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const [entries, suggestions] = await Promise.all([
      listMealPlanEntries(userId, start, end),
      listMealSuggestions(userId),
    ]);
    return NextResponse.json({
      entries: entries.map((e) => ({ date: e.plan_date, slot: e.slot, body: e.body })),
      suggestions,
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:meal-plan.GET", e);
  }
}

// PUT — save one cell. Body: { userId, date, slot, body }. Empty body clears it.
export async function PUT(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as {
      userId?: unknown;
      date?: unknown;
      slot?: unknown;
      body?: unknown;
    };
    const userId = typeof body.userId === "string" ? body.userId : session.user.id;
    if (!isDate(body.date)) {
      return NextResponse.json({ error: "bad_date" }, { status: 400 });
    }
    if (!isMealPlanSlot(body.slot)) {
      return NextResponse.json({ error: "bad_slot" }, { status: 400 });
    }
    if (typeof body.body !== "string" || body.body.length > MAX_BODY) {
      return NextResponse.json({ error: "bad_body" }, { status: 400 });
    }
    if (!(await isUserInFamilyGroup(userId, session.user.familyGroupId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    await setMealPlanEntry({
      userId,
      familyGroupId: session.user.familyGroupId,
      planDate: body.date,
      slot: body.slot,
      body: body.body,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:meal-plan.PUT", e);
  }
}
