import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { deletePlannerEvent, updatePlannerEvent } from "@/lib/db/planner";
import { apiError } from "@/lib/api-error";

function isIsoDateTime(v: unknown): v is string {
  return typeof v === "string" && !Number.isNaN(Date.parse(v));
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as {
      title?: unknown;
      description?: unknown;
      startAt?: unknown;
      endAt?: unknown;
    };
    const patch: {
      title?: string;
      description?: string | null;
      startAt?: string;
      endAt?: string;
    } = {};
    if (body.title !== undefined) {
      if (typeof body.title !== "string" || !body.title.trim()) {
        return NextResponse.json({ error: "title_required" }, { status: 400 });
      }
      patch.title = body.title.trim();
    }
    if (body.description !== undefined) {
      patch.description =
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : null;
    }
    if (body.startAt !== undefined) {
      if (!isIsoDateTime(body.startAt)) {
        return NextResponse.json({ error: "invalid_start" }, { status: 400 });
      }
      patch.startAt = body.startAt;
    }
    if (body.endAt !== undefined) {
      if (!isIsoDateTime(body.endAt)) {
        return NextResponse.json({ error: "invalid_end" }, { status: 400 });
      }
      patch.endAt = body.endAt;
    }
    if (
      patch.startAt &&
      patch.endAt &&
      new Date(patch.endAt).getTime() <= new Date(patch.startAt).getTime()
    ) {
      return NextResponse.json({ error: "end_before_start" }, { status: 400 });
    }
    const event = await updatePlannerEvent(session.user.id, id, patch);
    return NextResponse.json({ event });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:planner[id].PATCH", e);
  }
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    await deletePlannerEvent(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:planner[id].DELETE", e);
  }
}
