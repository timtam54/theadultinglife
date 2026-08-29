import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { findUserById, updateUser } from "@/lib/db/users";
import { getSquareClient } from "@/lib/square/client";

// Undo a cancel-at-period-end. In Square, a "cancel at period end" is
// represented as a pending CANCEL action on the subscription while status
// stays ACTIVE. To undo it we delete that action — subscriptions.resume is
// only for un-pausing a paused sub, not for undoing a scheduled cancel.
export async function POST() {
  try {
    const session = await requireSession();
    const user = await findUserById(session.user.id);
    if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const subscriptionId = user.square_subscription_id;
    if (!subscriptionId) {
      return NextResponse.json({ error: "no_subscription" }, { status: 400 });
    }

    const client = getSquareClient();

    // Load the subscription to find the pending CANCEL action id.
    // include: "actions" is REQUIRED — Square omits actions[] otherwise.
    const subResp = await client.subscriptions.get({
      subscriptionId,
      include: "actions",
    });
    const sub = subResp.subscription;
    if (!sub) {
      console.log("[resume] subscription not found", subscriptionId);
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    console.log(
      "[resume] before deleteAction — status:",
      sub.status,
      "canceledDate:",
      sub.canceledDate,
      "actions:",
      JSON.stringify(sub.actions ?? [])
    );

    const pendingCancel = (sub.actions ?? []).find(
      (a) => a.type === "CANCEL"
    );
    if (!pendingCancel?.id) {
      // Nothing to undo — either never cancelled, or already lapsed.
      // If our DB thinks it's canceled, reconcile.
      console.log("[resume] no pending CANCEL action found");
      if (user.subscription_status === "canceled") {
        await updateUser(user.id, { subscription_status: "active" });
      }
      return NextResponse.json({
        ok: true,
        note: "no_pending_cancel",
      });
    }

    console.log("[resume] deleting action", pendingCancel.id);
    await client.subscriptions.deleteAction({
      subscriptionId,
      actionId: pendingCancel.id,
    });

    // Re-fetch (with actions) to confirm the action is really gone.
    const after = await client.subscriptions.get({
      subscriptionId,
      include: "actions",
    });
    const remainingCancel = (after.subscription?.actions ?? []).find(
      (a) => a.type === "CANCEL"
    );
    console.log(
      "[resume] after deleteAction — status:",
      after.subscription?.status,
      "canceledDate:",
      after.subscription?.canceledDate,
      "remainingCancelAction:",
      remainingCancel?.id ?? null
    );

    await updateUser(user.id, { subscription_status: "active" });
    return NextResponse.json({
      ok: true,
      afterStatus: after.subscription?.status ?? null,
      afterCanceledDate: after.subscription?.canceledDate ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[resume] error", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
