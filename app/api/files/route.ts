import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { listUserFiles, uploadForUser } from "@/lib/services/files";
import { apiError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const q = request.nextUrl.searchParams.get("q") ?? undefined;
    const files = await listUserFiles(session.user.id, { search: q });
    return NextResponse.json({ files });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:files.GET", e);
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
    const subcategoryId = form.get("subcategoryId")?.toString() || null;
    const allowDuplicate = form.get("allowDuplicate")?.toString() === "1";
    const tags =
      form
        .get("tags")
        ?.toString()
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean) ?? [];
    const result = await uploadForUser({
      userId: session.user.id,
      file,
      recordId,
      subcategoryId,
      tags,
      allowDuplicate,
    });
    if (result.file === null) {
      return NextResponse.json(
        {
          warning: "duplicate",
          message:
            "A file with that name is already stored in this folder. Upload again with allowDuplicate=1 to keep both.",
          duplicateOf: result.duplicateOf,
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ file: result.file }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:files.POST", e, { code: "upload_failed" });
  }
}
