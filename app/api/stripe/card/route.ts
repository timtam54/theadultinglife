import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { findUserById } from "@/lib/db/users";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";

// POST { setupIntentId } — after the popup saves a new card (via
// /api/stripe/setup), make it the card for future payments, and retry an
// overdue invoice with it.
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const user = await findUserById(session.user.id);
    if (!user?.stripe_customer_id) return NextResponse.json({ error: "no_customer" }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { setupIntentId?: unknown };
    const stripe = getStripe();
    const intent = typeof body.setupIntentId === "string" ? await stripe.setupIntents.retrieve(body.setupIntentId) : null;
    const intentCustomer = intent && (typeof intent.customer === "string" ? intent.customer : intent.customer?.id);
    if (!intent || intent.status !== "succeeded" || intentCustomer !== user.stripe_customer_id || !intent.payment_method) {
      return NextResponse.json({ error: "card_not_saved", message: "Your card wasn't saved — please enter it again." }, { status: 400 });
    }
    const pm = typeof intent.payment_method === "string" ? intent.payment_method : intent.payment_method.id;
    await stripe.customers.update(user.stripe_customer_id, { invoice_settings: { default_payment_method: pm } });
    if (user.stripe_subscription_id) {
      const sub = await stripe.subscriptions.update(user.stripe_subscription_id, {
        default_payment_method: pm,
        expand: ["latest_invoice"],
      });
      const invoice = sub.latest_invoice;
      if (invoice && typeof invoice !== "string" && invoice.status === "open") {
        await stripe.invoices.pay(invoice.id!, { payment_method: pm }).catch(() => null);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("[api/stripe/card] failed:", e);
    return NextResponse.json({ error: "card_failed", message: "Couldn't update your card. Please try again." }, { status: 500 });
  }
}
