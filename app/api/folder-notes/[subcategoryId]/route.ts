import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { upsertFolderNote } from "@/lib/db/folder-notes";
import { apiError } from "@/lib/api-error";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subcategoryId: string }> }
) {
  try {
    const session = await requireSession();
    const { subcategoryId } = await params;
    const body = (await request.json().catch(() => null)) as {
      body?: string;
    } | null;
    if (typeof body?.body !== "string") {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    const row = await upsertFolderNote({
      familyGroupId: session.user.familyGroupId,
      subcategoryId: decodeURIComponent(subcategoryId),
      body: body.body,
      userId: session.user.id,
    });
    return NextResponse.json({ note: row });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:folder-notes.POST", e);
  }
}
