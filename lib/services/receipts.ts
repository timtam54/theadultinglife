import nodemailer from "nodemailer";
import {
  deleteReceipt,
  getReceipt,
  getReceiptsByIds,
  insertReceipt,
  listFinancialYears,
  listReceipts,
  updateReceipt,
  type ReceiptInsert,
  type ReceiptRow,
  type ReceiptUpdate,
} from "@/lib/db/receipts";
import {
  createSignedDownloadUrl,
  deleteUserFile,
  uploadUserFile,
  userFilePath,
} from "@/lib/supabase/storage";
import { createServiceClient } from "@/lib/supabase/server";

// Australian financial year: 1 July → 30 June.
// A receipt dated 2026-08-14 belongs to FY "2026-2027" (internal key).
// Display it to users as "2026–27" via formatFyLabel.
export function financialYearForDate(isoDate: string): {
  financialYear: string;
  month: number;
} {
  const d = new Date(isoDate + "T00:00:00Z");
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const startYear = m >= 7 ? y : y - 1;
  return {
    financialYear: `${startYear}-${startYear + 1}`,
    month: m,
  };
}

// Display helper. Turns the internal "2026-2027" key into "2026–27".
export function formatFyLabel(financialYear: string): string {
  const match = financialYear.match(/^(\d{4})-(\d{4})$/);
  if (!match) return financialYear;
  return `${match[1]}–${match[2].slice(2)}`;
}

export interface SaveReceiptInput {
  userId: string;
  receiptDate: string;
  amount: number;
  supplier?: string | null;
  abn?: string | null;
  description?: string | null;
  category?: string | null;
  businessPurpose?: string | null;
  gstAmount?: number | null;
  gstClaimable?: boolean | null;
  paymentMethod?: string | null;
  invoiceNumber?: string | null;
  isAsset?: boolean;
  workRelatedPercent?: number | null;
  notes?: string | null;
  aiConfidence?: "high" | "medium" | "low" | null;
  file?: {
    bytes: Uint8Array;
    filename: string;
    mime: string;
    size: number;
  } | null;
}

export async function saveReceipt(input: SaveReceiptInput): Promise<ReceiptRow> {
  const { financialYear, month } = financialYearForDate(input.receiptDate);

  let filePath: string | null = null;
  let fileMime: string | null = null;
  let fileSize: number | null = null;

  if (input.file) {
    filePath = userFilePath(input.userId, input.file.filename);
    await uploadUserFile(filePath, input.file.bytes, input.file.mime);
    fileMime = input.file.mime;
    fileSize = input.file.size;
  }

  const row: ReceiptInsert = {
    user_id: input.userId,
    receipt_date: input.receiptDate,
    financial_year: financialYear,
    month,
    supplier: input.supplier ?? null,
    abn: input.abn ?? null,
    description: input.description ?? null,
    category: input.category ?? null,
    business_purpose: input.businessPurpose ?? null,
    amount: input.amount,
    gst_amount: input.gstAmount ?? null,
    gst_claimable: input.gstClaimable ?? null,
    payment_method: input.paymentMethod ?? null,
    invoice_number: input.invoiceNumber ?? null,
    is_asset: input.isAsset ?? false,
    work_related_percent: input.workRelatedPercent ?? null,
    notes: input.notes ?? null,
    ai_confidence: input.aiConfidence ?? null,
    file_path: filePath,
    file_mime: fileMime,
    file_size_bytes: fileSize,
  };

  return insertReceipt(row);
}

export interface UpdateReceiptInput {
  userId: string;
  id: string;
  patch: {
    receiptDate?: string;
    amount?: number;
    supplier?: string | null;
    abn?: string | null;
    description?: string | null;
    category?: string | null;
    businessPurpose?: string | null;
    gstAmount?: number | null;
    gstClaimable?: boolean | null;
    paymentMethod?: string | null;
    invoiceNumber?: string | null;
    isAsset?: boolean;
    workRelatedPercent?: number | null;
    notes?: string | null;
  };
}

export async function editReceipt(
  input: UpdateReceiptInput
): Promise<ReceiptRow> {
  const p = input.patch;
  const patch: ReceiptUpdate = {};
  if (p.receiptDate !== undefined) {
    patch.receipt_date = p.receiptDate;
    const fy = financialYearForDate(p.receiptDate);
    patch.financial_year = fy.financialYear;
    patch.month = fy.month;
  }
  if (p.amount !== undefined) patch.amount = p.amount;
  if (p.supplier !== undefined) patch.supplier = p.supplier;
  if (p.abn !== undefined) patch.abn = p.abn;
  if (p.description !== undefined) patch.description = p.description;
  if (p.category !== undefined) patch.category = p.category;
  if (p.businessPurpose !== undefined) patch.business_purpose = p.businessPurpose;
  if (p.gstAmount !== undefined) patch.gst_amount = p.gstAmount;
  if (p.gstClaimable !== undefined) patch.gst_claimable = p.gstClaimable;
  if (p.paymentMethod !== undefined) patch.payment_method = p.paymentMethod;
  if (p.invoiceNumber !== undefined) patch.invoice_number = p.invoiceNumber;
  if (p.isAsset !== undefined) patch.is_asset = p.isAsset;
  if (p.workRelatedPercent !== undefined)
    patch.work_related_percent = p.workRelatedPercent;
  if (p.notes !== undefined) patch.notes = p.notes;
  return updateReceipt(input.userId, input.id, patch);
}

export async function removeReceipt(
  userId: string,
  id: string
): Promise<void> {
  const row = await getReceipt(userId, id);
  if (!row) return;
  if (row.file_path) {
    await deleteUserFile(row.file_path).catch(() => {});
  }
  await deleteReceipt(userId, id);
}

