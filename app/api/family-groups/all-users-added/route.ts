import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import {
  markAllUsersAdded,
  unmarkAllUsersAdded,
} from "@/lib/db/family-groups";
import { apiError } from "@/lib/api-error";

export const runtime = "nodejs";

export async function POST() {
  try {
    const session = await requireSession();
    if (!session.user.isPrimary) {
      return NextResponse.json({ error: "primary_only" }, { status: 403 });
    }
    await markAllUsersAdded(session.user.familyGroupId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:family-groups.all-users-added.POST", e);
  }
}

export async function DELETE() {
  try {
    const session = await requireSession();
    if (!session.user.isPrimary) {
      return NextResponse.json({ error: "primary_only" }, { status: 403 });
    }
    await unmarkAllUsersAdded(session.user.familyGroupId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:family-groups.all-users-added.DELETE", e);
  }
}
