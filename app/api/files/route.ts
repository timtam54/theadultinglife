import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { listUserFiles, uploadForUser } from "@/lib/services/files";
import { isUserInFamilyGroup } from "@/lib/db/users";
import { logEvent } from "@/lib/services/audits";
import { apiError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const params = request.nextUrl.searchParams;
    const q = params.get("q") ?? undefined;
    // One form entry's files (e.g. an accident's scene photos):
    // ?subcategoryId=…&instanceId=…[&targetUserId=…]
    const subcategoryId = params.get("subcategoryId");
    const instanceId = params.get("instanceId");
    let ownerId = session.user.id;
    const target = params.get("targetUserId");
    if (target && target !== session.user.id) {
      if (!(await isUserInFamilyGroup(target, session.user.familyGroupId))) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      ownerId = target;
    }
    let files = await listUserFiles(ownerId, {
      search: q,
      ...(subcategoryId ? { subcategoryId } : {}),
    });
    if (instanceId) files = files.filter((f) => f.instance_id === instanceId);
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
    const instanceId = form.get("instanceId")?.toString() || null;
    const allowDuplicate = form.get("allowDuplicate")?.toString() === "1";
    const rawTargetUserId = form.get("targetUserId")?.toString().trim() || null;
    const tags =
      form
        .get("tags")
        ?.toString()
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean) ?? [];

    let ownerUserId = session.user.id;
    if (rawTargetUserId && rawTargetUserId !== session.user.id) {
      const ok = await isUserInFamilyGroup(
        rawTargetUserId,
        session.user.familyGroupId
      );
      if (!ok) {
        return NextResponse.json(
          { error: "target_user_not_in_family" },
          { status: 403 }
        );
      }
      ownerUserId = rawTargetUserId;
    }

    const result = await uploadForUser({
      userId: ownerUserId,
      file,
      recordId,
      subcategoryId,
      instanceId,
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
    void logEvent({
      userId: session.user.id,
      email: session.user.email,
      action: "document.uploaded",
      page: "/api/files",
    });
    return NextResponse.json({ file: result.file }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:files.POST", e, { code: "upload_failed" });
  }
}
