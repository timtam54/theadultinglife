import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { listPasskeys } from "@/lib/db/passkeys";
import { relyingParty, RP_NAME, saveChallenge } from "@/lib/auth/webauthn";

/** POST /api/security/face-id/register/options — step 1 of turning on
 *  Face ID for this device: the options the browser passes to the device. */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const rp = relyingParty(req);
    if (!rp) return NextResponse.json({ error: "bad_origin" }, { status: 400 });
    const existing = await listPasskeys(session.user.id);
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: rp.rpID,
      userName: session.user.email ?? session.user.id,
      userDisplayName: session.user.name ?? session.user.email ?? "",
      userID: new TextEncoder().encode(session.user.id),
      attestationType: "none",
      // Don't register the same device twice.
      excludeCredentials: existing.map((p) => ({ id: p.credential_id, transports: p.transports })),
      // This device's own Face ID / fingerprint, not a security key or phone.
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        // A key that stays on this device (not a synced "passkey"). Android
        // otherwise saves it to Google Password Manager, which asks for a
        // Google Password Manager PIN / old phone's screen lock first. The
        // unlock step already knows whose keys to ask for, so a device-bound
        // key is all that's needed.
        residentKey: "discouraged",
        requireResidentKey: false,
        userVerification: "required",
      },
    });
    await saveChallenge(session.user.id, options.challenge);
    return NextResponse.json(options);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[api/security/face-id/register/options] failed:", e);
    return NextResponse.json({ error: "face_id_failed" }, { status: 500 });
  }
}
