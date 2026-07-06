import { NextResponse } from "next/server";
import { microsoftAuthUrl } from "@/lib/auth/microsoft";
import { setOAuthState } from "@/lib/auth/oauth-state";

export async function GET(request: Request) {
  const state = await setOAuthState("microsoft");
  const url = microsoftAuthUrl(state);
  if (!url) {
    return NextResponse.redirect(new URL("/login?error=provider_unconfigured&provider=microsoft", request.url));
  }
  return NextResponse.redirect(url);
}
