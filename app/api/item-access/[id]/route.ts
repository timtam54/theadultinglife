import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { revokeAccessById } from "@/lib/db/item-access";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const numeric = Number(id);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }
  const session = await requireSession();
  await revokeAccessById(session.user.id, numeric);
  return NextResponse.json({ ok: true });
}
