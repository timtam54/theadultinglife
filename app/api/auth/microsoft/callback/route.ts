import { NextResponse } from "next/server";
import { exchangeMicrosoftCode } from "@/lib/auth/microsoft";
import { verifyAndClearOAuthState } from "@/lib/auth/oauth-state";
import { upsertOAuthUser } from "@/lib/auth/oauth-service";
import { createSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!(await verifyAndClearOAuthState("microsoft", state))) {
    return NextResponse.redirect(new URL("/login?error=state_mismatch", request.url));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  try {
    const profile = await exchangeMicrosoftCode(code);
    const user = await upsertOAuthUser({
      provider: "microsoft",
      providerId: profile.id,
      email: profile.email,
      name: profile.name,
    });
    await createSession(user.id);
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (e) {
    await logger.error("api:auth.microsoft.callback", e);
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }
}
