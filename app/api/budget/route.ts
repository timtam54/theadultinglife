import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createBudget, getBudgetForUser } from "@/lib/db/budgets";
import { canAccessUser, handleError } from "@/lib/services/life-goals-api";

// GET — one family member's budget with its lines (null if not started).
// Query: ?userId=…
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const userId = request.nextUrl.searchParams.get("userId") ?? session.user.id;
    if (!(await canAccessUser(userId, session.user.familyGroupId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return NextResponse.json({ budget: await getBudgetForUser(userId) });
  } catch (e) {
    return handleError("api:budget.GET", e);
  }
}

// POST — start a budget, pre-filled with the template's lines. Body: { userId }
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as { userId?: unknown };
    const userId = typeof body.userId === "string" ? body.userId : session.user.id;
    if (!(await canAccessUser(userId, session.user.familyGroupId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const budget = await createBudget(userId, session.user.familyGroupId);
    return NextResponse.json({ budget }, { status: 201 });
  } catch (e) {
    return handleError("api:budget.POST", e);
  }
}
