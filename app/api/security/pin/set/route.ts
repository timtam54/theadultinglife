import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSession, setSessionUnlockedAt } from "@/lib/auth/session";
import { findUserById, updateUser } from "@/lib/db/users";

/** Set (or replace) the caller's app-lock PIN. Body: { pin: "1234" }.
 *  Enforces 4-digit numeric PINs. Stores bcrypt hash, stamps set-at,
 *  clears failed-attempt counters, and immediately marks the current
 *  session as unlocked so the user doesn't hit the lock screen
 *  immediately after setting the PIN. */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = (await req.json().catch(() => ({}))) as { pin?: string };
    const pin = String(body.pin ?? "");
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: "invalid_pin", message: "PIN must be exactly 4 digits." },
        { status: 400 }
      );
    }
    const hash = await bcrypt.hash(pin, 10);
    await updateUser(session.user.id, {
      app_pin_hash: hash,
      app_pin_set_at: new Date().toISOString(),
      pin_failed_attempts: 0,
      pin_locked_until: null,
    });
    // Grant the current session an immediate unlock so the just-set PIN
    // doesn't lock the user out of the app they're currently in.
    await setSessionUnlockedAt(Date.now());
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/security/pin/set] failed:", msg);
    return NextResponse.json(
      { error: "pin_set_failed", detail: msg },
      { status: 500 }
    );
  }
}
