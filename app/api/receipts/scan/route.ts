import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { scanReceipt } from "@/lib/services/receipt-scan";
import { findPotentialDuplicates } from "@/lib/db/receipts";
import { apiError } from "@/lib/api-error";

const MAX_BYTES = 8 * 1024 * 1024;
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
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file_required" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "file_too_large" }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: "unsupported_mime_type" },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const base64 = Buffer.from(bytes).toString("base64");

    const scan = await scanReceipt(base64, file.type);

    // If the scan produced enough to identify a receipt, look for
    // pre-existing matches so the confirm form can warn about duplicates.
    let duplicates: Awaited<ReturnType<typeof findPotentialDuplicates>> = [];
    if (scan.receiptDate && scan.amount != null) {
      duplicates = await findPotentialDuplicates(session.user.id, {
        receiptDate: scan.receiptDate,
        amount: scan.amount,
        supplier: scan.supplier,
      });
    }
    return NextResponse.json({ scan, duplicates });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:receipts/scan.POST", e, { code: "scan_failed" });
  }
}
