import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { enforceAiRateLimit } from "@/lib/services/rate-limit";
import {
  isRateLimitOrSpendError,
  rateLimitResponse,
} from "@/lib/services/rate-limit-response";
import { scanMealPlan } from "@/lib/services/meal-plan-scan";
import { getFileInFamily } from "@/lib/db/files";
import { createServiceClient } from "@/lib/supabase/server";
import { USER_FILES_BUCKET } from "@/lib/supabase/storage";
import { apiError } from "@/lib/api-error";

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

export const runtime = "nodejs";
export const maxDuration = 60;

// POST — read an already-uploaded meal plan (photo or PDF) into days and
// meals. Nothing is saved here; the planner shows the result for review.
// Body: { fileId }
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    await enforceAiRateLimit(session.user.id, "meal-plan-scan");
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "AI is not configured on this server." },
        { status: 503 }
      );
    }
    const body = (await request.json().catch(() => ({}))) as { fileId?: unknown };
    if (typeof body.fileId !== "string" || !body.fileId) {
      return NextResponse.json({ error: "file_required" }, { status: 400 });
    }
    const file = await getFileInFamily(session.user.familyGroupId, body.fileId);
    if (!file) {
      return NextResponse.json({ error: "file_not_found" }, { status: 404 });
    }
    if (!file.mime_type || !ALLOWED_MIME.has(file.mime_type)) {
      return NextResponse.json({ error: "unsupported_mime_type" }, { status: 400 });
    }
    if (Number(file.size_bytes) > MAX_BYTES) {
      return NextResponse.json({ error: "file_too_large" }, { status: 400 });
    }
    const { data, error } = await createServiceClient()
      .storage.from(USER_FILES_BUCKET)
      .download(file.storage_path);
    if (error || !data) {
      return NextResponse.json({ error: "download_failed" }, { status: 500 });
    }
    const base64 = Buffer.from(new Uint8Array(await data.arrayBuffer())).toString("base64");
    const scan = await scanMealPlan(base64, file.mime_type);
    return NextResponse.json({ scan });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (isRateLimitOrSpendError(e)) return rateLimitResponse(e);
    return apiError("api:meal-plan.scan.POST", e);
  }
}
