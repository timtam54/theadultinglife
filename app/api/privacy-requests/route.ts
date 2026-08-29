import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  createPrivacyRequest,
  type PrivacyRequestKind,
} from "@/lib/db/privacy-requests";
import { sendPrivacyRequestEmail } from "@/lib/services/privacy-request-email";
import { clientIp, rateLimit } from "@/lib/auth/rate-limit";

const KINDS: PrivacyRequestKind[] = [
  "access",
  "correct",
  "export",
  "delete",
  "complaint",
  "other",
];

function isKind(v: unknown): v is PrivacyRequestKind {
  return typeof v === "string" && (KINDS as string[]).includes(v);
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  // Cheap abuse gate — one user shouldn't send more than 5 requests / hour.
  if (!rateLimit(`privacy-req-ip:${ip}`, 5, 3600_000).allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const session = await getSession();
  const body = (await request.json().catch(() => null)) as {
    kind?: string;
    message?: string;
    email?: string;
  } | null;
  if (!body) return NextResponse.json({ error: "bad_body" }, { status: 400 });

  if (!isKind(body.kind)) {
    return NextResponse.json({ error: "bad_kind" }, { status: 400 });
  }
  const message = (body.message ?? "").trim();
  // Prefer the session email; fall back to what they typed (allows non-signed-
  // in complaints if we ever expose this to logged-out users).
  const email =
    session?.user.email?.trim() ?? (body.email ?? "").trim();
  if (!email) {
    return NextResponse.json({ error: "email_required" }, { status: 400 });
  }

  const row = await createPrivacyRequest({
    userId: session?.user.id ?? null,
    email,
    kind: body.kind,
    message,
  });

  void sendPrivacyRequestEmail({
    requestId: row.id,
    fromEmail: email,
    fromUserId: row.user_id,
    kind: row.request_kind,
    message: row.message,
  }).catch(() => {
    /* email is best-effort; the DB row is the source of truth */
  });

  return NextResponse.json({ ok: true, id: row.id });
}
