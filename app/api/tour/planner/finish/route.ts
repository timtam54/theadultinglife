import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { findUserById, updateUser } from "@/lib/db/users";

// Stamps users.planner_tour_completed_at. Called when the Planner tour
// finishes or is skipped. Idempotent.
export async function POST() {
  try {
    const session = await requireSession();
    const user = await findUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    await updateUser(user.id, {
      planner_tour_completed_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/tour/planner/finish] failed:", msg);
    return NextResponse.json(
      { error: "planner_tour_finish_failed", detail: msg },
      { status: 500 }
    );
  }
}
