import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

const STATE_COOKIE_PREFIX = "adultinglife_oauth_state_";
const STATE_TTL_SECONDS = 10 * 60;

type Provider = "google" | "microsoft" | "apple";

// Apple sends the callback as a cross-site POST. Safari (esp. iOS) does not send
// SameSite=Lax cookies on cross-site POSTs, so the state cookie must be
// SameSite=None; Secure for Apple. Google + Microsoft use top-level GET
// redirects, so Lax is fine and preferred (defence in depth).
function sameSiteFor(provider: string): "lax" | "none" {
  return provider === "apple" ? "none" : "lax";
}

export async function setOAuthState(provider: Provider): Promise<string> {
  const state = randomBytes(16).toString("base64url");
  const cookieStore = await cookies();
  const sameSite = sameSiteFor(provider);
  // Cross-site cookies (SameSite=None) require Secure — cannot be sent over HTTP.
  const secure = sameSite === "none" || process.env.NODE_ENV === "production";
  cookieStore.set(`${STATE_COOKIE_PREFIX}${provider}`, state, {
    httpOnly: true,
    secure,
    sameSite,
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
