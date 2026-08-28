import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";

// Lightweight display-info lookup for a list of user_ids. Callers must be
// signed in. Returns only public-safe fields (name, email) — nothing sensitive.
// Used by ShareDialog to render grantee names next to grant rows.
export async function GET(req: Request) {
  await requireSession();
  const url = new URL(req.url);
  const raw = url.searchParams.get("ids") ?? "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100);
  if (ids.length === 0) return NextResponse.json({ users: [] });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, first_name, last_name")
    .in("id", ids);
  if (error) throw error;
  return NextResponse.json({ users: data ?? [] });
}
