import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSession, setSessionUnlockedAt } from "@/lib/auth/session";
import { findUserById, updateUser } from "@/lib/db/users";

// Brute-force protection: 5 wrong attempts locks the PIN for 15 minutes.
// While locked, the only escape is signing out and back in — that clears
// the counter (because the user proved identity via OAuth/password).
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

/** POST /api/security/pin/verify — body { pin: "1234" }.
 *  On success: sets session.unlockedAt to now, resets failure counters,
 *  returns { ok: true }. On failure: increments counter, if >= 5 stamps
 *  pin_locked_until and returns 429. */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const user = await findUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (!user.app_pin_hash) {
      return NextResponse.json({ error: "no_pin_set" }, { status: 409 });
    }
    // Lockout still active?
    if (
      user.pin_locked_until &&
      new Date(user.pin_locked_until).getTime() > Date.now()
    ) {
      const remainMs =
        new Date(user.pin_locked_until).getTime() - Date.now();
      return NextResponse.json(
        {
          error: "pin_locked",
          retryAfterMs: remainMs,
          message:
            "Too many wrong attempts. Sign out and sign back in to reset.",
        },
        { status: 429 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as { pin?: string };
    const pin = String(body.pin ?? "");
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: "invalid_pin_format" },
        { status: 400 }
      );
    }

    const ok = await bcrypt.compare(pin, user.app_pin_hash);
    if (ok) {
      await updateUser(session.user.id, {
        pin_failed_attempts: 0,
        pin_locked_until: null,
      });
      await setSessionUnlockedAt(Date.now());
      return NextResponse.json({ ok: true });
    }

    const nextFails = (user.pin_failed_attempts ?? 0) + 1;
    if (nextFails >= MAX_ATTEMPTS) {
      await updateUser(session.user.id, {
        pin_failed_attempts: 0,
        pin_locked_until: new Date(Date.now() + LOCKOUT_MS).toISOString(),
      });
      return NextResponse.json(
        {
          error: "pin_locked",
          retryAfterMs: LOCKOUT_MS,
          message:
            "Too many wrong attempts. Sign out and sign back in to reset.",
        },
        { status: 429 }
      );
    }
    await updateUser(session.user.id, {
      pin_failed_attempts: nextFails,
    });
    return NextResponse.json(
      {
        error: "wrong_pin",
        attemptsLeft: MAX_ATTEMPTS - nextFails,
      },
      { status: 401 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/security/pin/verify] failed:", msg);
    return NextResponse.json(
      { error: "pin_verify_failed", detail: msg },
      { status: 500 }
    );
  }
}
