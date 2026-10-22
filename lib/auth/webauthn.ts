// Shared bits for Face ID / fingerprint unlock (WebAuthn). The device does
// the face or fingerprint check; we only verify its signature over a
// one-time challenge that we keep on the user row.

import { findUserById, updateUser } from "@/lib/db/users";

export const RP_NAME = "The Adulting Life";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/** The site the passkey belongs to, taken from the request. Browsers only
 *  let a page use passkeys for its own domain, so the Origin header of a
 *  genuine request is our own site; we still require it to match Host. */
export function relyingParty(req: Request): { rpID: string; origin: string } | null {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return null;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return null;
  }
  if (url.host !== host) return null;
  return { rpID: url.hostname, origin: url.origin };
}

export async function saveChallenge(userId: string, challenge: string): Promise<void> {
  await updateUser(userId, {
    webauthn_challenge: challenge,
    webauthn_challenge_expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
  });
}

/** Returns the pending challenge (if still valid) and clears it so it can
 *  only be used once. */
export async function takeChallenge(userId: string): Promise<string | null> {
  const user = await findUserById(userId);
  const challenge = user?.webauthn_challenge ?? null;
  const expires = user?.webauthn_challenge_expires_at;
  if (challenge) {
    await updateUser(userId, { webauthn_challenge: null, webauthn_challenge_expires_at: null });
  }
  if (!challenge || !expires || new Date(expires).getTime() <= Date.now()) return null;
  return challenge;
}

/** A friendly name for the device, from its browser's user agent. */
export function deviceLabelFrom(userAgent: string | null): string | null {
  if (!userAgent) return null;
  if (/iPhone/.test(userAgent)) return "iPhone";
  if (/iPad/.test(userAgent)) return "iPad";
  if (/Android/.test(userAgent)) return "Android device";
  if (/Macintosh/.test(userAgent)) return "Mac";
  if (/Windows/.test(userAgent)) return "Windows PC";
  return null;
}
