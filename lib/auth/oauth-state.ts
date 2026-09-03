import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

const STATE_COOKIE_PREFIX = "adultinglife_oauth_state_";
const STATE_TTL_SECONDS = 10 * 60;

type Provider = "google" | "microsoft" | "apple";

// Per-provider cookie SameSite policy:
//   - Google:    Lax  — Google's return is a top-level GET, Lax survives even
//                       in PWAs; empirically None broke PWA Google sign-in.
//   - Microsoft: None — PWA Microsoft return is treated as a different
//                       browsing context; Lax strips the cookie.
//   - Apple:     None — Apple posts to callback cross-site; Lax always drops.
function sameSiteFor(provider: string): "lax" | "none" {
  return provider === "google" ? "lax" : "none";
}

export async function setOAuthState(provider: Provider): Promise<string> {
  const state = randomBytes(16).toString("base64url");
  const cookieStore = await cookies();
  const sameSite = sameSiteFor(provider);
  // Cross-site cookies (SameSite=None) require Secure. Lax cookies need
  // Secure in production only.
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
