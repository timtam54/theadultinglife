import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { listProgress, upsertProgress } from "@/lib/db/progress";

export async function GET() {
  try {
    const session = await requireSession();
    const rows = await listProgress(session.user.id);
    return NextResponse.json({ progress: rows });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/progress]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => null)) as {
      itemType?: "content" | "quiz";
      itemId?: string;
      status?: "started" | "completed";
      meta?: Record<string, unknown>;
    } | null;
    if (!body?.itemType || !body?.itemId || !body?.status) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    const row = await upsertProgress({
      userId: session.user.id,
      itemType: body.itemType,
      itemId: body.itemId,
      status: body.status,
      meta: body.meta,
    });
    return NextResponse.json({ progress: row });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/progress]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
