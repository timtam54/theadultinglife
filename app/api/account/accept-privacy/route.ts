import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { findUserById, updateUser } from "@/lib/db/users";

// Stamps privacy_accepted_at. Called from the in-app consent dialog when the
// user ticks the accept checkbox and confirms. Idempotent.
export async function POST() {
  try {
    const session = await requireSession();
    const user = await findUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (!user.privacy_accepted_at) {
      await updateUser(user.id, {
        privacy_accepted_at: new Date().toISOString(),
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/account/accept-privacy] failed:", msg);
    return NextResponse.json(
      { error: "accept_privacy_failed", detail: msg },
      { status: 500 }
    );
  }
}
