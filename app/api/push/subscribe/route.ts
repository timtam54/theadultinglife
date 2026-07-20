import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { apiError } from "@/lib/api-error";
import {
  markPushAsked,
  upsertPushSubscription,
} from "@/lib/db/push-subscriptions";

interface Body {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => null)) as Body | null;
    const endpoint = body?.endpoint;
    const p256dh = body?.keys?.p256dh;
    const auth = body?.keys?.auth;
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
    }
    await upsertPushSubscription({
      userId: session.user.id,
      endpoint,
      p256dh,
      auth,
      userAgent: request.headers.get("user-agent"),
    });
    await markPushAsked(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:push.subscribe.POST", e);
  }
}
