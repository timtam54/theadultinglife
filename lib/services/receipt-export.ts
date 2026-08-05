import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { statusLabel, type ReceiptRow } from "@/lib/db/receipts";
import { rollupByCategory } from "./receipts";

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

function money(n: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(n);
}

export async function receiptsToXlsx(
  rows: ReceiptRow[],
  financialYearLabel: string
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "The Adulting Life";
  wb.created = new Date();

  const totals = rollupByCategory(rows);

  // Summary sheet
  const summary = wb.addWorksheet("Summary");
  summary.columns = [
    { width: 30 },
    { width: 18 },
  ];
  summary.addRow(["Receipt Register", financialYearLabel]).font = {
    bold: true,
    size: 14,
  };
  summary.addRow([]);
  summary.addRow(["Total spent (incl. GST)", money(totals.total)]);
  const dedRow = summary.addRow([
    "Potentially deductible",
    money(totals.deductibleTotal),
  ]);
  dedRow.getCell(2).font = { color: { argb: "FF047857" }, bold: true };
  summary.addRow(["Receipts included", rows.length]);
  summary.addRow([]);
  summary.addRow(["By category", ""]).font = { bold: true };
  for (const c of totals.categories) {
    summary.addRow([c.category, money(c.total)]);
  }
  summary.addRow([]);
  const disclaimer = summary.addRow([
    "Note: 'Potentially deductible' is the sum of amount × work-related % on receipts marked Ready for accountant. Personal receipts are excluded. This isn't tax advice — confirm what's actually claimable with your accountant.",
  ]);
  summary.mergeCells(`A${disclaimer.number}:B${disclaimer.number}`);
  disclaimer.getCell(1).alignment = { wrapText: true, vertical: "top" };
  disclaimer.getCell(1).font = { italic: true, size: 10 };
  disclaimer.height = 60;

  // Register sheet
  const reg = wb.addWorksheet("Register");
  reg.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Month", key: "month", width: 10 },
    { header: "Supplier", key: "supplier", width: 22 },
    { header: "ABN", key: "abn", width: 15 },
    { header: "Description", key: "description", width: 28 },
    { header: "Category", key: "category", width: 16 },
    { header: "Business purpose", key: "purpose", width: 22 },
    { header: "Amount (incl. GST)", key: "amount", width: 16 },
    { header: "GST", key: "gst", width: 10 },
    { header: "GST claimable", key: "gstClaimable", width: 12 },
    { header: "Payment method", key: "payment", width: 14 },
    { header: "Invoice no.", key: "invoice", width: 14 },
    { header: "Asset", key: "asset", width: 8 },
    { header: "Work %", key: "workPct", width: 8 },
    { header: "Potentially deductible", key: "deductible", width: 18 },
    { header: "Status", key: "status", width: 20 },
    { header: "Receipt attached", key: "attached", width: 14 },
    { header: "Notes", key: "notes", width: 30 },
  ];
  reg.getRow(1).font = { bold: true };
  reg.getRow(1).alignment = { vertical: "middle" };
  reg.views = [{ state: "frozen", ySplit: 1 }];

  for (const r of rows) {
    reg.addRow({
      date: r.receipt_date,
      month: MONTH_NAMES[r.month - 1] ?? String(r.month),
      supplier: r.supplier ?? "",
      abn: r.abn ?? "",
      description: r.description ?? "",
      category: r.category ?? "",
      purpose: r.business_purpose ?? "",
      amount: Number(r.amount),
      gst: r.gst_amount == null ? "" : Number(r.gst_amount),
      gstClaimable: r.gst_claimable == null ? "" : r.gst_claimable ? "Y" : "N",
      payment: r.payment_method ?? "",
      invoice: r.invoice_number ?? "",
      asset: r.is_asset ? "Y" : "N",
      workPct: r.work_related_percent ?? "",
      deductible:
        r.status === "personal" ? 0 : Number(r.deductible_amount),
      status: statusLabel(r.status),
      attached: r.file_path ? "Y" : "N",
      notes: r.notes ?? "",
    });
  }

  // Currency formatting for money columns.
  for (const col of ["amount", "gst", "deductible"] as const) {
    reg.getColumn(col).numFmt = '"$"#,##0.00';
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf);
}

export async function receiptsToPdfSummary(
  rows: ReceiptRow[],
  financialYearLabel: string
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  const totals = rollupByCategory(rows);
  const dark = rgb(0.15, 0.09, 0.19);
  const soft = rgb(0.44, 0.34, 0.46);
  const green = rgb(0.02, 0.47, 0.34);

  let y = 800;

  page.drawText("Receipt Register", {
    x: 50,
    y,
    size: 22,
    font: bold,
    color: dark,
  });
  y -= 22;
  page.drawText(financialYearLabel, {
    x: 50,
    y,
    size: 12,
    font,
    color: soft,
  });
  y -= 32;

  page.drawText(`Receipts included: ${rows.length}`, {
    x: 50,
    y,
    size: 11,
    font,
    color: dark,
  });
  y -= 24;

  const write = (
    label: string,
    value: string,
    valueColor = dark,
    valueBold = false
  ) => {
    page.drawText(label, { x: 50, y, size: 12, font, color: soft });
    const w = (valueBold ? bold : font).widthOfTextAtSize(value, 12);
    page.drawText(value, {
      x: 545 - w,
      y,
      size: 12,
      font: valueBold ? bold : font,
      color: valueColor,
    });
    y -= 18;
  };

  write("Total spent (incl. GST)", money(totals.total), dark, true);
  write(
    "Potentially deductible",
    money(totals.deductibleTotal),
    green,
    true
  );
  y -= 12;

  page.drawText("By category", { x: 50, y, size: 13, font: bold, color: dark });
  y -= 18;
  if (totals.categories.length === 0) {
    page.drawText("No categorised spending in this range.", {
      x: 50,
      y,
      size: 11,
      font: italic,
      color: soft,
    });
    y -= 16;
  } else {
    for (const c of totals.categories) {
      write(`${c.category}  (${c.count})`, money(c.total));
      if (y < 140) break;
    }
  }

  // Disclaimer at the bottom.
  const disc =
    "Note: 'Potentially deductible' is the sum of amount x work-related % on receipts marked Ready for accountant. Personal receipts are excluded. This is not tax advice — confirm what's actually claimable with your accountant.";
  const wrap = wrapText(disc, font, 10, 495);
  let dy = 90;
  for (const line of wrap) {
    page.drawText(line, { x: 50, y: dy, size: 10, font: italic, color: soft });
    dy -= 12;
  }

  return doc.save();
}

function wrapText(
  text: string,
  font: ReturnType<PDFDocument["embedFont"]> extends Promise<infer T>
    ? T
    : never,
  size: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
