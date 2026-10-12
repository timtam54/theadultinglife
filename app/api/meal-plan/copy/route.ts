import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { isUserInFamilyGroup } from "@/lib/db/users";
import { copyMealPlanRange } from "@/lib/db/meal-plan";
import { apiError } from "@/lib/api-error";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// POST — copy a run of days forward. Only fills empty cells at the
// destination. Body: { userId, fromDate, days, offsetDays }
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as {
      userId?: unknown;
      fromDate?: unknown;
      days?: unknown;
      offsetDays?: unknown;
    };
    const userId = typeof body.userId === "string" ? body.userId : session.user.id;
    const { fromDate, days, offsetDays } = body;
    if (typeof fromDate !== "string" || !DATE_RE.test(fromDate)) {
      return NextResponse.json({ error: "bad_date" }, { status: 400 });
    }
    if (
      typeof days !== "number" || !Number.isInteger(days) || days < 1 || days > 31 ||
      typeof offsetDays !== "number" || !Number.isInteger(offsetDays) ||
      offsetDays < 1 || offsetDays > 31
    ) {
      return NextResponse.json({ error: "bad_range" }, { status: 400 });
    }
    if (!(await isUserInFamilyGroup(userId, session.user.familyGroupId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const copied = await copyMealPlanRange({
      userId,
      familyGroupId: session.user.familyGroupId,
      fromDate,
      days,
      offsetDays,
    });
    return NextResponse.json({ copied });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:meal-plan.copy.POST", e);
  }
}
