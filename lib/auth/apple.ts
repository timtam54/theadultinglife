import * as jose from "jose";
import { appleConfigReady, redirectUriFor } from "./oauth-config";

export interface AppleProfile {
  id: string;
  email: string;
  name: string | null;
}

export function appleAuthUrl(state: string): string | null {
  if (!appleConfigReady()) return null;
  const clientId = process.env.APPLE_CLIENT_ID!;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUriFor("apple"),
    response_type: "code",
    scope: "name email",
    response_mode: "form_post",
    state,
  });
  return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}

export async function generateAppleClientSecret(): Promise<string> {
  const privateKey = process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const teamId = process.env.APPLE_TEAM_ID!;
  const clientId = process.env.APPLE_CLIENT_ID!;
  const keyId = process.env.APPLE_KEY_ID!;

  const key = await jose.importPKCS8(privateKey, "ES256");
  return new jose.SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime("5m")
    .setAudience("https://appleid.apple.com")
    .setSubject(clientId)
    .sign(key);
}

export async function exchangeAppleCode(
  code: string,
  userForm?: string | null
): Promise<AppleProfile> {
  if (!appleConfigReady()) throw new Error("Apple OAuth not configured");
  const clientId = process.env.APPLE_CLIENT_ID!;
  const clientSecret = await generateAppleClientSecret();

  const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUriFor("apple"),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok)
    throw new Error(`Apple token exchange failed: ${tokenRes.status}`);
  const tokenJson = (await tokenRes.json()) as { id_token: string };

  const claims = jose.decodeJwt(tokenJson.id_token) as {
    sub: string;
    email?: string;
  };

  let name: string | null = null;
  if (userForm) {
    try {
      const parsed = JSON.parse(userForm) as {
        name?: { firstName?: string; lastName?: string };
      };
      if (parsed?.name) {
        name = [parsed.name.firstName, parsed.name.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() || null;
      }
    } catch {
      // ignore parse errors — Apple only sends name on first auth
    }
  }

  return { id: claims.sub, email: claims.email ?? "", name };
}
