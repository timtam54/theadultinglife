import { NextResponse } from "next/server";
import { googleAuthUrl } from "@/lib/auth/google";
import { setOAuthState } from "@/lib/auth/oauth-state";

export async function GET(request: Request) {
  const state = await setOAuthState("google");
  const url = googleAuthUrl(state);
  if (!url) {
    return NextResponse.redirect(new URL("/login?error=provider_unconfigured&provider=google", request.url));
  }
  return NextResponse.redirect(url);
}
