import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";
import { purgeFamilyGroup } from "@/lib/services/account-purge";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Superuser-only. Body: { familyGroupId }.
// Refuses if the primary user of the family group is not soft-deleted OR
// their deleted_at is less than 30 days old.
export async function POST(req: Request) {
  await requireSuperuser();
  const body = (await req.json().catch(() => null)) as {
    familyGroupId?: string;
  } | null;
  if (!body?.familyGroupId) {
    return NextResponse.json({ error: "bad_body" }, { status: 400 });
  }
  const supabase = createServiceClient();

  // Find the primary user of the family group.
  const { data: primaryRow, error: pErr } = await supabase
    .from("users")
    .select("id, deleted_at")
    .eq("family_group_id", body.familyGroupId)
    .eq("is_primary", true)
    .maybeSingle();
  if (pErr) throw pErr;
  const primary = primaryRow as { id: string; deleted_at: string | null } | null;
  if (!primary) {
    return NextResponse.json({ error: "no_primary" }, { status: 404 });
  }
  if (!primary.deleted_at) {
    return NextResponse.json({ error: "not_deleted" }, { status: 409 });
  }
  const ageMs = Date.now() - new Date(primary.deleted_at).getTime();
  if (ageMs < THIRTY_DAYS_MS) {
    const daysRemain = Math.ceil((THIRTY_DAYS_MS - ageMs) / (24 * 60 * 60 * 1000));
    return NextResponse.json(
      { error: "too_soon", daysRemain },
      { status: 409 }
    );
  }

  const result = await purgeFamilyGroup(body.familyGroupId);
  return NextResponse.json({ ok: true, result });
}
