import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import {
  deleteCustomReminder,
  updateCustomReminder,
} from "@/lib/db/custom-reminders";
import { apiError } from "@/lib/api-error";

type Ctx = { params: Promise<{ id: string }> };

function isIsoDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as {
      title?: unknown;
      dueDate?: unknown;
      notes?: unknown;
      dismissed?: unknown;
    };
    const patch: Parameters<typeof updateCustomReminder>[2] = {};
    if (typeof body.title === "string") {
      patch.title = body.title.trim().slice(0, 200);
    }
    if (body.dueDate !== undefined) {
      if (!isIsoDate(body.dueDate)) {
        return NextResponse.json(
          { error: "invalid_due_date" },
          { status: 400 }
        );
      }
      patch.dueDate = body.dueDate;
    }
    if (body.notes !== undefined) {
      patch.notes =
        typeof body.notes === "string"
          ? body.notes.trim().slice(0, 2000) || null
          : null;
    }
    if (body.dismissed !== undefined) {
      patch.dismissedAt = body.dismissed ? new Date().toISOString() : null;
    }
    const row = await updateCustomReminder(session.user.id, id, patch);
    return NextResponse.json({ reminder: row });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:custom-reminders[id].PATCH", e, {
      status: 400,
      code: "bad_request",
    });
  }
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    await deleteCustomReminder(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:custom-reminders[id].DELETE", e);
  }
}
