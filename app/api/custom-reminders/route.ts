import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { createCustomReminder } from "@/lib/db/custom-reminders";
import { apiError } from "@/lib/api-error";

function isIsoDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as {
      title?: unknown;
      dueDate?: unknown;
      notes?: unknown;
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

    const row = await createCustomReminder({
      userId: session.user.id,
      familyGroupId: session.user.familyGroupId,
      title: title.slice(0, 200),
      dueDate: body.dueDate,
      notes: notes || null,
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
