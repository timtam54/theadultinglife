import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";

// The current signed-in user cancels their own pending deletion by clearing
// their users.deleted_at. Safe to call at any time (no-op if already null).
export async function POST() {
  const session = await requireSession();
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("users")
    .update({ deleted_at: null })
    .eq("id", session.user.id);
  if (error) throw error;
  return NextResponse.json({ ok: true });
}
