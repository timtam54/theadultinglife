import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { enforceAiRateLimit } from "@/lib/services/rate-limit";
import {
  isRateLimitOrSpendError,
  rateLimitResponse,
} from "@/lib/services/rate-limit-response";
import { scanDocument, type ScanFieldHint } from "@/lib/services/document-scan";
import { listQuestionsBySubcategory } from "@/lib/db/questions";
import { cropFaceFromDocument } from "@/lib/services/face-crop";
import { getUserSubcategory } from "@/lib/services/subcategories";
import { getFile } from "@/lib/db/files";
import { createServiceClient } from "@/lib/supabase/server";
import {
  USER_FILES_BUCKET,
  uploadUserFile,
  userFilePath,
} from "@/lib/supabase/storage";
import { upsertUserFolderThumbnail } from "@/lib/db/user-folder-thumbnails";
import { isUserInFamilyGroup } from "@/lib/db/users";
import { CATEGORY_LABELS, type CategoryId } from "@/lib/db/types";
import { apiError } from "@/lib/api-error";

const FACE_CROP_FOLDERS = new Set<string>([
  "personal.drivers_licence",
  "personal.passport_travel",
]);

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
    await enforceAiRateLimit(session.user.id, "scan-document");

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

    const rawTargetUserId = form.get("targetUserId")?.toString().trim() || null;
    let targetUserId = session.user.id;
    if (rawTargetUserId && rawTargetUserId !== session.user.id) {
      const ok = await isUserInFamilyGroup(
        rawTargetUserId,
        session.user.familyGroupId
      );
      if (!ok) {
        return NextResponse.json(
          { error: "target_user_not_in_family" },
          { status: 403 }
        );
      }
      targetUserId = rawTargetUserId;
    }

    const folder = await getUserSubcategory(session.user.id, subcategoryId);
    if (!folder) {
      return NextResponse.json({ error: "folder_not_found" }, { status: 404 });
    }
    const categoryLabel =
      CATEGORY_LABELS[folder.category_id as CategoryId] ?? folder.category_id;

    // Two modes: (a) file upload(s) in the form (file / file2), or
    // (b) fileId(s) of already-stored files (fileId / fileId2).
    const fileIds = form.getAll("fileId").filter((v): v is string => typeof v === "string" && v.length > 0);
    const fileFields = form.getAll("file").filter((v): v is File => v instanceof File);

    const images: { data: string; mimeType: string }[] = [];

    for (const id of fileIds) {
      const row = await getFile(session.user.id, id);
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
      images.push({
        data: Buffer.from(bytes).toString("base64"),
        mimeType: row.mime_type,
      });
    }

    for (const f of fileFields) {
      if (f.size > MAX_BYTES) {
        return NextResponse.json({ error: "file_too_large" }, { status: 400 });
      }
      if (!ALLOWED_MIME.has(f.type)) {
        return NextResponse.json(
          { error: "unsupported_mime_type" },
          { status: 400 }
        );
      }
      const bytes = new Uint8Array(await f.arrayBuffer());
      images.push({
        data: Buffer.from(bytes).toString("base64"),
        mimeType: f.type,
      });
    }

    if (images.length === 0) {
      return NextResponse.json({ error: "file_required" }, { status: 400 });
    }
    if (images.length > 1 && images.some((i) => i.mimeType === "application/pdf")) {
      return NextResponse.json(
        { error: "pdf_multi_not_supported" },
        { status: 400 }
      );
    }

    // Field hints come from the folder's page_questions (was default_fields
     // before the JSON refactor). Used to guide the AI toward known labels.
    const questions = await listQuestionsBySubcategory(subcategoryId);
    const fieldHints: ScanFieldHint[] = questions.map((q) => ({
      label: q.label,
      type:
        q.question_type === "date"
          ? "date"
          : q.question_type === "number" || q.question_type === "int"
            ? "number"
            : "text",
    }));

    const result = await scanDocument({
      images,
      folder: { name: folder.name, fieldHints: fieldHints.length ? fieldHints : null },
      categoryLabel,
    });

    // Best-effort: for folders where the document contains a face (drivers
    // licence, passport), crop the portrait from the first image and save it
    // as this user's folder thumbnail. Failures are non-fatal.
    if (FACE_CROP_FOLDERS.has(subcategoryId)) {
      try {
        const face = await cropFaceFromDocument(
          images[0].data,
          images[0].mimeType
        );
        if (face) {
          const path = userFilePath(targetUserId, `folder-thumb-${subcategoryId}.jpg`);
          await uploadUserFile(path, face.bytes, face.mimeType);
          await upsertUserFolderThumbnail(
            targetUserId,
            subcategoryId,
            path,
            face.mimeType
          );
        }
      } catch {
        // swallow — thumbnail crop is a nice-to-have
      }
    }

    return NextResponse.json({ scan: result });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (isRateLimitOrSpendError(e)) {
      return rateLimitResponse(e);
    }
    return apiError("api:scan-document.POST", e, { code: "scan_failed" });
  }
}
