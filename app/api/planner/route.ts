import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { insertPlannerEvent, listPlannerEventsForRange } from "@/lib/db/planner";
import { apiError } from "@/lib/api-error";

function isIsoDateTime(v: unknown): v is string {
  return typeof v === "string" && !Number.isNaN(Date.parse(v));
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const start = request.nextUrl.searchParams.get("start");
    const end = request.nextUrl.searchParams.get("end");
    if (!isIsoDateTime(start) || !isIsoDateTime(end)) {
      return NextResponse.json(
        { error: "start_and_end_required" },
        { status: 400 }
      );
    }
    const events = await listPlannerEventsForRange(session.user.id, start, end);
    return NextResponse.json({ events });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:planner.GET", e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as {
      title?: unknown;
      description?: unknown;
      startAt?: unknown;
      endAt?: unknown;
    };
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "title_required" }, { status: 400 });
    }
    if (!isIsoDateTime(body.startAt) || !isIsoDateTime(body.endAt)) {
      return NextResponse.json({ error: "invalid_times" }, { status: 400 });
    }
    if (new Date(body.endAt).getTime() <= new Date(body.startAt).getTime()) {
      return NextResponse.json({ error: "end_before_start" }, { status: 400 });
    }
    const description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null;
    const event = await insertPlannerEvent({
      userId: session.user.id,
      familyGroupId: session.user.familyGroupId,
      title,
      description,
      startAt: body.startAt,
      endAt: body.endAt,
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:planner.POST", e);
  }
}
