import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { createTask } from "@/lib/db/tasks";
import { logEvent } from "@/lib/services/audits";
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
      recordId?: unknown;
    };
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "title_required" }, { status: 400 });
    }
    const dueDate =
      body.dueDate === null || body.dueDate === "" || body.dueDate === undefined
        ? null
        : isIsoDate(body.dueDate)
          ? body.dueDate
          : undefined;
    if (dueDate === undefined) {
      return NextResponse.json({ error: "invalid_due_date" }, { status: 400 });
    }
    const recordId =
      typeof body.recordId === "string" && body.recordId ? body.recordId : null;
    const row = await createTask({
      userId: session.user.id,
      familyGroupId: session.user.familyGroupId,
      title: title.slice(0, 200),
      dueDate,
      recordId,
    });
    void logEvent({
      userId: session.user.id,
      email: session.user.email,
      action: "task.created",
      page: "/api/tasks",
    });
    return NextResponse.json({ task: row }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:tasks.POST", e, {
      status: 400,
      code: "bad_request",
    });
  }
}
