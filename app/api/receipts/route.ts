import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { apiError } from "@/lib/api-error";
import {
  listReceiptsForUser,
  saveReceipt,
} from "@/lib/services/receipts";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const url = new URL(request.url);
    const financialYear = url.searchParams.get("fy") ?? undefined;
    const monthStr = url.searchParams.get("month");
    const month = monthStr ? parseInt(monthStr, 10) : undefined;

    const receipts = await listReceiptsForUser(session.user.id, {
      financialYear,
      month: month && month >= 1 && month <= 12 ? month : undefined,
    });
    return NextResponse.json({ receipts });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:receipts.GET", e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const form = await request.formData();

    const receiptDate = String(form.get("receiptDate") ?? "");
    const amountStr = String(form.get("amount") ?? "");
    const amount = parseFloat(amountStr);
    if (!receiptDate || !/^\d{4}-\d{2}-\d{2}$/.test(receiptDate)) {
      return NextResponse.json(
        { error: "invalid_receipt_date" },
        { status: 400 }
      );
    }
    if (!isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
    }

    const str = (k: string) => {
      const v = form.get(k);
      return v == null || v === "" ? null : String(v);
    };
    const num = (k: string) => {
      const v = form.get(k);
      if (v == null || v === "") return null;
      const n = parseFloat(String(v));
      return isFinite(n) ? n : null;
    };
    const int = (k: string) => {
      const v = form.get(k);
      if (v == null || v === "") return null;
      const n = parseInt(String(v), 10);
      return isFinite(n) ? n : null;
    };
    const bool = (k: string) => {
      const v = form.get(k);
      if (v == null || v === "") return null;
      return String(v) === "true";
    };

    let file: {
      bytes: Uint8Array;
      filename: string;
      mime: string;
      size: number;
    } | null = null;
    const rawFile = form.get("file");
    if (rawFile instanceof File && rawFile.size > 0) {
      if (rawFile.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: "file_too_large" },
          { status: 400 }
        );
      }
      if (!ALLOWED_MIME.has(rawFile.type)) {
        return NextResponse.json(
          { error: "unsupported_mime_type" },
          { status: 400 }
        );
      }
      file = {
        bytes: new Uint8Array(await rawFile.arrayBuffer()),
        filename: rawFile.name,
        mime: rawFile.type,
        size: rawFile.size,
      };
    }

    const aiConf = str("aiConfidence");
    const receipt = await saveReceipt({
      userId: session.user.id,
      receiptDate,
      amount,
      supplier: str("supplier"),
      abn: str("abn"),
      description: str("description"),
      category: str("category"),
      businessPurpose: str("businessPurpose"),
      gstAmount: num("gstAmount"),
      gstClaimable: bool("gstClaimable"),
      paymentMethod: str("paymentMethod"),
      invoiceNumber: str("invoiceNumber"),
      isAsset: bool("isAsset") ?? false,
      workRelatedPercent: int("workRelatedPercent"),
      notes: str("notes"),
      aiConfidence:
        aiConf === "high" || aiConf === "medium" || aiConf === "low"
          ? aiConf
          : null,
      file,
    });
    return NextResponse.json({ receipt });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:receipts.POST", e);
  }
}
