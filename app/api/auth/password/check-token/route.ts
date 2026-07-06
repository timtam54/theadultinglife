import { NextRequest, NextResponse } from "next/server";
import { hashToken } from "@/lib/auth/password";
import { findUserByPasswordTokenHash } from "@/lib/db/users";
import { clientIp, rateLimit } from "@/lib/auth/rate-limit";

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!rateLimit(`pwd-check-ip:${ip}`, 30, 60_000).allowed) {
    return NextResponse.json({ status: "rate_limited" }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token;
  if (!token) return NextResponse.json({ status: "invalid" }, { status: 400 });

  const user = await findUserByPasswordTokenHash(hashToken(token));
  if (
    !user ||
    !user.password_set_expires_at ||
    new Date(user.password_set_expires_at).getTime() <= Date.now()
  ) {
    return NextResponse.json({ status: "invalid_or_expired" }, { status: 400 });
  }
  return NextResponse.json({ status: "ok", email: user.email });
}
