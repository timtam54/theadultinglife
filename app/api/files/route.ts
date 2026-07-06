import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { listUserFiles, uploadForUser } from "@/lib/services/files";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const q = request.nextUrl.searchParams.get("q") ?? undefined;
    const files = await listUserFiles(session.user.id, q);
    return NextResponse.json({ files });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/files]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "no_file" }, { status: 400 });
    }
    const recordId = form.get("recordId")?.toString() || null;
    const tags = form.get("tags")?.toString().split(",").map((t) => t.trim()).filter(Boolean) ?? [];
    const row = await uploadForUser({
      userId: session.user.id,
      file,
      recordId,
      tags,
    });
    return NextResponse.json({ file: row }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/files]", e);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
