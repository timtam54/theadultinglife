import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { findQuiz } from "@/content/learning";
import { recordQuizResult } from "@/lib/db/progress";
import { upsertProgress } from "@/lib/db/progress";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const quiz = findQuiz(id);
    if (!quiz) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = (await request.json().catch(() => null)) as {
      answers?: Record<string, string>;
    } | null;
    const answers = body?.answers ?? {};

    let score = 0;
    for (const q of quiz.questions) {
      if (answers[q.id] === q.correctOptionId) score += 1;
    }
    const total = quiz.questions.length;

    await recordQuizResult({
      userId: session.user.id,
      quizId: quiz.id,
      score,
      total,
      answers,
    });
    await upsertProgress({
      userId: session.user.id,
      itemType: "quiz",
      itemId: quiz.id,
      status: "completed",
      meta: { score, total },
    });

    return NextResponse.json({ score, total });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/quizzes/:id/submit]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
