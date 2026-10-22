import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { deletePasskey } from "@/lib/db/passkeys";

type Ctx = { params: Promise<{ id: string }> };

/** DELETE /api/security/face-id/:id — turns Face ID off for one device. */
export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const removed = await deletePasskey(session.user.id, id);
    if (!removed) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[api/security/face-id/delete] failed:", e);
    return NextResponse.json({ error: "face_id_failed" }, { status: 500 });
  }
}
