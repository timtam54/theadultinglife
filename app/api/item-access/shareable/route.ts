import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { listShareableItemsForOwner } from "@/lib/services/planner-shareable";
import { apiError } from "@/lib/api-error";

// GET — every Planner-shareable item the current user owns. Populates the
// "Share all" dialog on Settings so the owner can bulk-grant access.
export async function GET() {
  try {
    const session = await requireSession();
    const items = await listShareableItemsForOwner(session.user.id);
    return NextResponse.json({ items });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:item-access.shareable.GET", e);
  }
}
