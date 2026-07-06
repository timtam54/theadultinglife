import { NextResponse } from "next/server";
import { exchangeAppleCode } from "@/lib/auth/apple";
import { verifyAndClearOAuthState } from "@/lib/auth/oauth-state";
import { upsertOAuthUser } from "@/lib/auth/oauth-service";
import { createSession } from "@/lib/auth/session";

// Apple sends the callback as a form POST.
export async function POST(request: Request) {
  const form = await request.formData();
  const code = form.get("code")?.toString() ?? null;
  const state = form.get("state")?.toString() ?? null;
  const userForm = form.get("user")?.toString() ?? null;

  if (!(await verifyAndClearOAuthState("apple", state))) {
    return NextResponse.redirect(new URL("/login?error=state_mismatch", request.url), 303);
  }
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url), 303);
  }

  try {
    const profile = await exchangeAppleCode(code, userForm);
    const user = await upsertOAuthUser({
      provider: "apple",
      providerId: profile.id,
      email: profile.email,
      name: profile.name,
    });
    await createSession(user.id);
    return NextResponse.redirect(new URL("/dashboard", request.url), 303);
  } catch (e) {
    console.error("[auth/apple/callback]", e);
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url), 303);
  }
}
