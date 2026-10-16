import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { isUserInFamilyGroup } from "@/lib/db/users";
import {
  isMealPlanSlot,
  saveMealPlanEntries,
  type MealPlanSlot,
} from "@/lib/db/meal-plan";
import { apiError } from "@/lib/api-error";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// POST — save many cells at once (used after reviewing a scanned plan).
// Body: { userId, overwrite, entries: [{ date, slot, body }] }
// With overwrite false, cells that already have a meal are left alone.
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as {
      userId?: unknown;
      overwrite?: unknown;
      entries?: unknown;
    };
    const userId = typeof body.userId === "string" ? body.userId : session.user.id;
    if (!Array.isArray(body.entries) || body.entries.length > 400) {
      return NextResponse.json({ error: "bad_entries" }, { status: 400 });
    }
    const entries: { date: string; slot: MealPlanSlot; body: string }[] = [];
    for (const e of body.entries as Record<string, unknown>[]) {
      if (
        !e ||
        typeof e.date !== "string" ||
        !DATE_RE.test(e.date) ||
        !isMealPlanSlot(e.slot) ||
        typeof e.body !== "string" ||
        !e.body.trim() ||
        e.body.length > 2000
      ) {
        return NextResponse.json({ error: "bad_entry" }, { status: 400 });
      }
      entries.push({ date: e.date, slot: e.slot, body: e.body.trim() });
    }
    if (!(await isUserInFamilyGroup(userId, session.user.familyGroupId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const saved = await saveMealPlanEntries({
      userId,
      familyGroupId: session.user.familyGroupId,
      entries,
      overwrite: body.overwrite === true,
    });
    return NextResponse.json({ saved });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:meal-plan.bulk.POST", e);
  }
}
