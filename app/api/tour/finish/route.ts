import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";
import { findUserById, updateUser } from "@/lib/db/users";

// Stamps users.tour_completed_at and cleans up any demo data seeded by
// /api/tour/start. Idempotent — safe to call more than once. Called both
// when the tour finishes normally AND when the user skips.
export async function POST() {
  try {
    const session = await requireSession();
    const user = await findUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const supabase = createServiceClient();

    // Remove seeded demo family members for this family group.
    await supabase
      .from("users")
      .delete()
      .eq("family_group_id", session.user.familyGroupId)
      .eq("is_demo", true);

    // Remove seeded demo records for the current user.
    await supabase
      .from("records")
      .delete()
      .eq("user_id", session.user.id)
      .eq("is_demo", true);

    await updateUser(user.id, {
      tour_completed_at: new Date().toISOString(),
      // Clear the seeded flag so if we ever reset the tour and re-seed,
      // it works on the second run too.
      demo_seeded_at: null,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/tour/finish] failed:", msg);
    return NextResponse.json(
      { error: "tour_finish_failed", detail: msg },
      { status: 500 }
    );
  }
}
