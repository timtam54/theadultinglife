import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { deleteFamilyUser, updateFamilyUser } from "@/lib/db/users";
import { apiError } from "@/lib/api-error";

export const runtime = "nodejs";

const ALLOWED_KIND = new Set(["adult", "child", "other"] as const);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      firstName?: string;
      lastName?: string | null;
      memberKind?: string;
      email?: string | null;
      orderIndex?: number;
    };
    if (body.memberKind !== undefined && !ALLOWED_KIND.has(body.memberKind as "adult" | "child" | "other")) {
      return NextResponse.json({ error: "invalid_member_kind" }, { status: 400 });
    }
    const user = await updateFamilyUser(id, session.user.familyGroupId, {
      firstName: body.firstName?.trim(),
      lastName: body.lastName === undefined ? undefined : body.lastName?.trim() || null,
      memberKind: body.memberKind as "adult" | "child" | "other" | undefined,
      email: body.email === undefined ? undefined : body.email?.trim() || null,
      orderIndex: body.orderIndex,
    });
    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:family-users[id].PATCH", e, { code: "update_failed" });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await deleteFamilyUser(id, session.user.familyGroupId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "cannot_delete_primary") {
      return NextResponse.json(
        { error: "cannot_delete_primary" },
        { status: 400 }
      );
    }
    return apiError("api:family-users[id].DELETE", e, { code: "delete_failed" });
  }
}
