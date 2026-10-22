import { NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { requireSession, setSessionUnlockedAt, UnauthorizedError } from "@/lib/auth/session";
import { listPasskeys, markPasskeyUsed } from "@/lib/db/passkeys";
import { relyingParty, takeChallenge } from "@/lib/auth/webauthn";
import { updateUser } from "@/lib/db/users";

/** POST /api/security/face-id/unlock/verify — step 2: checks the device's
 *  signature and, if it's good, unlocks this session (same as a correct
 *  PIN, including clearing any wrong-PIN count). */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const rp = relyingParty(req);
    if (!rp) return NextResponse.json({ error: "bad_origin" }, { status: 400 });
    const challenge = await takeChallenge(session.user.id);
    if (!challenge) return NextResponse.json({ error: "expired" }, { status: 400 });
    const response = (await req.json()) as AuthenticationResponseJSON;

    const passkey = (await listPasskeys(session.user.id)).find(
      (p) => p.credential_id === response.id
    );
    if (!passkey) return NextResponse.json({ error: "unknown_device" }, { status: 400 });

    const result = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      requireUserVerification: true,
      credential: {
        id: passkey.credential_id,
        publicKey: new Uint8Array(Buffer.from(passkey.public_key, "base64url")),
        counter: Number(passkey.counter),
        transports: passkey.transports,
      },
    }).catch(() => null);
    if (!result?.verified) {
      return NextResponse.json({ error: "not_verified" }, { status: 401 });
    }
    await markPasskeyUsed(passkey.id, result.authenticationInfo.newCounter);
    await updateUser(session.user.id, { pin_failed_attempts: 0, pin_locked_until: null });
    await setSessionUnlockedAt(Date.now());
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[api/security/face-id/unlock/verify] failed:", e);
    return NextResponse.json({ error: "face_id_failed" }, { status: 500 });
  }
}
