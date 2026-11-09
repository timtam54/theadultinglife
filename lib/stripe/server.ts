import Stripe from "stripe";
import { findUserById, findUserByStripeCustomerId, updateUser } from "@/lib/db/users";
import type { UserRow } from "@/lib/db/types";

// Stripe billing — server side. The card is collected in a popup in the app
// (Stripe Elements), subscriptions are created here, and the webhook
// (/api/stripe/webhook) calls syncSubscription the moment anything changes in
// Stripe, so the user row is always current.

export type Plan = "monthly" | "annual";

export const PROMO_CODES = new Set(["adulting101"]);
export const PROMO_TRIAL_DAYS = 30;

let client: Stripe | null = null;
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return (client ??= new Stripe(key));
}

export function priceIdFor(plan: Plan): string {
  const id = plan === "annual" ? process.env.STRIPE_PRICE_ANNUAL : process.env.STRIPE_PRICE_MONTHLY;
  if (!id) throw new Error(`STRIPE_PRICE_${plan.toUpperCase()} is not set`);
  return id;
}

function planForPrice(priceId: string | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_ANNUAL) return "annual";
  if (priceId === process.env.STRIPE_PRICE_MONTHLY) return "monthly";
  return null;
}

/** Stripe's status → the app's existing subscription_status values. A
 *  subscription set to cancel at period end still has access ("canceled"
 *  means cancelled-but-running, as it did with Square). */
export function appStatus(sub: Stripe.Subscription): UserRow["subscription_status"] {
  switch (sub.status) {
    case "active":
    case "trialing":
      return sub.cancel_at_period_end ? "canceled" : "active";
    case "past_due":
    case "unpaid":
      return "delinquent";
    case "incomplete":
      return "pending";
    case "paused":
      return "paused";
    case "canceled":
    case "incomplete_expired":
    default:
      return "deactivated";
  }
}

const iso = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toISOString() : null);

/** Copy a subscription's state onto its user row. Finds the user from the
 *  subscription's metadata, else its customer. */
export async function syncSubscription(sub: Stripe.Subscription): Promise<UserRow | null> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const user =
    (sub.metadata?.user_id ? await findUserById(sub.metadata.user_id) : null) ??
    (await findUserByStripeCustomerId(customerId));
  if (!user) return null;
  // An old, replaced subscription mustn't overwrite the current one.
  if (user.stripe_subscription_id && user.stripe_subscription_id !== sub.id) {
    const replaced = sub.status === "canceled" || sub.status === "incomplete_expired";
    if (replaced) return user;
  }
  const item = sub.items?.data?.[0];
  return updateUser(user.id, {
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    subscription_status: appStatus(sub),
    subscription_plan: planForPrice(item?.price?.id),
    subscription_trial_end: sub.status === "trialing" ? iso(sub.trial_end) : null,
    subscription_period_end: iso(item?.current_period_end),
  });
}

/** The user's Stripe customer, created on first use. */
export async function customerFor(user: UserRow): Promise<string> {
  if (user.stripe_customer_id) return user.stripe_customer_id;
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.name || undefined;
  const customer = await getStripe().customers.create({
    email: user.email ?? undefined,
    name,
    metadata: { user_id: user.id },
  });
  await updateUser(user.id, { stripe_customer_id: customer.id });
  return customer.id;
}
