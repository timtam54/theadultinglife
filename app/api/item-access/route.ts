import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { findUserByEmail } from "@/lib/db/users";
import {
  grantAccess,
  listGrantsForItem,
  type ItemKind,
} from "@/lib/db/item-access";
import { sendGrantNotificationEmail } from "@/lib/services/item-access-email";
import { isPlannerSharedSubcategory } from "@/lib/templates/peace-of-mind-v2";

const ITEM_KINDS: ItemKind[] = [
  "instance",
  "user_form",
  "record",
  "file",
  "planner_letter",
  "planner_apology",
  "planner_wish",
  "planner_last_words",
];

function isItemKind(v: unknown): v is ItemKind {
  return typeof v === "string" && (ITEM_KINDS as string[]).includes(v);
}

// Item kinds that live only in the Planner. These have no subcategory and are
// always shareable — the Planner is their destination.
const PLANNER_ONLY_KINDS: ReadonlySet<ItemKind> = new Set([
  "planner_letter",
  "planner_apology",
  "planner_wish",
  "planner_last_words",
]);

// POST — owner grants access to a grantee (by email).
// Body: { subcategoryId, itemKind, itemId, granteeEmail, itemLabel? }
export async function POST(req: Request) {
  const session = await requireSession();
  const body = (await req.json().catch(() => null)) as {
    subcategoryId?: string | null;
    itemKind?: string;
    itemId?: string;
    granteeEmail?: string;
    itemLabel?: string;
  } | null;
  if (!body) return NextResponse.json({ error: "bad_body" }, { status: 400 });

  const { subcategoryId, itemKind, itemId, granteeEmail, itemLabel } = body;
  if (!isItemKind(itemKind))
    return NextResponse.json({ error: "bad_item_kind" }, { status: 400 });
  if (typeof itemId !== "string" || !itemId)
    return NextResponse.json({ error: "bad_item_id" }, { status: 400 });
  if (typeof granteeEmail !== "string" || !granteeEmail.trim())
    return NextResponse.json({ error: "bad_email" }, { status: 400 });

  // Sharing is only allowed for items that have a home in the Peace of Mind
  // Planner. Planner-only kinds (letters/apologies/wishes/last words) always
  // qualify. Everything else must belong to an Organiser folder that maps to a
  // Planner section — otherwise the grantee has no viewable destination.
  if (
    !PLANNER_ONLY_KINDS.has(itemKind) &&
    !isPlannerSharedSubcategory(subcategoryId ?? null)
  ) {
    return NextResponse.json(
      { error: "subcategory_not_in_planner" },
      { status: 400 }
    );
  }

  const grantee = await findUserByEmail(granteeEmail.trim().toLowerCase());
  if (!grantee) {
    return NextResponse.json(
      { error: "grantee_not_found" },
      { status: 404 }
    );
  }
  if (grantee.id === session.user.id) {
    return NextResponse.json({ error: "cannot_share_with_self" }, { status: 400 });
  }

  const grant = await grantAccess({
    ownerUserId: session.user.id,
    granteeUserId: grantee.id,
    subcategoryId: subcategoryId ?? null,
    itemKind,
    itemId,
  });

  // Notification — fire-and-forget; a failure to send email shouldn't fail the grant.
  void sendGrantNotificationEmail({
    ownerName:
      [session.user.firstName, session.user.lastName]
        .filter(Boolean)
        .join(" ") ||
      session.user.name ||
      session.user.email ||
      "A family member",
    granteeEmail: grantee.email,
    granteeName:
      [grantee.first_name, grantee.last_name].filter(Boolean).join(" ") ||
      grantee.name ||
      grantee.email ||
      "",
    itemLabel: itemLabel ?? "an item",
  }).catch(() => {
    /* swallow */
  });

  return NextResponse.json({ grant });
}

// GET — grants for a specific item (used by ShareDialog to list who currently
// has access). Query: ?subcategoryId=…&itemKind=…&itemId=…
export async function GET(req: Request) {
  const session = await requireSession();
  const url = new URL(req.url);
  const subcategoryId = url.searchParams.get("subcategoryId");
  const itemKind = url.searchParams.get("itemKind");
  const itemId = url.searchParams.get("itemId");
  if (!isItemKind(itemKind))
    return NextResponse.json({ error: "bad_item_kind" }, { status: 400 });
  if (!itemId)
    return NextResponse.json({ error: "bad_item_id" }, { status: 400 });

  const grants = await listGrantsForItem(session.user.id, {
    subcategoryId,
    itemKind,
    itemId,
  });
  return NextResponse.json({ grants });
}
