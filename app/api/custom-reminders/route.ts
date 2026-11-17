import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { createCustomReminder } from "@/lib/db/custom-reminders";
import type { Recurrence } from "@/lib/db/types";
import { logEvent } from "@/lib/services/audits";
import { apiError } from "@/lib/api-error";
import { requireWriteAccess } from "@/lib/subscription/access";

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

export async function POST(request: NextRequest) {
  const blocked = await requireWriteAccess();
  if (blocked) return blocked;
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as {
      title?: unknown;
      dueDate?: unknown;
      notes?: unknown;
      recordId?: unknown;
      recurrence?: unknown;
    };
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "title_required" }, { status: 400 });
    }
    if (!isIsoDate(body.dueDate)) {
      return NextResponse.json(
        { error: "invalid_due_date" },
        { status: 400 }
      );
    }
    const notes =
      typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : null;
    const recordId =
      typeof body.recordId === "string" && body.recordId ? body.recordId : null;
    const recurrence = isRecurrence(body.recurrence) ? body.recurrence : null;

    const row = await createCustomReminder({
      userId: session.user.id,
      familyGroupId: session.user.familyGroupId,
      title: title.slice(0, 200),
      dueDate: body.dueDate,
      notes: notes || null,
      recordId,
      recurrence,
    });
    void logEvent({
      userId: session.user.id,
      email: session.user.email,
      action: "reminder.created",
      page: "/api/custom-reminders",
    });
    return NextResponse.json({ reminder: row }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:custom-reminders.POST", e, {
      status: 400,
      code: "bad_request",
    });
  }
}
