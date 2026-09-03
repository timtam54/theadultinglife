import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { findUserById, updateUser } from "@/lib/db/users";

// Primary account holder confirms they are 18+. Sets age_confirmed_at once
// and never asks again. Non-primary users are not allowed to hit this
// endpoint — they never see the confirm page (see confirm-age/page.tsx).
export async function POST() {
  const session = await requireSession();
  const user = await findUserById(session.user.id);
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!user.is_primary) {
    return NextResponse.json({ error: "primary_only" }, { status: 403 });
  }
  if (!user.age_confirmed_at) {
    await updateUser(user.id, { age_confirmed_at: new Date().toISOString() });
  }
  return NextResponse.json({ ok: true });
}
