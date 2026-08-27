import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import {
  upsertPlannerWish,
  type WishAudience,
} from "@/lib/db/planner-wishes";
import { apiError } from "@/lib/api-error";

type Ctx = { params: Promise<{ audience: string }> };

const ALLOWED = new Set<WishAudience>([
  "general",
  "spouse",
  "children",
  "relatives",
  "friends",
  "pets",
  "other",
]);

function isAllowed(x: string): x is WishAudience {
  return (ALLOWED as Set<string>).has(x);
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { audience } = await ctx.params;
    if (!isAllowed(audience)) {
      return NextResponse.json({ error: "invalid_audience" }, { status: 400 });
    }
    const body = (await request.json().catch(() => ({}))) as { body?: string };
    const wish = await upsertPlannerWish(
      session.user.id,
      audience,
      (body.body ?? "").trim()
    );
    return NextResponse.json({ wish });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:planner-wishes[audience].PUT", e);
  }
}
