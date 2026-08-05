import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { deleteTask, updateTask } from "@/lib/db/tasks";
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
      recordId?: unknown;
      completed?: unknown;
      dismissed?: unknown;
    };
    const patch: Parameters<typeof updateTask>[2] = {};
    if (typeof body.title === "string") {
      patch.title = body.title.trim().slice(0, 200);
    }
    if (body.dueDate !== undefined) {
      if (body.dueDate === null || body.dueDate === "") {
        patch.dueDate = null;
      } else if (isIsoDate(body.dueDate)) {
        patch.dueDate = body.dueDate;
      } else {
        return NextResponse.json({ error: "invalid_due_date" }, { status: 400 });
      }
    }
    if (body.recordId !== undefined) {
      patch.recordId =
        typeof body.recordId === "string" && body.recordId
          ? body.recordId
          : null;
    }
    if (body.completed !== undefined) {
      patch.completedAt = body.completed ? new Date().toISOString() : null;
    }
    if (body.dismissed !== undefined) {
      patch.dismissedAt = body.dismissed ? new Date().toISOString() : null;
    }
    const row = await updateTask(session.user.id, id, patch);
    return NextResponse.json({ task: row });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:tasks[id].PATCH", e, {
      status: 400,
      code: "bad_request",
    });
  }
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    await deleteTask(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:tasks[id].DELETE", e);
  }
}
