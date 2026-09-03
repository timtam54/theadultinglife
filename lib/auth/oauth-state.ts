import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

const STATE_COOKIE_PREFIX = "adultinglife_oauth_state_";
const STATE_TTL_SECONDS = 10 * 60;

type Provider = "google" | "microsoft" | "apple";

// All OAuth flows leave our origin and return via a cross-site redirect (or
// POST for Apple). In a browser tab, SameSite=Lax survives that hop. In an
// installed PWA (iOS especially, but Android too under some webviews) the
// return is treated as a different browsing context and Lax cookies are
// stripped, causing state_mismatch. SameSite=None; Secure works everywhere
// because it explicitly allows cross-site delivery.
//
// Trade-off: SameSite=None slightly weakens CSRF defence in exchange for
// working in PWAs. The state value itself is a 128-bit random single-use
// nonce with a 10-minute TTL, so CSRF is still adequately protected.
export async function setOAuthState(provider: Provider): Promise<string> {
  const state = randomBytes(16).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(`${STATE_COOKIE_PREFIX}${provider}`, state, {
    httpOnly: true,
    // Secure is required with SameSite=None. In dev over http://localhost,
    // browsers accept Secure cookies on localhost as a special case.
    secure: true,
    sameSite: "none",
    maxAge: STATE_TTL_SECONDS,
    path: "/",
  });
  return state;
}

export async function verifyAndClearOAuthState(
  provider: Provider,
  incoming: string | null
): Promise<boolean> {
  if (!incoming) return false;
  const cookieStore = await cookies();
  const key = `${STATE_COOKIE_PREFIX}${provider}`;
  const stored = cookieStore.get(key)?.value;
  cookieStore.delete(key);
  return stored === incoming;
}
