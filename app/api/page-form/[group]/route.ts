import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { saveAnswers } from "@/lib/services/pageForm";

type Ctx = { params: Promise<{ group: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { group } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as {
      answers?: Record<string, unknown>;
    };
    const answers = body.answers ?? {};
    if (typeof answers !== "object" || Array.isArray(answers)) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    await saveAnswers(session.user.id, group, answers as Record<string, unknown>);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/page-form/:group]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
