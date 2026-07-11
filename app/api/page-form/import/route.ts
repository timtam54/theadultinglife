import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { listQuestionsByGroup } from "@/lib/db/questions";
import { extractPageFormAnswers } from "@/lib/services/page-form-extract";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const IMAGE_EXT = /\.(jpe?g|png|webp|heic|heif)$/i;

function resolveMime(file: File): string | null {
  if (ALLOWED_MIME.has(file.type)) return file.type;
  const m = file.name.match(IMAGE_EXT);
  if (!m) return null;
  const ext = m[1].toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "image/" + ext;
}

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    await requireSession();

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

    const bytes = new Uint8Array(await file.arrayBuffer());
    const base64 = Buffer.from(bytes).toString("base64");

    const result = await extractPageFormAnswers(
      group,
      questions,
      base64,
      mimeType
    );
    return NextResponse.json({
      answers: result.answers,
      confidence: result.confidence,
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/page-form/import]", e);
    const message =
      e instanceof Error ? e.message : "Unknown error while reading document.";
    return NextResponse.json(
      { error: "import_failed", message },
      { status: 500 }
    );
  }
}
