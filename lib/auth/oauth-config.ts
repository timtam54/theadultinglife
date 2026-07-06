// OAuth provider configuration. Reads from env; returns null if a provider
// isn't configured yet so the UI can show a friendly "coming soon" state.

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export type Provider = "google" | "microsoft" | "apple";

export interface OAuthConfig {
  provider: Provider;
  clientId: string;
  clientSecret: string; // for Apple, this is generated at request time
  redirectUri: string;
  scopes: string[];
}

export function redirectUriFor(provider: Provider): string {
  return `${APP_URL}/api/auth/${provider}/callback`;
}

export function googleConfig(): OAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return {
    provider: "google",
    clientId,
    clientSecret,
    redirectUri: redirectUriFor("google"),
    scopes: ["openid", "email", "profile"],
  };
}

export function microsoftConfig(): (OAuthConfig & { tenantId: string }) | null {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID ?? "common";
  if (!clientId || !clientSecret) return null;
  return {
    provider: "microsoft",
    clientId,
    clientSecret,
    redirectUri: redirectUriFor("microsoft"),
    scopes: ["openid", "profile", "email", "User.Read"],
    tenantId,
  };
}

export function appleConfigReady(): boolean {
  return Boolean(
    process.env.APPLE_CLIENT_ID &&
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_KEY_ID &&
      process.env.APPLE_PRIVATE_KEY
  );
}
