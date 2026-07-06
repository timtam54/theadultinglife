import { NextRequest, NextResponse } from "next/server";
import { createUser, findUserByEmail, updateUser } from "@/lib/db/users";
import { generateSetupToken } from "@/lib/auth/password";
import { sendPasswordEmail } from "@/lib/auth/password-email";
import { clientIp, rateLimit } from "@/lib/auth/rate-limit";

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!rateLimit(`pwd-req-ip:${ip}`, 10, 60_000).allowed) {
    return NextResponse.json({ status: "rate_limited" }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.toLowerCase().trim();
  if (!email) return NextResponse.json({ status: "invalid" }, { status: 400 });

  if (!rateLimit(`pwd-req-email:${email}`, 5, 3600_000).allowed) {
    return NextResponse.json({ status: "rate_limited" }, { status: 429 });
  }

  let user = await findUserByEmail(email);

  // OAuth-only account exists — redirect to correct provider.
  if (user && user.auth_provider && user.auth_provider !== "password" && !user.password_hash) {
    return NextResponse.json({
      status: "provider_conflict",
      provider: user.auth_provider,
    });
  }

  const kind: "setup" | "reset" = user?.password_hash ? "reset" : "setup";
  const { rawToken, tokenHash, expiresAt } = generateSetupToken(kind);

  if (!user) {
    user = await createUser({ email, authProvider: "password" });
  }
  await updateUser(user.id, {
    password_set_token_hash: tokenHash,
    password_set_expires_at: expiresAt,
  });

  await sendPasswordEmail({ email, rawToken, kind });

  // Always respond ok to avoid email enumeration.
  return NextResponse.json({ status: "ok", kind });
}
