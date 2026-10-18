import { NextRequest, NextResponse } from "next/server";
import { CRISIS_REPLY, needsCrisisResponse } from "@/lib/services/crisis";
import { requireSession } from "@/lib/auth/session";
import { getLifeGoalProfile, listLifeGoals } from "@/lib/db/life-goals";
import { coachTurn, type CoachMessage } from "@/lib/services/goal-coach";
import { enforceAiRateLimit } from "@/lib/services/rate-limit";
import {
  isRateLimitOrSpendError,
  rateLimitResponse,
} from "@/lib/services/rate-limit-response";
import { canAccessUser, handleError } from "@/lib/services/life-goals-api";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_MESSAGES = 60;
const MAX_CHARS = 3000;

// POST — one turn of the goal-planning chat. Body: { userId, messages }.
// Returns { reply, plan } where plan is a full draft once the interview is
// done (or the user asks for it). Nothing is saved here.
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as {
      userId?: unknown;
      messages?: unknown;
    };
    const userId = typeof body.userId === "string" ? body.userId : session.user.id;
    if (!(await canAccessUser(userId, session.user.familyGroupId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (
      !Array.isArray(body.messages) ||
      body.messages.length === 0 ||
      body.messages.length > MAX_MESSAGES
    ) {
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
      return NextResponse.json(
        { error: "AI is not configured on this server." },
        { status: 503 }
      );
    }
    // Safety first: a message suggesting self-harm gets crisis support and
    // the coach stops, without calling the AI.
    if (needsCrisisResponse(messages)) {
      return NextResponse.json({ reply: CRISIS_REPLY, plan: null });
    }
    await enforceAiRateLimit(session.user.id, "goal-coach");

    // Let the coach build on what's already on the page instead of
    // re-asking it or duplicating goals.
    const [goals, profile] = await Promise.all([
      listLifeGoals(userId),
      getLifeGoalProfile(userId),
    ]);
    const existingSummary =
      goals.length === 0 && !profile?.life_vision
        ? "The user's page is currently empty."
        : [
            "What is already on the user's page (don't duplicate these goals; you can help add new ones or refine these if asked):",
            profile?.life_vision ? `- Life I want to build: ${profile.life_vision}` : null,
            ...goals.map((g) => `- Goal: ${g.title}${g.target_date ? ` (target ${g.target_date})` : ""}`),
          ]
            .filter(Boolean)
            .join("\n");

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: session.user.timezone || "Australia/Sydney",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const turn = await coachTurn({ messages, today, existingSummary });
    return NextResponse.json(turn);
  } catch (e) {
    if (isRateLimitOrSpendError(e)) return rateLimitResponse(e);
    return handleError("api:life-goals.coach.POST", e);
  }
}
