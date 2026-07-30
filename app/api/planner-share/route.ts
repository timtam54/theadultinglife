import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import {
  getActivePlannerShare,
  revokePlannerShare,
  upsertPlannerShare,
} from "@/lib/db/planner-shares";
import { apiError } from "@/lib/api-error";

const DEFAULT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// GET /api/planner-share
// Returns the current active share (or null).
export async function GET() {
  try {
    const session = await requireSession();
    const row = await getActivePlannerShare(session.user.id);
    return NextResponse.json({
      share: row
        ? { token: row.token, expiresAt: row.expires_at }
        : null,
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:planner-share.GET", e, {
      status: 400,
      code: "bad_request",
    });
  }
}

// POST /api/planner-share
// Creates or replaces the active share. Any previous token stops working.
export async function POST() {
  try {
    const session = await requireSession();
    const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_MS).toISOString();
    const row = await upsertPlannerShare({
      userId: session.user.id,
      expiresAt,
    });
    return NextResponse.json(
      { share: { token: row.token, expiresAt: row.expires_at } },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:planner-share.POST", e, {
      status: 400,
      code: "bad_request",
    });
  }
}

// DELETE /api/planner-share
// Revokes the active share (link stops working immediately).
export async function DELETE() {
  try {
    const session = await requireSession();
    await revokePlannerShare(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:planner-share.DELETE", e, {
      status: 400,
      code: "bad_request",
    });
  }
}
