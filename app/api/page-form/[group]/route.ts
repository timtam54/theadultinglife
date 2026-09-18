import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import {
  deleteInstance,
  loadPageFormByGroup,
  saveAnswers,
} from "@/lib/services/pageForm";
import { isUserInFamilyGroup } from "@/lib/db/users";
import { apiError } from "@/lib/api-error";

type Ctx = { params: Promise<{ group: string }> };

async function resolveTargetUserId(
  raw: string | undefined,
  sessionUserId: string,
  familyGroupId: string
): Promise<{ id: string | undefined; error?: string }> {
  const targetUserId = raw?.trim() || undefined;
  if (targetUserId && targetUserId !== sessionUserId) {
    const ok = await isUserInFamilyGroup(targetUserId, familyGroupId);
    if (!ok) return { id: undefined, error: "target_user_not_in_family" };
  }
  return { id: targetUserId };
}

// GET — load the current answers for a page-form group. Used by the Family
// Members modal to hydrate the "More about this person" extras when a user
// is opened. Answers are per-user; targetUserId (if given) must be in the
// caller's family group.
export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { group } = await ctx.params;
    const url = new URL(request.url);
    const rawTarget = url.searchParams.get("targetUserId") ?? undefined;
    const resolved = await resolveTargetUserId(
      rawTarget ?? undefined,
      session.user.id,
      session.user.familyGroupId
    );
    if (resolved.error) {
      return NextResponse.json({ error: resolved.error }, { status: 403 });
    }
    const effectiveUserId = resolved.id ?? session.user.id;
    const data = await loadPageFormByGroup(effectiveUserId, group);
    return NextResponse.json({ answers: data.answers });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:page-form[group].GET", e);
  }
}

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { group } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as {
      answers?: Record<string, unknown>;
      targetUserId?: string;
      instanceId?: string;
    };
    const answers = body.answers ?? {};
    if (typeof answers !== "object" || Array.isArray(answers)) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const resolved = await resolveTargetUserId(
      body.targetUserId,
      session.user.id,
      session.user.familyGroupId
    );
    if (resolved.error) {
      return NextResponse.json({ error: resolved.error }, { status: 403 });
    }

    await saveAnswers(
      session.user.id,
      group,
      answers as Record<string, unknown>,
      resolved.id,
      body.instanceId?.trim() || undefined
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:page-form[group].POST", e);
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { group } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as {
      instanceId?: string;
      targetUserId?: string;
    };
    const instanceId = body.instanceId?.trim();
    if (!instanceId || instanceId === "default") {
      return NextResponse.json({ error: "invalid_instance" }, { status: 400 });
    }

    const resolved = await resolveTargetUserId(
      body.targetUserId,
      session.user.id,
      session.user.familyGroupId
    );
    if (resolved.error) {
      return NextResponse.json({ error: resolved.error }, { status: 403 });
    }

    await deleteInstance(session.user.id, group, instanceId, resolved.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:page-form[group].DELETE", e);
  }
}
