import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

const STATE_COOKIE_PREFIX = "adultinglife_oauth_state_";
const STATE_TTL_SECONDS = 5 * 60;

export async function setOAuthState(provider: string): Promise<string> {
  const state = randomBytes(16).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(`${STATE_COOKIE_PREFIX}${provider}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: STATE_TTL_SECONDS,
    path: "/",
  });
  return state;
}

export async function verifyAndClearOAuthState(
  provider: string,
  incoming: string | null
): Promise<boolean> {
  if (!incoming) return false;
  const cookieStore = await cookies();
  const key = `${STATE_COOKIE_PREFIX}${provider}`;
  const stored = cookieStore.get(key)?.value;
  cookieStore.delete(key);
  return stored === incoming;
}
