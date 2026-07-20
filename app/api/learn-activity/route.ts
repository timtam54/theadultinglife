import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { recordLearnActivity } from "@/lib/services/learnEngagement";
import { apiError } from "@/lib/api-error";

// Ticks the daily learning-activity ledger — used for streaks and badge
// recompute. Fires on lesson view (opt-in "Mark as read" is separate).
export async function POST() {
  try {
    const session = await requireSession();
    const { newBadges } = await recordLearnActivity(session.user.id);
    return NextResponse.json({ newBadges });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:learn-activity.POST", e);
  }
}
