import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { findUserById, updateUser } from "@/lib/db/users";
import type { MirrorableUserAttr } from "@/lib/db/types";

/** Attribute → users column. `first_name`, `last_name`, `email` are stored
 *  on `first_name` / `last_name` / `email` directly. The dialog / profile
 *  fields map 1:1 already. */
const ALLOWED_ATTRS: MirrorableUserAttr[] = [
  "first_name",
  "last_name",
  "email",
  "birthday",
  "mobile_phone",
  "home_phone",
  "home_address",
  "mailing_address",
];

// Updates the caller's own profile attributes (first_name, birthday, etc.).
// Only accepts the allow-listed MirrorableUserAttr keys — anything else in
// the body is ignored. Called by the "Update your profile too?" prompt on
// any form that mirrors user-profile attributes.
export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    const user = await findUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const patch: Record<string, string | null> = {};
    for (const attr of ALLOWED_ATTRS) {
      if (!(attr in body)) continue;
      const raw = body[attr];
      if (raw === null || raw === "") {
        patch[attr] = null;
      } else if (typeof raw === "string") {
        patch[attr] = raw.trim() || null;
      }
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: true, updated: 0 });
    }
    // If the caller is updating their email, keep it lowercase.
    if (typeof patch.email === "string") patch.email = patch.email.toLowerCase();
    await updateUser(user.id, patch);
    return NextResponse.json({ ok: true, updated: Object.keys(patch).length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/user/me/profile] failed:", msg);
    return NextResponse.json(
      { error: "profile_update_failed", detail: msg },
      { status: 500 }
    );
  }
}
