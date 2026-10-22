import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { insertPasskey } from "@/lib/db/passkeys";
import { deviceLabelFrom, relyingParty, takeChallenge } from "@/lib/auth/webauthn";
import { sendFaceIdOnEmail } from "@/lib/auth/pin-email";

/** POST /api/security/face-id/register/verify — step 2: checks the device's
 *  answer, saves its public key and emails the account holder. */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const rp = relyingParty(req);
    if (!rp) return NextResponse.json({ error: "bad_origin" }, { status: 400 });
    const challenge = await takeChallenge(session.user.id);
    if (!challenge) return NextResponse.json({ error: "expired" }, { status: 400 });
    const response = (await req.json()) as RegistrationResponseJSON;

    const result = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      requireUserVerification: true,
    }).catch(() => null);
    if (!result?.verified) {
      return NextResponse.json({ error: "not_verified" }, { status: 400 });
    }
    const { credential } = result.registrationInfo;
    const deviceLabel = deviceLabelFrom(req.headers.get("user-agent"));
    await insertPasskey({
      userId: session.user.id,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: credential.transports ?? [],
      deviceLabel,
    });
    if (session.user.email) {
      await sendFaceIdOnEmail({ email: session.user.email, deviceLabel }).catch((e) =>
        console.error("[api/security/face-id/register/verify] email failed:", e)
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[api/security/face-id/register/verify] failed:", e);
    return NextResponse.json({ error: "face_id_failed" }, { status: 500 });
  }
}
