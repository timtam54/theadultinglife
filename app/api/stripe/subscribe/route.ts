import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { findUserById, updateUser } from "@/lib/db/users";
import { PROMO_CODES, PROMO_TRIAL_DAYS, customerFor, getStripe, priceIdFor, syncSubscription, type Plan } from "@/lib/stripe/server";

export const runtime = "nodejs";

// POST { setupIntentId, plan, promoCode? } — step 2 of subscribing: the card
// saved in step 1 becomes the subscription's card. With an unused promo code
// it starts a 30-day free trial; otherwise the first payment is taken now.
// If the bank wants the payment confirmed (3-D Secure), the client secret
// comes back for the popup to confirm. The webhook then keeps the user row
// current; we also sync here so the app updates straight away.
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const user = await findUserById(session.user.id);
    if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { setupIntentId?: unknown; plan?: unknown; promoCode?: unknown };
    const plan: Plan = body.plan === "annual" ? "annual" : "monthly";
    const stripe = getStripe();

    // Already subscribed? (An unfinished, never-paid attempt is replaced.)
    if (user.stripe_subscription_id) {
      const existing = await stripe.subscriptions.retrieve(user.stripe_subscription_id).catch(() => null);
      if (existing && ["active", "trialing", "past_due", "unpaid", "paused"].includes(existing.status)) {
        return NextResponse.json({ error: "already_subscribed", message: "You already have a subscription." }, { status: 409 });
      }
      if (existing?.status === "incomplete") await stripe.subscriptions.cancel(existing.id).catch(() => null);
    }

    const customer = await customerFor(user);
    const setupIntentId = typeof body.setupIntentId === "string" ? body.setupIntentId : "";
    const intent = setupIntentId ? await stripe.setupIntents.retrieve(setupIntentId) : null;
    const intentCustomer = intent && (typeof intent.customer === "string" ? intent.customer : intent.customer?.id);
    if (!intent || intent.status !== "succeeded" || intentCustomer !== customer || !intent.payment_method) {
      return NextResponse.json({ error: "card_not_saved", message: "Your card wasn't saved — please enter it again." }, { status: 400 });
    }
    const paymentMethod = typeof intent.payment_method === "string" ? intent.payment_method : intent.payment_method.id;
    await stripe.customers.update(customer, { invoice_settings: { default_payment_method: paymentMethod } });

    const promo = typeof body.promoCode === "string" ? body.promoCode.trim().toLowerCase() : "";
    const trial = promo && PROMO_CODES.has(promo) && !user.promo_code_used;

    const sub = await stripe.subscriptions.create({
      customer,
      items: [{ price: priceIdFor(plan) }],
      default_payment_method: paymentMethod,
      ...(trial ? { trial_period_days: PROMO_TRIAL_DAYS } : {}),
      payment_behavior: "allow_incomplete",
      metadata: { user_id: user.id, plan, ...(trial ? { promo } : {}) },
      expand: ["latest_invoice.confirmation_secret"],
    });
    if (trial) await updateUser(user.id, { promo_code_used: promo });
    await syncSubscription(sub);

    const invoice = sub.latest_invoice as Stripe.Invoice | null;
    if (sub.status === "incomplete" && invoice?.confirmation_secret?.client_secret) {
      return NextResponse.json({ status: "requires_action", clientSecret: invoice.confirmation_secret.client_secret });
    }
    return NextResponse.json({ status: sub.status });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("[api/stripe/subscribe] failed:", e);
    const message = (e as { type?: string; message?: string }).type === "StripeCardError" ? (e as Error).message : "Couldn't start your subscription. Please try again.";
    return NextResponse.json({ error: "subscribe_failed", message }, { status: 500 });
  }
}
