import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { listPasskeys } from "@/lib/db/passkeys";
import { relyingParty, saveChallenge } from "@/lib/auth/webauthn";

/** POST /api/security/face-id/unlock/options — step 1 of unlocking the app
 *  lock with Face ID. Only this person's registered devices are allowed. */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const rp = relyingParty(req);
    if (!rp) return NextResponse.json({ error: "bad_origin" }, { status: 400 });
    const passkeys = await listPasskeys(session.user.id);
    if (passkeys.length === 0) {
      return NextResponse.json({ error: "no_face_id" }, { status: 409 });
    }
    const options = await generateAuthenticationOptions({
      rpID: rp.rpID,
      allowCredentials: passkeys.map((p) => ({ id: p.credential_id, transports: p.transports })),
      userVerification: "required",
    });
    await saveChallenge(session.user.id, options.challenge);
    return NextResponse.json(options);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[api/security/face-id/unlock/options] failed:", e);
    return NextResponse.json({ error: "face_id_failed" }, { status: 500 });
  }
}
