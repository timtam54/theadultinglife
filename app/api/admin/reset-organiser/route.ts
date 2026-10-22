import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";
import { resetOrganiser } from "@/lib/services/organiser-reset";
import { logEvent } from "@/lib/services/audits";

// Superuser-only. Body: { familyGroupId }. Empties that family group's
// organiser (see lib/services/organiser-reset.ts) but keeps the account,
// family members and setup.
export async function POST(req: Request) {
  const admin = await requireSuperuser();
  const body = (await req.json().catch(() => null)) as { familyGroupId?: string } | null;
  if (!body?.familyGroupId) {
    return NextResponse.json({ error: "bad_body" }, { status: 400 });
  }
  const { data: group, error } = await createServiceClient()
    .from("family_groups")
    .select("id")
    .eq("id", body.familyGroupId)
    .maybeSingle();
  if (error) throw error;
  if (!group) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const result = await resetOrganiser(body.familyGroupId);
    void logEvent({
      userId: admin.user.id,
      email: admin.user.email,
      action: "admin.organiser_reset",
      page: "/api/admin/reset-organiser",
    });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/admin/reset-organiser] failed:", msg);
    return NextResponse.json({ error: "reset_failed", detail: msg }, { status: 500 });
  }
}
