import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { loadSharingMatrix } from "@/lib/services/sharing-matrix";
import { apiError } from "@/lib/api-error";

export const runtime = "nodejs";

// Owner's full items × people matrix. Powers the Settings section and the
// "View all shares" modal that pops out of any ShareDialog.
export async function GET() {
  try {
    const session = await requireSession();
    const matrix = await loadSharingMatrix(session.user.id);
    return NextResponse.json(matrix);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:sharing-matrix.GET", e);
  }
}
