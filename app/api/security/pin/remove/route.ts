import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSession } from "@/lib/auth/session";
import { findUserById, updateUser } from "@/lib/db/users";

/** Removes the caller's app-lock PIN entirely — the app-lock feature
 *  is turned off for them. To prevent a passer-by from disabling the
 *  lock on someone else's unlocked phone, we require the current PIN
 *  in the request body: { pin: "1234" }. */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const user = await findUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (!user.app_pin_hash) {
      // No PIN set → nothing to remove. Idempotent success.
      return NextResponse.json({ ok: true, alreadyRemoved: true });
    }
    const body = (await req.json().catch(() => ({}))) as { pin?: string };
    const pin = String(body.pin ?? "");
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: "invalid_pin" },
        { status: 400 }
      );
    }
    const ok = await bcrypt.compare(pin, user.app_pin_hash);
    if (!ok) {
      return NextResponse.json(
        { error: "wrong_pin" },
        { status: 401 }
      );
    }
    await updateUser(session.user.id, {
      app_pin_hash: null,
      app_pin_set_at: null,
      pin_failed_attempts: 0,
      pin_locked_until: null,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/security/pin/remove] failed:", msg);
    return NextResponse.json(
      { error: "pin_remove_failed", detail: msg },
      { status: 500 }
    );
  }
}
