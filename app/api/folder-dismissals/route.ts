import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import {
  deleteFolderDismissal,
  upsertFolderDismissal,
} from "@/lib/db/folder-dismissals";
import { isPrioritySubcategory } from "@/lib/services/folder-completion";
import { apiError } from "@/lib/api-error";

// POST /api/folder-dismissals
// Body: { subcategoryId: string, snoozeDays?: number }
// - Omit snoozeDays → permanent "Not applicable" (dismissed_until = null)
// - snoozeDays > 0  → snooze until now + N days
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as {
      subcategoryId?: unknown;
      snoozeDays?: unknown;
    };
    const subcategoryId =
      typeof body.subcategoryId === "string" ? body.subcategoryId.trim() : "";
    if (!subcategoryId) {
      return NextResponse.json(
        { error: "subcategory_required" },
        { status: 400 }
      );
    }
    if (await isPrioritySubcategory(subcategoryId)) {
      return NextResponse.json(
        { error: "priority_not_dismissable" },
        { status: 400 }
      );
    }
    let dismissedUntil: string | null = null;
    if (typeof body.snoozeDays === "number" && body.snoozeDays > 0) {
      const days = Math.min(365, Math.floor(body.snoozeDays));
      dismissedUntil = new Date(
        Date.now() + days * 24 * 60 * 60 * 1000
      ).toISOString();
    }
    await upsertFolderDismissal({
      userId: session.user.id,
      subcategoryId,
      dismissedUntil,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:folder-dismissals.POST", e, {
      status: 400,
      code: "bad_request",
    });
  }
}

// DELETE /api/folder-dismissals?subcategoryId=...
// Restores a hidden suggestion.
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession();
    const subcategoryId =
      new URL(request.url).searchParams.get("subcategoryId")?.trim() ?? "";
    if (!subcategoryId) {
      return NextResponse.json(
        { error: "subcategory_required" },
        { status: 400 }
      );
    }
    await deleteFolderDismissal({
      userId: session.user.id,
      subcategoryId,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:folder-dismissals.DELETE", e, {
      status: 400,
      code: "bad_request",
    });
  }
}
