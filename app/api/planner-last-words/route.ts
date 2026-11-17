import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { upsertPlannerLastWords } from "@/lib/db/planner-last-words";
import { apiError } from "@/lib/api-error";
import { requireWriteAccess } from "@/lib/subscription/access";

export async function PUT(request: NextRequest) {
  const blocked = await requireWriteAccess();
  if (blocked) return blocked;
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as { body?: string };
    const row = await upsertPlannerLastWords(
      session.user.id,
      (body.body ?? "").trim()
    );
    return NextResponse.json({ lastWords: row });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:planner-last-words.PUT", e);
  }
}
