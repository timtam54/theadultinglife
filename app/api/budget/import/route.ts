import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { getFileInFamily } from "@/lib/db/files";
import { createServiceClient } from "@/lib/supabase/server";
import { USER_FILES_BUCKET } from "@/lib/supabase/storage";
import { extractBudget, isImportableBudgetFile } from "@/lib/services/budget-import";
import { PERIODS, type BudgetPeriod } from "@/lib/budget";
import { enforceAiRateLimit } from "@/lib/services/rate-limit";
import { isRateLimitOrSpendError, rateLimitResponse } from "@/lib/services/rate-limit-response";
import { apiError } from "@/lib/api-error";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 20 * 1024 * 1024;

// POST — read an already-uploaded budget file (Excel, CSV, PDF or photo) into
// Money & Me sections, amounts for the given period. Nothing is saved here;
// the budget screen shows the result for review. Body: { fileId, period }
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as { fileId?: unknown; period?: unknown };
    if (typeof body.fileId !== "string" || !body.fileId) {
      return NextResponse.json({ error: "file_required" }, { status: 400 });
    }
    const period: BudgetPeriod = (PERIODS as readonly unknown[]).includes(body.period)
      ? (body.period as BudgetPeriod)
      : "monthly";
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "AI is not configured on this server." }, { status: 503 });
    }
    const file = await getFileInFamily(session.user.familyGroupId, body.fileId);
    if (!file) return NextResponse.json({ error: "file_not_found" }, { status: 404 });
    if (!isImportableBudgetFile(file.filename, file.mime_type)) {
      return NextResponse.json({ error: "unsupported_file" }, { status: 400 });
    }
    if (Number(file.size_bytes) > MAX_BYTES) {
      return NextResponse.json({ error: "file_too_large" }, { status: 400 });
    }
    await enforceAiRateLimit(session.user.id, "budget-import");
    const { data, error } = await createServiceClient().storage.from(USER_FILES_BUCKET).download(file.storage_path);
    if (error || !data) return NextResponse.json({ error: "download_failed" }, { status: 500 });
    const result = await extractBudget({
      data: Buffer.from(await data.arrayBuffer()),
      filename: file.filename,
      mimeType: file.mime_type,
      period,
    });
    return NextResponse.json({ result });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (isRateLimitOrSpendError(e)) return rateLimitResponse(e);
    return apiError("api:budget.import.POST", e);
  }
}
