import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { apiError } from "@/lib/api-error";
import { deletePushSubscription } from "@/lib/db/push-subscriptions";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => null)) as {
      endpoint?: string;
    } | null;
    if (!body?.endpoint) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    await deletePushSubscription(session.user.id, body.endpoint);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:push.unsubscribe.POST", e);
  }
}