export async function listReceiptsForUser(
  userId: string,
  opts?: { financialYear?: string; month?: number }
) {
  return listReceipts(userId, opts);
}

export async function listYearsForUser(userId: string): Promise<string[]> {
  return listFinancialYears(userId);
}

export async function signedUrlFor(
  userId: string,
  id: string
): Promise<string | null> {
  const row = await getReceipt(userId, id);
  if (!row?.file_path) return null;
  return createSignedDownloadUrl(row.file_path);
}

// ---------- Category rollup ----------

export interface CategoryTotal {
  category: string;
  total: number;
  deductible: number;
  count: number;
}

export function rollupByCategory(rows: ReceiptRow[]): {
  categories: CategoryTotal[];
  total: number;
  deductibleTotal: number;
} {
  const byCat = new Map<string, CategoryTotal>();
  let total = 0;
  let deductibleTotal = 0;
  for (const r of rows) {
    const cat = r.category ?? "Uncategorised";
    const existing = byCat.get(cat) ?? {
      category: cat,
      total: 0,
      deductible: 0,
      count: 0,
    };
    existing.total += Number(r.amount);
    existing.deductible += Number(r.deductible_amount);
    existing.count += 1;
    byCat.set(cat, existing);
    total += Number(r.amount);
    deductibleTotal += Number(r.deductible_amount);
  }
  const categories = Array.from(byCat.values()).sort(
    (a, b) => b.total - a.total
  );
  return { categories, total, deductibleTotal };
}

// ---------- Email to accountant ----------

function transporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) return null;
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function receiptsToCsv(rows: ReceiptRow[]): string {
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
    "Deductible Amount",
    "Receipt Attached",
    "Notes",
  ];
  const monthName = (m: number) =>
    [
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
    ][m - 1] ?? String(m);
  const lines = [header.map(csvEscape).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.financial_year,
        monthName(r.month),
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
        Number(r.deductible_amount).toFixed(2),
        r.file_path ? "Y" : "N",
        r.notes,
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  return lines.join("\n");
}

export interface EmailReceiptsInput {
  userId: string;
  receiptIds: string[];
  toEmail: string;
  fromName: string;
  fromEmail: string | null;
  message?: string;
}

export interface EmailReceiptsResult {
  sent: boolean;
  attached: number;
  totalAmount: number;
  deductibleTotal: number;
  stubbed: boolean;
}

export async function emailReceiptsToAccountant(
  input: EmailReceiptsInput
): Promise<EmailReceiptsResult> {
  const rows = await getReceiptsByIds(input.userId, input.receiptIds);
  if (rows.length === 0) {
    return {
      sent: false,
      attached: 0,
      totalAmount: 0,
      deductibleTotal: 0,
      stubbed: false,
    };
  }

  const totals = rollupByCategory(rows);

  const csv = receiptsToCsv(rows);
  const attachments: {
    filename: string;
    content: Buffer;
    contentType: string;
  }[] = [
    {
      filename: "receipt-register.csv",
      content: Buffer.from(csv, "utf-8"),
      contentType: "text/csv",
    },
  ];

  const supabase = createServiceClient();
  for (const r of rows) {
    if (!r.file_path) continue;
    const { data, error } = await supabase.storage
      .from("user-files")
      .download(r.file_path);
    if (error || !data) continue;
    const buf = Buffer.from(await data.arrayBuffer());
    const ext = (r.file_mime?.split("/")[1] ?? "bin").replace(
      /[^a-z0-9]/gi,
      ""
    );
    const label = [r.receipt_date, r.supplier ?? "receipt"]
      .join("_")
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    attachments.push({
      filename: `${label}.${ext}`,
      content: buf,
      contentType: r.file_mime ?? "application/octet-stream",
    });
  }

  const subject = `Receipt Register — ${rows.length} receipt${
    rows.length === 1 ? "" : "s"
  } from ${input.fromName}`;

  const bodyLines = [
    `Hi,`,
    ``,
    `Please find attached ${rows.length} receipt${
      rows.length === 1 ? "" : "s"
    } from ${input.fromName}.`,
    ``,
    `Total (incl. GST): $${totals.total.toFixed(2)}`,
    `Deductible total: $${totals.deductibleTotal.toFixed(2)}`,
    ``,
    `Breakdown by category:`,
    ...totals.categories.map(
      (c) =>
        `  • ${c.category}: $${c.total.toFixed(2)} (${c.count} receipt${
          c.count === 1 ? "" : "s"
        })`
    ),
    ``,
    `The CSV is a full register with all fields. Individual receipt images/PDFs are attached separately.`,
  ];
  if (input.message?.trim()) {
    bodyLines.push("", "Note from sender:", input.message.trim());
  }
  bodyLines.push("", `Sent via The Adulting Life.`);

  const t = transporter();
  if (!t) {
    console.log("[email-receipts] STUB — SMTP not configured");
    console.log(`  to: ${input.toEmail}`);
    console.log(`  subject: ${subject}`);
    console.log(`  attachments: ${attachments.length}`);
    return {
      sent: false,
      attached: rows.length,
      totalAmount: totals.total,
      deductibleTotal: totals.deductibleTotal,
      stubbed: true,
    };
  }

  await t.sendMail({
    from: process.env.EMAIL_USER!,
    to: input.toEmail,
    replyTo: input.fromEmail ?? undefined,
    subject,
    text: bodyLines.join("\n"),
    attachments,
  });

  return {
    sent: true,
    attached: rows.length,
    totalAmount: totals.total,
    deductibleTotal: totals.deductibleTotal,
    stubbed: false,
  };
}
