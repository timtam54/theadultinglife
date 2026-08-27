import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import {
  deletePlannerLetter,
  updatePlannerLetter,
} from "@/lib/db/planner-letters";
import { apiError } from "@/lib/api-error";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const idNum = Number(id);
    if (!Number.isFinite(idNum)) {
      return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    }
    const body = (await request.json().catch(() => ({}))) as {
      recipient?: string;
      body?: string;
    };
    const patch: { recipient?: string; body?: string } = {};
    if (typeof body.recipient === "string") patch.recipient = body.recipient.trim();
    if (typeof body.body === "string") patch.body = body.body.trim();
    const letter = await updatePlannerLetter(session.user.id, idNum, patch);
    return NextResponse.json({ letter });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:planner-letters[id].PATCH", e);
  }
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const idNum = Number(id);
    if (!Number.isFinite(idNum)) {
      return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    }
    await deletePlannerLetter(session.user.id, idNum);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:planner-letters[id].DELETE", e);
  }
}
