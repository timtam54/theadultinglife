import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { COURSE_ARTICLES } from "@/content/course-articles";
import {
  createSignedVideoUploadUrl,
  videoStoragePath,
} from "@/lib/supabase/videoStorage";
import { apiError } from "@/lib/api-error";

const ALLOWED_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
]);
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB (Supabase free-tier cap)

const ARTICLE_IDS = new Set(COURSE_ARTICLES.map((a) => a.id));

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "s") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const body = (await request.json().catch(() => ({}))) as {
      articleId?: string;
      filename?: string;
      contentType?: string;
      sizeBytes?: number;
    };
    const articleId = (body.articleId ?? "").trim();
    const filename = (body.filename ?? "").trim();
    const contentType = (body.contentType ?? "").trim();
    const sizeBytes = Number(body.sizeBytes ?? 0);

    if (!ARTICLE_IDS.has(articleId)) {
      return NextResponse.json({ error: "unknown_article" }, { status: 400 });
    }
    if (!filename) {
      return NextResponse.json({ error: "filename_required" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: "unsupported_type", allowed: [...ALLOWED_TYPES] },
        { status: 400 }
      );
    }
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_BYTES) {
      return NextResponse.json(
        { error: "invalid_size", maxBytes: MAX_BYTES },
        { status: 400 }
      );
    }

    const storagePath = videoStoragePath(articleId, filename);
    const { signedUrl, token } = await createSignedVideoUploadUrl(storagePath);
    return NextResponse.json({ storagePath, signedUrl, token });
  } catch (e) {
    return apiError("api:videos.upload-url.POST", e);
  }
}
