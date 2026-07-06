import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/db/users";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/auth/rate-limit";

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const ipLimit = rateLimit(`pwd-login-ip:${ip}`, 20, 60_000);
  if (!ipLimit.allowed) {
    return NextResponse.json({ status: "rate_limited" }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
  } | null;
  const email = body?.email?.toLowerCase().trim();
  const password = body?.password;
  if (!email || !password) {
    return NextResponse.json({ status: "invalid" }, { status: 400 });
  }

  const acctLimit = rateLimit(`pwd-login-acct:${email}`, 10, 60_000);
  if (!acctLimit.allowed) {
    return NextResponse.json({ status: "rate_limited" }, { status: 429 });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return NextResponse.json({ status: "needs_setup" }, { status: 404 });
  }
  if (user.auth_provider && user.auth_provider !== "password" && !user.password_hash) {
    return NextResponse.json(
      { status: "provider_conflict", provider: user.auth_provider },
      { status: 409 }
    );
  }
  if (!user.password_hash) {
    return NextResponse.json({ status: "needs_setup" }, { status: 404 });
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ status: "invalid" }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ status: "ok" });
}
