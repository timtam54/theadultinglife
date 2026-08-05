import { statusLabel, type ReceiptRow } from "@/lib/db/receipts";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function receiptsToCsv(rows: ReceiptRow[]): string {
  const header = [
    "Financial Year",
    "Month",
    "Date",
    "Supplier",
    "ABN",
    "Description",
    "Category",
    "Business Purpose",
    "Amount (incl. GST)",
    "GST",
    "GST Claimable",
    "Payment Method",
    "Invoice No.",
    "Asset",
    "Work-related %",
    "Potentially Deductible Amount",
    "Status",
    "Receipt Attached",
    "Notes",
  ];
  const lines = [header.map(csvEscape).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.financial_year,
        MONTH_NAMES[r.month - 1] ?? String(r.month),
        r.receipt_date,
        r.supplier,
        r.abn,
        r.description,
        r.category,
        r.business_purpose,
        Number(r.amount).toFixed(2),
        r.gst_amount == null ? "" : Number(r.gst_amount).toFixed(2),
        r.gst_claimable == null ? "" : r.gst_claimable ? "Y" : "N",
        r.payment_method,
        r.invoice_number,
        r.is_asset ? "Y" : "N",
        r.work_related_percent == null ? "" : r.work_related_percent,
        r.status === "personal"
          ? "0.00"
          : Number(r.deductible_amount).toFixed(2),
        statusLabel(r.status),
        r.file_path ? "Y" : "N",
        r.notes,
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  return lines.join("\n");
}

export function receiptsToCsvBytes(rows: ReceiptRow[]): Uint8Array {
  return new TextEncoder().encode(receiptsToCsv(rows));
}
