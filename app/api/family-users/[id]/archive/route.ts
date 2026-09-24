import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { archiveFamilyUser, unarchiveFamilyUser } from "@/lib/db/users";
import { apiError } from "@/lib/api-error";

export const runtime = "nodejs";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const user = await archiveFamilyUser(id, session.user.familyGroupId);
    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "cannot_archive_primary") {
      return NextResponse.json(
        { error: "cannot_archive_primary" },
        { status: 400 }
      );
    }
    if (e instanceof Error && e.message === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return apiError("api:family-users[id].archive.POST", e, {
      code: "archive_failed",
    });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const user = await unarchiveFamilyUser(id, session.user.familyGroupId);
    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:family-users[id].archive.DELETE", e, {
      code: "unarchive_failed",
    });
  }
}
