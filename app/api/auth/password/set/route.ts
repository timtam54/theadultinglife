import { NextRequest, NextResponse } from "next/server";
import {
  hashPassword,
  hashToken,
  safeTokenMatch,
  validatePasswordStrength,
} from "@/lib/auth/password";
import { findUserByPasswordTokenHash, updateUser } from "@/lib/db/users";
import { createSession } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/auth/rate-limit";

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!rateLimit(`pwd-set-ip:${ip}`, 20, 60_000).allowed) {
    return NextResponse.json({ status: "rate_limited" }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as {
    token?: string;
    password?: string;
    name?: string;
  } | null;
  const token = body?.token;
  const password = body?.password;
  if (!token || !password) {
    return NextResponse.json({ status: "invalid" }, { status: 400 });
  }

  const strengthError = validatePasswordStrength(password);
  if (strengthError) {
    return NextResponse.json({ status: "weak", message: strengthError }, { status: 400 });
  }

  const user = await findUserByPasswordTokenHash(hashToken(token));
  if (
    !user ||
    !user.password_set_expires_at ||
    !user.password_set_token_hash ||
    new Date(user.password_set_expires_at).getTime() <= Date.now()
  ) {
    return NextResponse.json({ status: "invalid_or_expired" }, { status: 400 });
  }
  if (!safeTokenMatch(token, user.password_set_token_hash)) {
    return NextResponse.json({ status: "invalid_or_expired" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  await updateUser(user.id, {
    password_hash: passwordHash,
    password_set_token_hash: null,
    password_set_expires_at: null,
    auth_provider: user.auth_provider ?? "password",
    ...(body?.name ? { name: body.name } : {}),
  });

  await createSession(user.id);
  return NextResponse.json({ status: "ok" });
}
