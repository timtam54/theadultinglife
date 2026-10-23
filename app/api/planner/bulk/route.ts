import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

const MAX_EVENTS = 500;

function isIso(v: unknown): v is string {
  return typeof v === "string" && !Number.isNaN(Date.parse(v));
}

/** POST /api/planner/bulk — body { events: [{ title, startAt, endAt }] }.
 *  Adds many calendar events at once (a routine added across several days
 *  and weeks). Up to 500 per request. */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as { events?: unknown };
    const list = Array.isArray(body.events) ? body.events : [];
    if (list.length === 0) return NextResponse.json({ error: "no_events" }, { status: 400 });
    if (list.length > MAX_EVENTS) return NextResponse.json({ error: "too_many_events" }, { status: 400 });
    const rows = [];
    for (const raw of list as { title?: unknown; startAt?: unknown; endAt?: unknown }[]) {
      const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 200) : "";
      if (!title || !isIso(raw.startAt) || !isIso(raw.endAt)) {
        return NextResponse.json({ error: "invalid_event" }, { status: 400 });
      }
      if (new Date(raw.endAt).getTime() <= new Date(raw.startAt).getTime()) {
        return NextResponse.json({ error: "end_before_start" }, { status: 400 });
      }
      rows.push({
        user_id: session.user.id,
        family_group_id: session.user.familyGroupId,
        title,
        description: null,
        start_at: raw.startAt,
        end_at: raw.endAt,
      });
    }
    const { count, error } = await createServiceClient().from("planner_events").insert(rows, { count: "exact" });
    if (error) throw error;
    return NextResponse.json({ ok: true, added: count ?? rows.length }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return apiError("api:planner.bulk.POST", e);
  }
}
