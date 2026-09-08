import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { findUserById, updateUser } from "@/lib/db/users";

// Stamps welcomed_at once so the one-time "Hello / how this app works" intro
// isn't shown again. Called when the user acknowledges the intro in any way —
// clicking through it OR explicitly skipping it (skipping also counts as
// "yes, I've seen it, don't show me again"; otherwise the layout redirect
// would trap them in a loop).
export async function POST() {
  try {
    const session = await requireSession();
    const user = await findUserById(session.user.id);
    if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!user.welcomed_at) {
      await updateUser(user.id, { welcomed_at: new Date().toISOString() });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    // Surface the underlying error so the caller can diagnose (e.g. missing
    // column if migration 075 hasn't been run). Logged server-side too.
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/account/welcomed] failed:", msg);
    return NextResponse.json(
      { error: "welcomed_stamp_failed", detail: msg },
      { status: 500 }
    );
  }
}
