import { microsoftConfig } from "./oauth-config";

export interface MicrosoftProfile {
  id: string;
  email: string;
  name: string | null;
}

export function microsoftAuthUrl(state: string): string | null {
  const cfg = microsoftConfig();
  if (!cfg) return null;
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: cfg.scopes.join(" "),
    state,
    response_mode: "query",
  });
  return `https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function exchangeMicrosoftCode(
  code: string
): Promise<MicrosoftProfile> {
  const cfg = microsoftConfig();
  if (!cfg) throw new Error("Microsoft OAuth not configured");

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: cfg.redirectUri,
        grant_type: "authorization_code",
      }),
    }
  );
  if (!tokenRes.ok)
    throw new Error(`Microsoft token exchange failed: ${tokenRes.status}`);
  const tokenJson = (await tokenRes.json()) as { access_token: string };

  const userRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!userRes.ok) throw new Error(`Microsoft graph failed: ${userRes.status}`);
  const u = (await userRes.json()) as {
    id: string;
    mail?: string;
    userPrincipalName?: string;
    displayName?: string;
  };
  const email = u.mail ?? u.userPrincipalName ?? "";
  return { id: u.id, email, name: u.displayName ?? null };
}
