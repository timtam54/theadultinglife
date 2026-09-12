import { NextResponse } from "next/server";
import { requireSession, setSessionUnlockedAt } from "@/lib/auth/session";

/** POST /api/security/lock — clears the session's unlockedAt claim. Called
 *  by the client-side idle timer (after 15 min of inactivity) and by the
 *  visibility watcher (when the tab is hidden, on the assumption someone
 *  else might now be in front of the screen). */
export async function POST() {
  try {
    await requireSession();
    await setSessionUnlockedAt(null);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/security/lock] failed:", msg);
    return NextResponse.json(
      { error: "lock_failed", detail: msg },
      { status: 500 }
    );
  }
}
