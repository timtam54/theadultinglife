import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { getQuizWithQuestions } from "@/lib/db/quizzes";
import { recordQuizResult } from "@/lib/db/progress";
import { upsertProgress } from "@/lib/db/progress";
import { recordLearnActivity } from "@/lib/services/learnEngagement";
import { apiError } from "@/lib/api-error";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const result = await getQuizWithQuestions(id);
    if (!result)
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    const { quiz, questions } = result;

    const body = (await request.json().catch(() => null)) as {
      answers?: Record<string, string>;
    } | null;
    const answers = body?.answers ?? {};

    let score = 0;
    for (const q of questions) {
      if (answers[q.id] === q.correct_option_id) score += 1;
    }
    const total = questions.length;

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
    let newBadges: { id: string; label: string; description: string; tone: string; icon: string }[] = [];
    try {
      const { newBadges: awarded } = await recordLearnActivity(session.user.id);
      newBadges = awarded;
    } catch {
      // Streak/badge failures shouldn't break quiz submission.
    }

    return NextResponse.json({ score, total, newBadges });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:quizzes[id].submit.POST", e);
  }
}
