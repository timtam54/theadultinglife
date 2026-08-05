import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { apiError } from "@/lib/api-error";
import {
  formatFyLabel,
  listReceiptsForUser,
} from "@/lib/services/receipts";
import {
  receiptsToPdfSummary,
  receiptsToXlsx,
} from "@/lib/services/receipt-export";
import { RECEIPT_STATUSES, type ReceiptStatus } from "@/lib/db/receipts";
import { receiptsToCsvBytes } from "@/lib/services/receipt-csv";

export const runtime = "nodejs";
export const maxDuration = 60;

// Streams a downloadable register in CSV / XLSX / PDF form. The client
// controls the filter (fy, month, status, supplier, category) via query
// params, mirroring the list view so the export always matches what the
// user is looking at.
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const url = new URL(request.url);
    const format = (url.searchParams.get("format") ?? "csv").toLowerCase();
    const fy = url.searchParams.get("fy") ?? undefined;
    const monthStr = url.searchParams.get("month");
    const month = monthStr ? parseInt(monthStr, 10) : undefined;
    const statusParam = url.searchParams.get("status");
    const status =
      statusParam &&
      (RECEIPT_STATUSES as readonly string[]).includes(statusParam)
        ? (statusParam as ReceiptStatus)
        : null;
    const supplier = (url.searchParams.get("supplier") ?? "").trim().toLowerCase();
    const category = (url.searchParams.get("category") ?? "").trim();

    const rows = await listReceiptsForUser(session.user.id, {
      financialYear: fy,
      month: month && month >= 1 && month <= 12 ? month : undefined,
    });

    const filtered = rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (
        supplier &&
        !(r.supplier ?? "").toLowerCase().includes(supplier)
      ) {
        return false;
      }
      if (category && (r.category ?? "") !== category) return false;
      return true;
    });

    const fyLabel = fy ? formatFyLabel(fy) : "All years";
    const baseName = `receipts-${fy ?? "all"}${month ? `-${month}` : ""}`;

    if (format === "xlsx") {
      const bytes = await receiptsToXlsx(filtered, fyLabel);
      return new NextResponse(bytes as unknown as BodyInit, {
        headers: {
          "content-type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "content-disposition": `attachment; filename="${baseName}.xlsx"`,
        },
      });
    }
    if (format === "pdf") {
      const bytes = await receiptsToPdfSummary(filtered, fyLabel);
      return new NextResponse(bytes as unknown as BodyInit, {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename="${baseName}-summary.pdf"`,
        },
      });
    }
    // Default: CSV
    const csv = receiptsToCsvBytes(filtered);
    return new NextResponse(csv as unknown as BodyInit, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${baseName}.csv"`,
      },
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:receipts/export.GET", e);
  }
}
