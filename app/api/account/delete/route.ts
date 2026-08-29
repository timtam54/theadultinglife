import { NextResponse } from "next/server";
import { destroySession, requireSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";
import { findUserById } from "@/lib/db/users";

// Primary user marks their own account for deletion. Only primary users can
// trigger this — the admin is expected to purge the whole family group 30 days
// later from /admin/users.
export async function POST() {
  const session = await requireSession();
  const user = await findUserById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!user.is_primary) {
    return NextResponse.json(
      { error: "primary_only" },
      { status: 403 }
    );
  }
  if (user.deleted_at) {
    // Already deleted — just log them out again for safety.
    await destroySession();
    return NextResponse.json({ ok: true, alreadyDeleted: true });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("users")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) throw error;

  await destroySession();
  return NextResponse.json({ ok: true });
}
