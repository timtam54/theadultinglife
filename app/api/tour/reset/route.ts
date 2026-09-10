import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { findUserById, updateUser } from "@/lib/db/users";

// Clears users.tour_completed_at so the tour auto-launches again next
// (app) route load. Also clears demo_seeded_at so /api/tour/start will
// re-seed the demo data. Called from the "Take the tour again" button
// in Settings and on the Hello step.
export async function POST() {
  try {
    const session = await requireSession();
    const user = await findUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    await updateUser(user.id, {
      tour_completed_at: null,
      demo_seeded_at: null,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/tour/reset] failed:", msg);
    return NextResponse.json(
      { error: "tour_reset_failed", detail: msg },
      { status: 500 }
    );
  }
}
