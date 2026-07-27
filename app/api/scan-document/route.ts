import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { scanDocument } from "@/lib/services/document-scan";
import { getUserSubcategory } from "@/lib/services/subcategories";
import { getFile } from "@/lib/db/files";
import { createServiceClient } from "@/lib/supabase/server";
import { USER_FILES_BUCKET } from "@/lib/supabase/storage";
import { CATEGORY_LABELS, type CategoryId } from "@/lib/db/types";
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

export const runtime = "nodejs";
export const maxDuration = 60;

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
    const subcategoryId = form.get("subcategoryId")?.toString() || null;
    if (!subcategoryId) {
      return NextResponse.json(
        { error: "subcategory_required" },
        { status: 400 }
      );
    }

    const folder = await getUserSubcategory(session.user.id, subcategoryId);
    if (!folder) {
      return NextResponse.json({ error: "folder_not_found" }, { status: 404 });
    }
    const categoryLabel =
      CATEGORY_LABELS[folder.category_id as CategoryId] ?? folder.category_id;

    // Two modes: (a) file upload in the form, or (b) fileId of an already-stored file.
    const fileIdRaw = form.get("fileId");
    const fileField = form.get("file");

    let mimeType: string;
    let base64: string;

    if (typeof fileIdRaw === "string" && fileIdRaw) {
      const row = await getFile(session.user.id, fileIdRaw);
      if (!row) {
        return NextResponse.json(
          { error: "file_not_found" },
          { status: 404 }
        );
      }
      if (!row.mime_type || !ALLOWED_MIME.has(row.mime_type)) {
        return NextResponse.json(
          { error: "unsupported_mime_type" },
          { status: 400 }
        );
      }
      if (Number(row.size_bytes) > MAX_BYTES) {
        return NextResponse.json({ error: "file_too_large" }, { status: 400 });
      }
      const supabase = createServiceClient();
      const { data, error } = await supabase.storage
        .from(USER_FILES_BUCKET)
        .download(row.storage_path);
      if (error || !data) {
        return NextResponse.json({ error: "download_failed" }, { status: 500 });
      }
      const bytes = new Uint8Array(await data.arrayBuffer());
      base64 = Buffer.from(bytes).toString("base64");
      mimeType = row.mime_type;
    } else if (fileField instanceof File) {
      if (fileField.size > MAX_BYTES) {
        return NextResponse.json({ error: "file_too_large" }, { status: 400 });
      }
      if (!ALLOWED_MIME.has(fileField.type)) {
        return NextResponse.json(
          { error: "unsupported_mime_type" },
          { status: 400 }
        );
      }
      const bytes = new Uint8Array(await fileField.arrayBuffer());
      base64 = Buffer.from(bytes).toString("base64");
      mimeType = fileField.type;
    } else {
      return NextResponse.json({ error: "file_required" }, { status: 400 });
    }

    const result = await scanDocument({
      data: base64,
      mimeType,
      folder,
      categoryLabel,
    });
    return NextResponse.json({ scan: result });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:scan-document.POST", e, { code: "scan_failed" });
  }
}
