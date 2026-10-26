import { NextRequest, NextResponse } from "next/server";
import { CRISIS_REPLY, needsCrisisResponse } from "@/lib/services/crisis";
import { requireSession } from "@/lib/auth/session";
import { listQuestionsBySubcategory } from "@/lib/db/questions";
import { getUserSubcategory } from "@/lib/services/subcategories";
import { FORM_COACHES } from "@/lib/form-coaches";
import { coachFormTurn, type CoachMessage } from "@/lib/services/form-coach";
import { enforceAiRateLimit } from "@/lib/services/rate-limit";
import { isRateLimitOrSpendError, rateLimitResponse } from "@/lib/services/rate-limit-response";
import { canAccessUser, handleError } from "@/lib/services/life-goals-api";
import { localToday } from "@/lib/budget";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_MESSAGES = 60;
const MAX_CHARS = 3000;

// POST — one turn of a folder form's AI coach. Body: { subcategoryId,
// userId, messages }. Returns { reply, answers } — answers is a draft entry
// keyed by question id once the coach has enough. Nothing is saved here.
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as {
      subcategoryId?: unknown;
      userId?: unknown;
      messages?: unknown;
    };
    const subcategoryId = typeof body.subcategoryId === "string" ? body.subcategoryId : "";
    const coach = FORM_COACHES[subcategoryId];
    if (!coach) return NextResponse.json({ error: "no_coach" }, { status: 404 });
    const userId = typeof body.userId === "string" ? body.userId : session.user.id;
    if (!(await canAccessUser(userId, session.user.familyGroupId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
      return NextResponse.json({ error: "bad_messages" }, { status: 400 });
    }
    const messages: CoachMessage[] = [];
    for (const m of body.messages as Record<string, unknown>[]) {
      if (
        !m ||
        (m.role !== "user" && m.role !== "assistant") ||
        typeof m.content !== "string" ||
        !m.content.trim() ||
        m.content.length > MAX_CHARS
      ) {
        return NextResponse.json({ error: "bad_message" }, { status: 400 });
      }
      messages.push({ role: m.role, content: m.content });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "AI is not configured on this server." }, { status: 503 });
    }
    // Safety first: a message suggesting self-harm gets crisis support and
    // the coach stops, without calling the AI.
    if (needsCrisisResponse(messages)) {
      return NextResponse.json({ reply: CRISIS_REPLY, answers: null });
    }
    await enforceAiRateLimit(session.user.id, "form-coach");

    const [folder, questions] = await Promise.all([
      getUserSubcategory(session.user.id, subcategoryId),
      listQuestionsBySubcategory(subcategoryId),
    ]);
    const turn = await coachFormTurn({
      folderName: folder?.name ?? coach.title,
      guidance: coach.guidance,
      model: coach.model,
      questions,
      messages,
      today: localToday(session.user.timezone),
    });
    return NextResponse.json(turn);
  } catch (e) {
    if (isRateLimitOrSpendError(e)) return rateLimitResponse(e);
    return handleError("api:form-coach.POST", e);
  }
}
