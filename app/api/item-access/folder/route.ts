import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { listGrantsByOwner } from "@/lib/db/item-access";
import { listShareableItemsForOwner } from "@/lib/services/planner-shareable";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

// GET — everything the current user can share from one Organiser folder, plus
// who each item is already shared with. Powers the folder-level share dialog
// on the category matrix. Query: ?subcategoryId=…
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const subcategoryId = new URL(req.url).searchParams.get("subcategoryId");
    if (!subcategoryId)
      return NextResponse.json({ error: "bad_subcategory" }, { status: 400 });

    const [allItems, allGrants] = await Promise.all([
      listShareableItemsForOwner(session.user.id),
      listGrantsByOwner(session.user.id),
    ]);
    const items = allItems.filter((i) => i.subcategoryId === subcategoryId);
    const grants = allGrants.filter((g) => g.subcategory_id === subcategoryId);

    const granteeIds = Array.from(new Set(grants.map((g) => g.grantee_user_id)));
    const people = new Map<string, { name: string; email: string }>();
    if (granteeIds.length > 0) {
      const { data, error } = await createServiceClient()
        .from("users")
        .select("id, email, name, first_name, last_name")
        .in("id", granteeIds);
      if (error) throw error;
      for (const u of (data as {
        id: string;
        email: string | null;
        name: string | null;
        first_name: string | null;
        last_name: string | null;
      }[]) ?? []) {
        people.set(u.id, {
          name:
            [u.first_name, u.last_name].filter(Boolean).join(" ") ||
            u.name ||
            u.email ||
            "",
          email: u.email ?? "",
        });
      }
    }

    return NextResponse.json({
      items,
      grants: grants.map((g) => ({
        grantId: g.id,
        itemKey: `${g.subcategory_id ?? ""}::${g.item_kind}::${g.item_id}`,
        granteeUserId: g.grantee_user_id,
        granteeName: people.get(g.grantee_user_id)?.name ?? "",
        granteeEmail: people.get(g.grantee_user_id)?.email ?? "",
      })),
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:item-access.folder.GET", e);
  }
}
