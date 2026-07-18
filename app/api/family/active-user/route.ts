import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { isUserInFamilyGroup } from "@/lib/db/users";
import { apiError } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => null)) as {
      userId?: string;
    } | null;
    if (!body?.userId) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    const ok = await isUserInFamilyGroup(body.userId, session.user.familyGroupId);
    if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const cookieStore = await cookies();
    cookieStore.set("active_family_user", body.userId, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:family.active-user.POST", e);
  }
}
