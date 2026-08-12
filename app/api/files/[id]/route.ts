import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import {
  getSignedDownload,
  relinkUserFile,
  removeUserFile,
  replaceUserFile,
} from "@/lib/services/files";
import { apiError } from "@/lib/api-error";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const url = await getSignedDownload(session.user.familyGroupId, id);
    return NextResponse.json({ url });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return apiError("api:files[id].GET", e);
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "no_file" }, { status: 400 });
      }
      const row = await replaceUserFile({
        familyGroupId: session.user.familyGroupId,
        fileId: id,
        file,
      });
      return NextResponse.json({ file: row });
    }
    const body = (await request.json().catch(() => ({}))) as {
      subcategoryId?: string | null;
      recordId?: string | null;
    };
    const row = await relinkUserFile({
      familyGroupId: session.user.familyGroupId,
      fileId: id,
      subcategoryId: body.subcategoryId ?? null,
      recordId: body.recordId ?? null,
    });
    return NextResponse.json({ file: row });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return apiError("api:files[id].PATCH", e);
  }
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    await removeUserFile(session.user.familyGroupId, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:files[id].DELETE", e);
  }
}
