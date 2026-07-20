import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { apiError } from "@/lib/api-error";
import { markPushAsked } from "@/lib/db/push-subscriptions";

// Called when the user declines the browser prompt (or clicks "Not now" in
// the wizard) so we don't keep re-asking on every visit.
export async function POST() {
  try {
    const session = await requireSession();
    await markPushAsked(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:push.asked.POST", e);
  }
}
