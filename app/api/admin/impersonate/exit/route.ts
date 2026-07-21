import { NextRequest, NextResponse } from "next/server";
import {
  clearShadowAdmin,
  getSession,
  getShadowAdminId,
  setSessionUserId,
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
    const shadowId = await getShadowAdminId();
    if (!shadowId) {
      return NextResponse.json({ error: "not_impersonating" }, { status: 400 });
    }
    const admin = await findUserById(shadowId);
    if (!admin || admin.role !== "s") {
      // Shadow points at a user who is no longer a superuser. Clear it and
      // treat as a hard sign-out condition on the client side.
      await clearShadowAdmin();
      return NextResponse.json({ error: "shadow_invalid" }, { status: 400 });
    }

    const session = await getSession();
    const wasTargetEmail = session?.user.email ?? session?.user.id ?? "unknown";

    await setSessionUserId(admin.id);
    await clearShadowAdmin();

    await insertAudit({
      userId: admin.id,
      username: admin.email ?? admin.id,
      page: "/admin/users",
      action: `impersonate.exit:${wasTargetEmail}`,
      ipAddress: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError("api:admin.impersonate.exit.POST", e);
  }
}
