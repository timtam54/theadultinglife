import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { findUserById } from "@/lib/db/users";
import { getStripe, syncSubscription } from "@/lib/stripe/server";

export const runtime = "nodejs";

// POST — undo a cancellation that hasn't taken effect yet.
export async function POST() {
  try {
    const session = await requireSession();
    const user = await findUserById(session.user.id);
    if (!user?.stripe_subscription_id) return NextResponse.json({ error: "no_subscription" }, { status: 404 });
    const sub = await getStripe().subscriptions.update(user.stripe_subscription_id, { cancel_at_period_end: false });
    const updated = await syncSubscription(sub);
    return NextResponse.json({ ok: true, status: updated?.subscription_status ?? null });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("[api/stripe/resume] failed:", e);
    return NextResponse.json({ error: "resume" + "_failed", message: "Couldn't update your subscription. Please try again." }, { status: 500 });
  }
}
