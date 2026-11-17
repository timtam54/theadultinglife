import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";

// Who can add and change things in the app (Donna, Nov 2026):
// - Until launch (SUBSCRIPTION_REQUIRED_FROM, default 1 Dec 2026) everyone.
// - After that, a family group with a live subscription (the account holder's
//   subscription covers their family members), and admins.
// - Everyone else is view-only: they can sign in, see and download all their
//   information, but not add, edit, upload or use the AI features. Saving
//   returns 402 { error: "subscription_required" } and the app shows the
//   subscribe prompt.
//
// Every route that changes data calls requireWriteAccess() first; the few
// that must always work (sign-in, subscribing, exports, account deletion,
// privacy requests…) are listed in scripts/check-write-access.ts.

const LAUNCH = process.env.SUBSCRIPTION_REQUIRED_FROM || "2026-12-01";

// "canceled" = cancelled but still inside the period they've paid for;
// "pending" = just subscribed and waiting on the first payment or a promo
// start. A failed payment ("delinquent") keeps full access for GRACE_DAYS
// from the first failure, with a warning to update their card; after that
// it's view-only until a payment goes through.
const FULL_ACCESS = new Set(["active", "canceled", "pending"]);
export const GRACE_DAYS = 7;

/** When a failed payment's grace period ends (null if not in one). */
export function graceEndsAt(failedAt: string | null | undefined): Date | null {
  return failedAt ? new Date(new Date(failedAt).getTime() + GRACE_DAYS * 86_400_000) : null;
}

export function subscriptionRequired(now = new Date()): boolean {
  return now >= new Date(`${LAUNCH}T00:00:00+10:00`);
}

/** Whether this user's family group can add and change things. */
export async function hasFullAccess(user: { id: string; role: string; familyGroupId: string }): Promise<boolean> {
  if (!subscriptionRequired() || user.role === "s") return true;
  const { data, error } = await createServiceClient()
    .from("users")
    .select("subscription_status, subscription_payment_failed_at")
    .eq("family_group_id", user.familyGroupId)
    .eq("is_primary", true)
    .maybeSingle();
  if (error) {
    // Don't lock people out because of a database blip.
    console.error("[subscription/access] lookup failed", error);
    return true;
  }
  const status = (data?.subscription_status as string | undefined) ?? "none";
  if (status === "delinquent") {
    const ends = graceEndsAt(data?.subscription_payment_failed_at as string | null);
    return !ends || new Date() < ends;
  }
  return FULL_ACCESS.has(status);
}

/** First line of every route that changes data: a 402 response to return
 *  when the user is view-only, otherwise null. Signed-out requests pass
 *  through so the route's own sign-in check answers them. */
export async function requireWriteAccess(): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session) return null;
  if (await hasFullAccess(session.user)) return null;
  return NextResponse.json(
    {
      error: "subscription_required",
      message: "Subscribe to TAL Premium to add or change your information. You can still view and download everything.",
    },
    { status: 402 }
  );
}
