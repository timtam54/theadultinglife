import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { upsertPlannerLastWords } from "@/lib/db/planner-last-words";
import { apiError } from "@/lib/api-error";

export async function PUT(request: NextRequest) {
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
