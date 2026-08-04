import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { insertAiFeedback } from "@/lib/db/ai-feedback";
import { apiError } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as {
      kind?: string;
      messageId?: string;
      messageText?: string;
      note?: string;
    };
    if (body.kind !== "unhelpful_or_unsafe") {
      return NextResponse.json({ error: "bad_kind" }, { status: 400 });
    }
    const row = await insertAiFeedback({
      userId: session.user.id,
      kind: body.kind,
      messageId: body.messageId ?? null,
      messageText: (body.messageText ?? null)?.slice(0, 8000) ?? null,
      note: body.note?.slice(0, 2000) ?? null,
    });
    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:tal-ai.feedback.POST", e);
  }
}
