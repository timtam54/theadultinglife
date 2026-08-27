import ExcelJS from "exceljs";

export interface SheetSpec {
  name: string;
  columns: { header: string; key: string; width?: number }[];
  rows: Record<string, string | number | null>[];
  /** Optional freeform lines shown above the table (e.g. title / subtitle). */
  heading?: string[];
}

/**
 * Build an xlsx workbook from one or more sheet specs. Every sheet gets:
 *  - optional heading lines in row(s) 1..n (merged across the columns)
 *  - a bold header row with a frozen split
 *  - the data rows
 */
export async function buildWorkbook(sheets: SheetSpec[]): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "The Adulting Life";
  wb.created = new Date();

  for (const spec of sheets) {
    const ws = wb.addWorksheet(spec.name.slice(0, 31));
    let headerRowNumber = 1;

    if (spec.heading && spec.heading.length > 0) {
      for (const line of spec.heading) {
        const r = ws.addRow([line]);
        ws.mergeCells(r.number, 1, r.number, Math.max(spec.columns.length, 1));
        r.getCell(1).font = { bold: true, size: 12 };
      }
      ws.addRow([]);
      headerRowNumber = spec.heading.length + 2;
    }

    ws.columns = spec.columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? 22,
    }));
    // exceljs `columns` writes headers at row 1 by default. If we've already
    // written heading lines, move the header row down.
    if (headerRowNumber !== 1) {
      // Clear the auto-written row-1 header cells and re-write at the right row.
      const auto = ws.getRow(1);
      auto.values = spec.heading?.[0] ? [spec.heading[0]] : [];
      const hdr = ws.getRow(headerRowNumber);
      spec.columns.forEach((c, i) => (hdr.getCell(i + 1).value = c.header));
    }
    const hdr = ws.getRow(headerRowNumber);
    hdr.font = { bold: true };
    hdr.alignment = { vertical: "middle" };
    ws.views = [{ state: "frozen", ySplit: headerRowNumber }];

    for (const row of spec.rows) ws.addRow(row);
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf);
}

export function xlsxResponse(
  body: Uint8Array,
  filename: string
): Response {
  const safe = filename.replace(/[^\w.-]+/g, "_");
  return new Response(body as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safe}"`,
      "Cache-Control": "no-store",
    },
  });
}
