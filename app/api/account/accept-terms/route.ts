import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { findUserById, updateUser } from "@/lib/db/users";

// Stamps terms_accepted_at. Called from the in-app consent dialog when the
// user ticks the accept checkbox and confirms. Idempotent — safe to call
// twice.
export async function POST() {
  try {
    const session = await requireSession();
    const user = await findUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (!user.terms_accepted_at) {
      await updateUser(user.id, {
        terms_accepted_at: new Date().toISOString(),
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/account/accept-terms] failed:", msg);
    return NextResponse.json(
      { error: "accept_terms_failed", detail: msg },
      { status: 500 }
    );
  }
}
