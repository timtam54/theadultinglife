import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { apiError } from "@/lib/api-error";
import { enforceAiRateLimit } from "@/lib/services/rate-limit";
import { isRateLimitOrSpendError, rateLimitResponse } from "@/lib/services/rate-limit-response";
import { searchAssist } from "@/lib/services/search-assist";

export const runtime = "nodejs";

// POST { q } — when the organiser search finds nothing, TAL AI suggests the
// folders and pages that fit (lib/services/search-assist.ts). Read-only, so
// view-only accounts can use it too.
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const { q } = (await request.json().catch(() => ({}))) as { q?: string };
    const query = (q ?? "").trim();
    if (!query) return NextResponse.json({ answer: "", matches: [] });
    await enforceAiRateLimit(session.user.id, "search-assist");
    return NextResponse.json(await searchAssist(session.user.id, query));
  } catch (e) {
    if (isRateLimitOrSpendError(e)) return rateLimitResponse(e);
    return apiError("api:search.ai.POST", e);
  }
}
