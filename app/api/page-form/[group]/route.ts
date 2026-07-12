import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { saveAnswers } from "@/lib/services/pageForm";
import { isUserInFamilyGroup } from "@/lib/db/users";
import { apiError } from "@/lib/api-error";

type Ctx = { params: Promise<{ group: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { group } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as {
      answers?: Record<string, unknown>;
      targetUserId?: string;
    };
    const answers = body.answers ?? {};
    if (typeof answers !== "object" || Array.isArray(answers)) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    let targetUserId = body.targetUserId?.trim() || undefined;
    if (targetUserId && targetUserId !== session.user.id) {
      const ok = await isUserInFamilyGroup(
        targetUserId,
        session.user.familyGroupId
      );
      if (!ok) {
        return NextResponse.json(
          { error: "target_user_not_in_family" },
          { status: 403 }
        );
      }
    }

    await saveAnswers(
      session.user.id,
      group,
      answers as Record<string, unknown>,
      targetUserId
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:page-form[group].POST", e);
  }
}
