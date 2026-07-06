import { googleConfig } from "./oauth-config";

export interface GoogleProfile {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
}

export function googleAuthUrl(state: string): string | null {
  const cfg = googleConfig();
  if (!cfg) return null;
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: cfg.scopes.join(" "),
    state,
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string): Promise<GoogleProfile> {
  const cfg = googleConfig();
  if (!cfg) throw new Error("Google OAuth not configured");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) throw new Error(`Google token exchange failed: ${tokenRes.status}`);
  const tokenJson = (await tokenRes.json()) as { access_token: string };

  const userRes = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { authorization: `Bearer ${tokenJson.access_token}` } }
  );
  if (!userRes.ok) throw new Error(`Google userinfo failed: ${userRes.status}`);
  const u = (await userRes.json()) as {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  };
  return {
    id: u.id,
    email: u.email,
    name: u.name ?? null,
    picture: u.picture ?? null,
  };
}
