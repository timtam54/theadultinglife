import { NextRequest, NextResponse } from "next/server";
import {
  getEffectiveAdmin,
  setSessionUserId,
  setShadowAdminId,
} from "@/lib/auth/session";
import { findUserById } from "@/lib/db/users";
import { insertAudit } from "@/lib/db/audits";
import { apiError } from "@/lib/api-error";

function clientIp(request: NextRequest): string | null {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    null
  );
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getEffectiveAdmin();
    if (!admin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const body = (await request.json().catch(() => null)) as {
      userId?: string;
    } | null;
    const targetId = body?.userId;
    if (!targetId) {
      return NextResponse.json({ error: "userId_required" }, { status: 400 });
    }
    if (targetId === admin.id) {
      return NextResponse.json({ error: "cannot_impersonate_self" }, { status: 400 });
    }
    const target = await findUserById(targetId);
    if (!target) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    await setShadowAdminId(admin.id);
    await setSessionUserId(target.id);

    await insertAudit({
      userId: admin.id,
      username: admin.email ?? admin.id,
      page: "/admin/users",
      action: `impersonate.start:${target.email ?? target.id}`,
      ipAddress: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError("api:admin.impersonate.POST", e);
  }
}
