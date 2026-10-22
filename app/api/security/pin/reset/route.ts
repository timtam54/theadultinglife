import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession, setSessionUnlockedAt } from "@/lib/auth/session";
import { hashToken, safeTokenMatch } from "@/lib/auth/password";
import { findUserByPinResetTokenHash, updateUser } from "@/lib/db/users";
import { sendPinSetEmail } from "@/lib/auth/pin-email";
import { clientIp, rateLimit } from "@/lib/auth/rate-limit";

async function userForToken(token: string) {
  const user = await findUserByPinResetTokenHash(hashToken(token));
  if (
    !user ||
    !user.pin_reset_token_hash ||
    !user.pin_reset_expires_at ||
    new Date(user.pin_reset_expires_at).getTime() <= Date.now() ||
    !safeTokenMatch(token, user.pin_reset_token_hash)
  ) {
    return null;
  }
  return user;
}

/** POST /api/security/pin/reset — body { token, pin? }.
 *  Without a pin: just checks the emailed link is still valid.
 *  With a pin: sets it, clears the link + any lockout, and emails a
 *  "PIN reset" notice. The link may be opened on a different device from
 *  the locked one, so no session is required; if this browser IS signed in
 *  as the same person, it's unlocked straight away. */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`pin-reset-ip:${ip}`, 20, 60_000).allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as { token?: string; pin?: string };
    const token = String(body.token ?? "");
    const user = token ? await userForToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: "invalid_or_expired" }, { status: 400 });
    }
    if (body.pin === undefined) {
      return NextResponse.json({ ok: true });
    }
    const pin = String(body.pin);
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: "invalid_pin", message: "PIN must be exactly 4 digits." },
        { status: 400 }
      );
    }
    await updateUser(user.id, {
      app_pin_hash: await bcrypt.hash(pin, 10),
      app_pin_set_at: new Date().toISOString(),
      pin_failed_attempts: 0,
      pin_locked_until: null,
      pin_reset_token_hash: null,
      pin_reset_expires_at: null,
    });
    const session = await getSession();
    const signedInHere = session?.user.id === user.id;
    if (signedInHere) await setSessionUnlockedAt(Date.now());
    if (user.email) {
      await sendPinSetEmail({ email: user.email, kind: "reset" }).catch((e) =>
        console.error("[api/security/pin/reset] email failed:", e)
      );
    }
    return NextResponse.json({ ok: true, signedInHere });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/security/pin/reset] failed:", msg);
    return NextResponse.json({ error: "pin_reset_failed", detail: msg }, { status: 500 });
  }
}
