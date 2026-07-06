import { NextResponse } from "next/server";
import { appleAuthUrl } from "@/lib/auth/apple";
import { setOAuthState } from "@/lib/auth/oauth-state";

export async function GET(request: Request) {
  const state = await setOAuthState("apple");
  const url = appleAuthUrl(state);
  if (!url) {
    return NextResponse.redirect(new URL("/login?error=provider_unconfigured&provider=apple", request.url));
  }
  return NextResponse.redirect(url);
}
