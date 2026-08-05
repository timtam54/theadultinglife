import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { updateUser } from "@/lib/db/users";
import { apiError } from "@/lib/api-error";

// Accept an IANA timezone from the browser (Intl.DateTimeFormat().resolvedOptions().timeZone)
// so the daily-nudges cron can hit ~8am local instead of 8am UTC.
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as {
      timezone?: unknown;
    };
    const tz = typeof body.timezone === "string" ? body.timezone.trim() : "";
    // Cheap sanity check — must look like "Region/City" or a known short zone.
    if (!tz || tz.length > 64 || !/^[A-Za-z_+\-/0-9]+$/.test(tz)) {
      return NextResponse.json({ error: "invalid_timezone" }, { status: 400 });
    }
    await updateUser(session.user.id, { timezone: tz });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:user.timezone.POST", e);
  }
}
