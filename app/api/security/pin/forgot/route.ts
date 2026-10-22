import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { findUserById, updateUser } from "@/lib/db/users";
import { generateSetupToken } from "@/lib/auth/password";
import { sendPinResetEmail } from "@/lib/auth/pin-email";
import { rateLimit } from "@/lib/auth/rate-limit";

/** POST /api/security/pin/forgot — emails the signed-in user a one-time
 *  link (valid 1 hour) to choose a new app PIN. Called from the lock
 *  screen, so the session exists but is still locked. */
export async function POST() {
  try {
    const session = await requireSession();
    if (!rateLimit(`pin-forgot:${session.user.id}`, 3, 3600_000).allowed) {
      return NextResponse.json(
        { error: "rate_limited", message: "We've already sent a few links. Check your inbox, or try again later." },
        { status: 429 }
      );
    }
    const user = await findUserById(session.user.id);
    if (!user?.email) {
      return NextResponse.json(
        { error: "no_email", message: "There's no email address on this account to send a link to." },
        { status: 409 }
      );
    }
    const { rawToken, tokenHash, expiresAt } = generateSetupToken("reset");
    await updateUser(user.id, {
      pin_reset_token_hash: tokenHash,
      pin_reset_expires_at: expiresAt,
    });
    await sendPinResetEmail({ email: user.email, rawToken });
    return NextResponse.json({ ok: true, email: user.email });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/security/pin/forgot] failed:", msg);
    return NextResponse.json({ error: "pin_forgot_failed", detail: msg }, { status: 500 });
  }
}
