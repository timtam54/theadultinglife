import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { findUserById } from "@/lib/db/users";
import { getStripe, syncSubscription } from "@/lib/stripe/server";

export const runtime = "nodejs";

// GET — the signed-in user's subscription status, refreshed from Stripe (the
// popup checks this after paying, in case the webhook hasn't landed yet).
export async function GET() {
  try {
    const session = await requireSession();
    let user = await findUserById(session.user.id);
    if (user?.stripe_subscription_id) {
      const sub = await getStripe().subscriptions.retrieve(user.stripe_subscription_id).catch(() => null);
      if (sub) user = (await syncSubscription(sub)) ?? user;
    }
    return NextResponse.json({ status: user?.subscription_status ?? "none" });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("[api/stripe/status] failed:", e);
    return NextResponse.json({ error: "status_failed" }, { status: 500 });
  }
}
