import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, syncSubscription } from "@/lib/stripe/server";
import { completeOrder } from "@/lib/shop/orders";

export const runtime = "nodejs";

// POST — Stripe webhook. Whenever a subscription or its invoice changes in
// Stripe (started, renewed, payment failed, card updated, cancelled, ended…)
// the user's row is updated straight away. Signed with STRIPE_WEBHOOK_SECRET.
//
// Stripe endpoint: https://app.theadultinglife.com.au/api/stripe/webhook
// Events: customer.subscription.created / updated / deleted / paused /
// resumed / trial_will_end, invoice.paid, invoice.payment_failed,
// invoice.payment_action_required, payment_intent.succeeded (shop orders).
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "not_configured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch (e) {
    console.error("[stripe/webhook] bad signature:", e);
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    if (event.type.startsWith("customer.subscription.")) {
      // Re-read so an out-of-order event can't write stale state.
      const sub = event.data.object as Stripe.Subscription;
      const fresh = await stripe.subscriptions.retrieve(sub.id).catch(() => sub);
      await syncSubscription(fresh);
    } else if (event.type.startsWith("invoice.")) {
      const invoice = event.data.object as Stripe.Invoice;
      const ref = invoice.parent?.subscription_details?.subscription;
      const subId = typeof ref === "string" ? ref : ref?.id;
      if (subId) await syncSubscription(await stripe.subscriptions.retrieve(subId));
    } else if (event.type === "payment_intent.succeeded") {
      // A shop order paid.
      const orderId = (event.data.object as Stripe.PaymentIntent).metadata?.shop_order_id;
      if (orderId) await completeOrder(orderId);
    }
  } catch (e) {
    // A 500 makes Stripe retry later — what we want if the database blipped.
    console.error("[stripe/webhook] handler error", event.type, e);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
