import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { deleteProgress, upsertProgress } from "@/lib/db/progress";
import { apiError } from "@/lib/api-error";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    await upsertProgress({
      userId: session.user.id,
      itemType: "video",
      itemId: id,
      status: "completed",
    });
    return NextResponse.json({ ok: true, watched: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:videos[id].watch.POST", e);
  }
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    await deleteProgress({
      userId: session.user.id,
      itemType: "video",
      itemId: id,
    });
    return NextResponse.json({ ok: true, watched: false });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:videos[id].watch.DELETE", e);
  }
}
