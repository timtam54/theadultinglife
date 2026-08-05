import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import {
  deleteCustomReminder,
  updateCustomReminder,
} from "@/lib/db/custom-reminders";
import type { Recurrence } from "@/lib/db/types";
import { apiError } from "@/lib/api-error";

type Ctx = { params: Promise<{ id: string }> };

function isIsoDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

const RECURRENCE: readonly Recurrence[] = [
  "daily",
  "weekly",
  "monthly",
  "yearly",
];

function isRecurrence(v: unknown): v is Recurrence {
  return typeof v === "string" && (RECURRENCE as readonly string[]).includes(v);
}

function todayPlusDays(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
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
      recordId?: unknown;
      recurrence?: unknown;
      snoozeDays?: unknown;
      completed?: unknown;
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
    if (body.recordId !== undefined) {
      patch.recordId =
        typeof body.recordId === "string" && body.recordId
          ? body.recordId
          : null;
    }
    if (body.recurrence !== undefined) {
      patch.recurrence =
        body.recurrence === null || body.recurrence === ""
          ? null
          : isRecurrence(body.recurrence)
            ? body.recurrence
            : null;
    }
    if (body.snoozeDays !== undefined) {
      const days = Number(body.snoozeDays);
      if (!Number.isFinite(days) || days < 0 || days > 365) {
        return NextResponse.json(
          { error: "invalid_snooze" },
          { status: 400 }
        );
      }
      patch.snoozedUntil = days === 0 ? null : todayPlusDays(days);
    }
    if (body.completed !== undefined) {
      patch.completedAt = body.completed ? new Date().toISOString() : null;
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
