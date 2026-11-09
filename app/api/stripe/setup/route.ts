import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { findUserById } from "@/lib/db/users";
import { customerFor, getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";

// POST — step 1 of subscribing or changing card: a SetupIntent the popup's
// card form confirms (with 3-D Secure if the bank asks). Returns its client
// secret; the card details go straight to Stripe, never through here.
export async function POST() {
  try {
    const session = await requireSession();
    const user = await findUserById(session.user.id);
    if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const customer = await customerFor(user);
    const intent = await getStripe().setupIntents.create({
      customer,
      usage: "off_session",
      automatic_payment_methods: { enabled: true },
      metadata: { user_id: user.id },
    });
    return NextResponse.json({ clientSecret: intent.client_secret });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("[api/stripe/setup] failed:", e);
    return NextResponse.json({ error: "setup_failed", message: "Couldn't start the payment form. Please try again." }, { status: 500 });
  }
}
