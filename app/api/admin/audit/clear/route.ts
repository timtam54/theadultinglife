import { NextRequest, NextResponse } from "next/server";
import { requireSuperuser, UnauthorizedError, ForbiddenError } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";
import { insertAudit } from "@/lib/db/audits";
import { apiError } from "@/lib/api-error";

// Superuser tool for clearing a test account's audit history so it doesn't
// pollute analytics (e.g. Tim's own account during dev/demo). Records an
// audit row noting the deletion so we can see who wiped what.
export async function POST(request: NextRequest) {
  try {
    const session = await requireSuperuser();
    const body = (await request.json().catch(() => ({}))) as {
      username?: unknown;
    };
    const username =
      typeof body.username === "string" ? body.username.trim() : "";
    if (!username || username.length > 200) {
      return NextResponse.json({ error: "username_required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { count, error } = await supabase
      .from("audits")
      .delete({ count: "exact" })
      .eq("username", username);
    if (error) throw error;

    // Log the deletion itself so there's a paper trail.
    await insertAudit({
      userId: session.user.id,
      username: session.user.email ?? session.user.id,
      page: "/admin/audit",
      action: "unknown",
      ipAddress: null,
      userAgent: `admin cleared ${count ?? 0} audit rows for ${username}`,
    });

    return NextResponse.json({ ok: true, deleted: count ?? 0 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return apiError("api:admin.audit.clear.POST", e);
  }
}
