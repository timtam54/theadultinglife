import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { listQuestionsByGroup } from "@/lib/db/questions";
import { extractPageFormEntries } from "@/lib/services/page-form-extract";
import { enforceAiRateLimit } from "@/lib/services/rate-limit";
import {
  isRateLimitOrSpendError,
  rateLimitResponse,
} from "@/lib/services/rate-limit-response";
import { apiError } from "@/lib/api-error";

const MAX_BYTES = 20 * 1024 * 1024; // 20MB for PDFs
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);
const FILE_EXT = /\.(jpe?g|png|webp|heic|heif|pdf)$/i;

function resolveMime(file: File): string | null {
  if (ALLOWED_MIME.has(file.type)) return file.type;
  const m = file.name.match(FILE_EXT);
  if (!m) return null;
  const ext = m[1].toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "image/" + ext;
}

export const runtime = "nodejs";
export const maxDuration = 60;

// POST — read a document that lists several items (photo or PDF) and return
// one set of answers per item. Nothing is saved here; the repeater form adds
// them as unsaved entries for the user to review.
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "AI is not configured on this server." },
        { status: 503 }
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    const group = form.get("group");
    if (typeof group !== "string" || !group) {
      return NextResponse.json({ error: "group_required" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file_required" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "file_too_large" }, { status: 400 });
    }
    const mimeType = resolveMime(file);
    if (!mimeType) {
      return NextResponse.json(
        { error: "unsupported_mime_type" },
        { status: 400 }
      );
    }

    const questions = await listQuestionsByGroup(group);
    if (questions.length === 0) {
      return NextResponse.json({ error: "unknown_group" }, { status: 404 });
    }

    await enforceAiRateLimit(session.user.id, "scan-document");

    const bytes = new Uint8Array(await file.arrayBuffer());
    const base64 = Buffer.from(bytes).toString("base64");

    const result = await extractPageFormEntries(
      group,
      questions,
      base64,
      mimeType
    );
    return NextResponse.json({
      entries: result.entries,
      confidence: result.confidence,
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (isRateLimitOrSpendError(e)) {
      return rateLimitResponse(e);
    }
    return apiError("api:page-form.import-list.POST", e, {
      code: "import_failed",
    });
  }
}
