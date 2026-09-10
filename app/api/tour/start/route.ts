import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";
import { findUserById, updateUser, insertFamilyUser } from "@/lib/db/users";

// Seeds a demo family member + one sample record so the tour has something
// concrete to point at when it lands on the Organiser matrix. Idempotent:
// if we've already seeded (users.demo_seeded_at is set), returns early.
// The corresponding /api/tour/finish endpoint deletes the demo rows.
export async function POST() {
  try {
    const session = await requireSession();
    const user = await findUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (user.demo_seeded_at) {
      return NextResponse.json({ ok: true, alreadySeeded: true });
    }

    // 1) Insert a demo family member so the matrix has a second column.
    const demo = await insertFamilyUser({
      familyGroupId: session.user.familyGroupId,
      firstName: "Sample",
      lastName: "Person (demo)",
      memberKind: "adult",
      email: null,
    });
    // Flag as demo so we can find + delete it on tour finish.
    const supabase = createServiceClient();
    await supabase
      .from("users")
      .update({ is_demo: true })
      .eq("id", demo.id);

    // 2) Insert one sample record so at least one matrix cell is green.
    await supabase.from("records").insert({
      user_id: session.user.id,
      category_id: "personal",
      subcategory_id: "personal.emergency_contacts",
      title: "Sample emergency contact (demo)",
      is_demo: true,
    });

    await updateUser(user.id, {
      demo_seeded_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, seeded: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/tour/start] failed:", msg);
    return NextResponse.json(
      { error: "tour_start_failed", detail: msg },
      { status: 500 }
    );
  }
}
