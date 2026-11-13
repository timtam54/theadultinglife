import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";
import { SHOP_FILES_BUCKET, SHOP_IMAGES_BUCKET } from "@/lib/shop/db";

// POST — a signed URL the browser PUTs a product photo or download file to
// (straight to storage, so large PDFs don't go through the server).

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "s") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as {
    kind?: "image" | "file";
    filename?: string;
    contentType?: string;
    sizeBytes?: number;
  };
  const filename = (body.filename ?? "").trim();
  if (!filename || (body.kind !== "image" && body.kind !== "file")) {
    return NextResponse.json({ message: "Missing file" }, { status: 400 });
  }
  if (body.kind === "image" && !IMAGE_TYPES.has(body.contentType ?? "")) {
    return NextResponse.json({ message: "Photos must be JPG, PNG or WebP." }, { status: 400 });
  }
  if (!(Number(body.sizeBytes) > 0) || Number(body.sizeBytes) > MAX_BYTES) {
    return NextResponse.json({ message: "Files must be under 50 MB." }, { status: 400 });
  }
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 150);
  const path = `${crypto.randomUUID()}-${safe}`;
  const bucket = body.kind === "image" ? SHOP_IMAGES_BUCKET : SHOP_FILES_BUCKET;
  const { data, error } = await createServiceClient().storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[admin/shop/upload-url]", error);
    return NextResponse.json({ message: "Couldn't start the upload." }, { status: 500 });
  }
  return NextResponse.json({ path, signedUrl: data.signedUrl });
}
