import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { markSubscribePromptDismissed } from "@/lib/db/users";

export async function POST() {
  try {
    const session = await requireSession();
    await markSubscribePromptDismissed(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
