import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { findUserById, updateUser } from "@/lib/db/users";
import { getSquareClient } from "@/lib/square/client";

export async function POST() {
  try {
    const session = await requireSession();
    const user = await findUserById(session.user.id);
    if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const subscriptionId = user.square_subscription_id;
    if (!subscriptionId) {
      return NextResponse.json(
        { error: "no_subscription" },
        { status: 400 }
      );
    }

    const client = getSquareClient();
    try {
      const resp = await client.subscriptions.cancel({ subscriptionId });
      const canceled = resp.subscription;
      if (!canceled) {
        return NextResponse.json(
          { error: "cancel_failed", errors: resp.errors },
          { status: 502 }
        );
      }

      // Cancel-at-period-end: Square keeps status ACTIVE and just schedules
      // the cancel. Reflect that in our DB.
      await updateUser(user.id, { subscription_status: "canceled" });

      return NextResponse.json({
        ok: true,
        canceledDate: canceled.canceledDate ?? null,
        chargedThroughDate: canceled.chargedThroughDate ?? null,
      });
    } catch (cancelErr) {
      // Square returns 400 BAD_REQUEST if the sub already has a pending
      // cancel. Treat that as success — the desired end state is already in
      // place — and re-fetch the sub to return the accurate dates.
      const msg = cancelErr instanceof Error ? cancelErr.message : String(cancelErr);
      if (msg.includes("already has a pending cancel")) {
        try {
          const cur = await client.subscriptions.get({
            subscriptionId,
            include: "actions",
          });
          const sub = cur.subscription;
          await updateUser(user.id, { subscription_status: "canceled" });
          return NextResponse.json({
            ok: true,
            alreadyPending: true,
            canceledDate: sub?.canceledDate ?? null,
            chargedThroughDate: sub?.chargedThroughDate ?? null,
          });
        } catch {
          return NextResponse.json({ ok: true, alreadyPending: true });
        }
      }
      throw cancelErr;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
