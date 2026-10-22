import { zipSync, type Zippable } from "fflate";
import { createServiceClient } from "@/lib/supabase/server";
import { USER_FILES_BUCKET } from "@/lib/supabase/storage";
import { buildWorkbook, type SheetSpec } from "@/lib/services/excel-export";
import { loadCompleteExport, type CompleteExportData } from "./data";
import { renderOrganiserPdf } from "./pdf";

// The complete organiser download: one zip holding
//   My Organiser.pdf   — branded, laid out like the physical Organiser
//   My Organiser.xlsx  — one workbook, a tab per folder
//   Documents/…        — every uploaded document, scan and receipt photo,
//                        in folders matching the organiser
// Built on request, stored privately under exports/<family>/ (replacing the
// previous one) and handed back as a signed link valid for 24 hours.

export const EXPORT_LINK_TTL_SECONDS = 24 * 60 * 60;

/** Excel tab names: max 31 chars, no []:*?/\ and unique (case-insensitive). */
function tabNamer() {
  const used = new Set<string>();
  return (name: string) => {
    const base = name.replace(/[[\]:*?/\\]/g, "-").trim().slice(0, 31) || "Sheet";
    let n = base;
    for (let i = 2; used.has(n.toLowerCase()); i++) {
      const suffix = ` (${i})`;
      n = base.slice(0, 31 - suffix.length) + suffix;
    }
    used.add(n.toLowerCase());
    return n;
  };
}

export async function buildOrganiserWorkbook(data: CompleteExportData): Promise<Uint8Array> {
  const tab = tabNamer();
  const heading = (title: string) => [
    `${title} — The Adulting Life`,
    `Downloaded ${data.generatedAt.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })}`,
  ];
  const sheets: SheetSpec[] = [];
  const contents: Record<string, string>[] = [];

  for (const c of data.categories) {
    for (const f of c.folders) {
      const name = tab(f.name);
      const hasTitles = f.people.some((p) => p.entries.some((e) => e.title));
      const columns = [
        { header: "Family member", key: "__person", width: 22 },
        ...(hasTitles ? [{ header: "Entry", key: "__title", width: 26 }] : []),
        ...f.columns.map((label) => ({ header: label, key: label, width: 24 })),
        { header: "Documents", key: "__docs", width: 50 },
      ];
      const rows: Record<string, string>[] = [];
      for (const p of f.people) {
        for (const e of p.entries) {
          const row: Record<string, string> = {
            __person: p.personName,
            __title: e.title ?? "",
            __docs: e.documents.join("\n"),
          };
          for (const field of e.fields) row[field.label] = field.value;
          rows.push(row);
        }
      }
      if (f.documents.length > 0) {
        rows.push({ __person: "Folder documents", __docs: f.documents.join("\n") });
      }
      sheets.push({ name, heading: heading(f.name), columns, rows });
      contents.push({ section: c.label, folder: f.name, tab: name, entries: String(rows.length) });
    }
  }

  if (data.planner.length > 0) {
    const name = tab("Planner");
    sheets.push({
      name,
      heading: heading("Peace of Mind Planner"),
      columns: [
        { header: "Family member", key: "person", width: 22 },
        { header: "Section", key: "heading", width: 34 },
        { header: "Text", key: "body", width: 100 },
      ],
      rows: data.planner.flatMap((p) =>
        p.items.map((it) => ({ person: p.personName, heading: it.heading, body: it.body }))
      ),
    });
    contents.push({ section: "Peace of Mind Planner", folder: "", tab: name, entries: "" });
  }

  if (data.receipts.length > 0) {
    const name = tab("Receipts");
    sheets.push({
      name,
      heading: heading("Receipts"),
      columns: [
        { header: "Date", key: "date", width: 14 },
        { header: "Financial year", key: "financialYear", width: 14 },
        { header: "Family member", key: "personName", width: 22 },
        { header: "Supplier", key: "supplier", width: 26 },
        { header: "Description", key: "description", width: 32 },
        { header: "Category", key: "category", width: 18 },
        { header: "Amount", key: "amount", width: 12 },
        { header: "GST", key: "gst", width: 10 },
        { header: "Deductible", key: "deductible", width: 12 },
        { header: "Document", key: "document", width: 50 },
      ],
      rows: data.receipts.map((r) => ({ ...r })),
    });
    contents.push({ section: "Receipts", folder: "", tab: name, entries: String(data.receipts.length) });
  }

  sheets.unshift({
    name: "Contents",
    heading: heading("My Organiser"),
    columns: [
      { header: "Section", key: "section", width: 24 },
      { header: "Folder", key: "folder", width: 36 },
      { header: "Tab", key: "tab", width: 34 },
      { header: "Entries", key: "entries", width: 10 },
    ],
    rows: contents,
  });

  return buildWorkbook(sheets);
}

async function downloadAll(
  files: CompleteExportData["files"]
): Promise<{ files: Zippable; missing: string[] }> {
  const supabase = createServiceClient();
  const out: Zippable = {};
  const missing: string[] = [];
  let next = 0;
  // A few at a time — enough to be quick without flooding storage.
  async function worker() {
    while (next < files.length) {
      const f = files[next++];
      const { data, error } = await supabase.storage.from(USER_FILES_BUCKET).download(f.storagePath);
      if (error || !data) {
        missing.push(f.zipPath);
        continue;
      }
      // Documents are already compressed (PDF / JPEG / PNG) — store as-is.
      out[f.zipPath] = [new Uint8Array(await data.arrayBuffer()), { level: 0 }];
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  return { files: out, missing };
}

export interface CompleteExportResult {
  url: string;
  filename: string;
  documents: number;
  missingDocuments: number;
  sizeBytes: number;
}

export async function createCompleteExport(familyGroupId: string): Promise<CompleteExportResult> {
  const data = await loadCompleteExport(familyGroupId);
  const [pdf, xlsx, docs] = await Promise.all([
    renderOrganiserPdf(data),
    buildOrganiserWorkbook(data),
    downloadAll(data.files),
  ]);

  const entries: Zippable = {
    "My Organiser.pdf": [pdf, { level: 0 }],
    "My Organiser.xlsx": [xlsx, { level: 0 }],
    ...docs.files,
  };
  if (docs.missing.length > 0) {
    entries["Documents/Missing files.txt"] = new TextEncoder().encode(
      "These uploads couldn't be found in storage and aren't included:\n\n" + docs.missing.join("\n")
    );
  }
  const zip = zipSync(entries, { level: 6 });

  const date = data.generatedAt.toISOString().slice(0, 10);
  const filename = `The Adulting Life - My Organiser - ${date}.zip`;
  const dir = `exports/${familyGroupId}`;
  const storagePath = `${dir}/${Date.now()}.zip`;

  const supabase = createServiceClient();
  const bucket = supabase.storage.from(USER_FILES_BUCKET);
  // Keep only the latest download for this family.
  const { data: old } = await bucket.list(dir);
  if (old && old.length > 0) {
    await bucket.remove(old.map((o) => `${dir}/${o.name}`));
  }
  const { error: upErr } = await bucket.upload(storagePath, zip, {
    contentType: "application/zip",
    upsert: false,
  });
  if (upErr) throw upErr;
  const { data: signed, error: signErr } = await bucket.createSignedUrl(storagePath, EXPORT_LINK_TTL_SECONDS, {
    download: filename,
  });
  if (signErr || !signed) throw signErr ?? new Error("Failed to create download link");

  return {
    url: signed.signedUrl,
    filename,
    documents: data.files.length - docs.missing.length,
    missingDocuments: docs.missing.length,
    sizeBytes: zip.byteLength,
  };
}
