import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import {
  insertFamilyUser,
  listUsersInFamilyGroup,
} from "@/lib/db/users";
import { apiError } from "@/lib/api-error";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await requireSession();
    const users = await listUsersInFamilyGroup(session.user.familyGroupId);
    return NextResponse.json({ users });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:family-users.GET", e);
  }
}

const ALLOWED_KIND = new Set(["adult", "child", "other"] as const);

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as {
      firstName?: string;
      lastName?: string;
      memberKind?: string;
      email?: string;
      orderIndex?: number;
    };
    const firstName = (body.firstName ?? "").trim();
    if (!firstName) {
      return NextResponse.json({ error: "first_name_required" }, { status: 400 });
    }
    const memberKind = body.memberKind ?? "adult";
    if (!ALLOWED_KIND.has(memberKind as "adult" | "child" | "other")) {
      return NextResponse.json({ error: "invalid_member_kind" }, { status: 400 });
    }
    const user = await insertFamilyUser({
      familyGroupId: session.user.familyGroupId,
      firstName,
      lastName: body.lastName?.trim() || null,
      memberKind: memberKind as "adult" | "child" | "other",
      email: body.email?.trim() || null,
      orderIndex: body.orderIndex,
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:family-users.POST", e, { code: "insert_failed" });
  }
}
