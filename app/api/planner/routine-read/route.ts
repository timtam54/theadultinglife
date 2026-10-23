import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { getFileInFamily } from "@/lib/db/files";
import { createServiceClient } from "@/lib/supabase/server";
import { USER_FILES_BUCKET } from "@/lib/supabase/storage";
import { enforceAiRateLimit } from "@/lib/services/rate-limit";
import { isRateLimitOrSpendError, rateLimitResponse } from "@/lib/services/rate-limit-response";
import { extractRoutine } from "@/lib/services/routine-extract";
import { apiError } from "@/lib/api-error";

export const runtime = "nodejs";
export const maxDuration = 90;

const READABLE = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"]);

/** POST /api/planner/routine-read — body (form) { fileId }. Reads a photo /
 *  PDF of a daily routine into timed activities for the calendar. Nothing
 *  is saved here; the person reviews the list first. */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const form = await request.formData();
    const fileId = form.get("fileId")?.toString() ?? "";
    const row = fileId ? await getFileInFamily(session.user.familyGroupId, fileId) : null;
    if (!row) return NextResponse.json({ error: "file_not_found" }, { status: 404 });
    if (!row.mime_type || !READABLE.has(row.mime_type)) {
      return NextResponse.json(
        { error: "unsupported_mime_type", message: "That file type can't be read — use a photo or PDF." },
        { status: 400 }
      );
    }
    await enforceAiRateLimit(session.user.id, "scan-document");
    const { data, error } = await createServiceClient().storage.from(USER_FILES_BUCKET).download(row.storage_path);
    if (error || !data) return NextResponse.json({ error: "download_failed" }, { status: 500 });
    const b64 = Buffer.from(await data.arrayBuffer()).toString("base64");
    const result = await extractRoutine(b64, row.mime_type);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (isRateLimitOrSpendError(e)) return rateLimitResponse(e);
    return apiError("api:planner.routine-read.POST", e, { code: "routine_read_failed" });
  }
}
