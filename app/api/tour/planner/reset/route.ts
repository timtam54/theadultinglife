import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { findUserById, updateUser } from "@/lib/db/users";

// Clears users.planner_tour_completed_at so the Planner tour auto-launches
// again on the next visit. Powers the "Replay Planner tour" button in
// Settings.
export async function POST() {
  try {
    const session = await requireSession();
    const user = await findUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    await updateUser(user.id, {
      planner_tour_completed_at: null,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/tour/planner/reset] failed:", msg);
    return NextResponse.json(
      { error: "planner_tour_reset_failed", detail: msg },
      { status: 500 }
    );
  }
}
