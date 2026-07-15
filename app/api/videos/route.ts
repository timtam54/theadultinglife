import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { COURSE_ARTICLES } from "@/content/course-articles";
import { insertVideo } from "@/lib/db/videos";
import { classifyVideoUrl } from "@/lib/videos/urlSource";
import { apiError } from "@/lib/api-error";

const ARTICLE_IDS = new Set(COURSE_ARTICLES.map((a) => a.id));

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "s") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const body = (await request.json().catch(() => ({}))) as {
      articleId?: string;
      title?: string;
      description?: string | null;
      // For uploads (confirmed after direct-to-storage PUT):
      storagePath?: string;
      contentType?: string;
      sizeBytes?: number;
      // For URL entries:
      url?: string;
    };
    const articleId = (body.articleId ?? "").trim();
    const title = (body.title ?? "").trim();
    if (!ARTICLE_IDS.has(articleId)) {
      return NextResponse.json({ error: "unknown_article" }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "title_required" }, { status: 400 });
    }
    const description = body.description?.trim() || null;

    const storagePath = body.storagePath?.trim();
    const rawUrl = body.url?.trim();

    if (storagePath && !rawUrl) {
      const row = await insertVideo({
        articleId,
        title,
        description,
        source: "upload",
        storagePath,
        url: null,
        contentType: body.contentType?.trim() ?? null,
        sizeBytes:
          typeof body.sizeBytes === "number" && Number.isFinite(body.sizeBytes)
            ? body.sizeBytes
            : null,
        createdBy: session.user.id,
      });
      return NextResponse.json({ video: row });
    }

    if (rawUrl && !storagePath) {
      const { source } = classifyVideoUrl(rawUrl);
      const row = await insertVideo({
        articleId,
        title,
        description,
        source,
        storagePath: null,
        url: rawUrl,
        contentType: null,
        sizeBytes: null,
        createdBy: session.user.id,
      });
      return NextResponse.json({ video: row });
    }

    return NextResponse.json(
      { error: "one_of_url_or_upload_required" },
      { status: 400 }
    );
  } catch (e) {
    return apiError("api:videos.POST", e);
  }
}
