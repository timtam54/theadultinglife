import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import type { RecordField } from "@/lib/db/types";

// The scan service accepts an optional list of "field hints" that come from
// the target folder's page_questions. Used to guide the AI toward the labels
// the app knows about. Free to add extras if the document has more.
export interface ScanFieldHint {
  label: string;
  type: "text" | "date" | "number";
}

const scanSchema = z.object({
  title: z.string(),
  fields: z.array(
    z.object({
      label: z.string(),
      type: z.enum(["text", "date", "number"]),
      value: z.string(),
    })
  ),
  expiryDate: z.string().nullable(),
  notes: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
});

export type ScanResult = z.infer<typeof scanSchema>;

export interface ScanOutput {
  title: string;
  fields: RecordField[];
  expiryDate: string | null;
  notes: string | null;
  confidence: ScanResult["confidence"];
}

interface ScanContext {
  folderName: string;
  categoryLabel: string;
  fieldHints: ScanFieldHint[] | null;
  /** Optional subcategory id — used to switch the prompt for folders
   *  whose documents don't fit the "structured fields" model (recipes,
   *  meal plans, letters). */
  subcategoryId?: string | null;
}

function buildSystemPrompt(ctx: ScanContext): string {
  // Bank statement PDFs — extract every transaction as JSON in the same
  // {headers, rows} shape a CSV upload produces so both paths populate the
  // entry's transactions_json field consistently.
  if (ctx.subcategoryId === "admin.bank_statements") {
    return `You are extracting data from a bank / credit-card statement (photo or PDF) for an Australian personal-finance app.

Return:
- title: the account or product name (e.g. "ANZ Access Advantage — 012-345 67890123") if visible, otherwise "Statement".
- fields: an array with these entries (omit any you can't read):
    { label: "Statement date",       type: "date",   value: "YYYY-MM-DD" }         — the date printed on the statement (or last day of the period)
    { label: "Statement period from", type: "date",   value: "YYYY-MM-DD" }         — first day of the period
    { label: "Statement period to",   type: "date",   value: "YYYY-MM-DD" }         — last day of the period
    { label: "Closing balance",       type: "number", value: "1234.56" }            — plain number, no currency symbol
    { label: "Transactions",          type: "text",   value: "<json string>" }      — see below

    The Transactions field's value MUST be a valid JSON STRING (the app will JSON.parse it) of the form:
      {"headers":["Date","Description","Debit","Credit","Balance"], "rows":[["...","...","...","...","..."], ...]}
    Adjust headers to match the statement's own columns in order. Include EVERY transaction row. Amounts as plain strings ("123.45"), no currency symbols. Dates in DD/MM/YYYY. Empty cells as "". Do NOT wrap the JSON in markdown fences. Do NOT truncate rows.

- expiryDate: always null.
- notes: null unless there's a genuinely useful non-transaction note.
- confidence: "high" if every row is clearly readable, "medium" if a few are unclear, "low" if you're guessing on multiple rows.

Do NOT invent transactions. If a row is unreadable, omit it. If the document is not a statement, return title="Unknown", empty fields, notes=null.`;
  }

  // Recipe folders need a different prompt — a typical recipe doc has
  // no expiry, no ID number, no "fields" in the structured sense. We
  // want the ingredients + method as one body string and a clean title.
  if (ctx.subcategoryId === "health.favourite_recipes") {
    return `You are extracting a recipe from a photo, scan, or PDF for a personal recipe book.

Return:
- title: just the recipe's name (e.g. "Lamingtons", "Beef Wellington"). No extra words.
- fields: return an empty array [] unless the recipe genuinely has a small piece of structured metadata worth capturing separately (e.g. servings, prep time). Do NOT invent fields.
- expiryDate: always null (recipes don't expire).
- notes: the FULL recipe — ingredients then method — as one plain-text string, with line breaks preserved. Use blank lines between sections. Keep quantities and units as written. This is the whole point of the extraction — do not truncate.
- confidence: "high" if the recipe is clearly readable end-to-end, "medium" if some parts are unclear, "low" if the image quality is poor.

Do NOT invent data. If the document is not a recipe, return title="Unknown", empty fields, and notes=null.`;
  }
  return buildDefaultSystemPrompt(ctx);
}

function buildDefaultSystemPrompt(ctx: ScanContext): string {
  const schemaHint =
    ctx.fieldHints && ctx.fieldHints.length
      ? ctx.fieldHints
          .map((f) => `    - "${f.label}" (${f.type})`)
          .join("\n")
      : null;

  return `You are extracting structured data from a photo, scan, or PDF of a personal or life-admin document for an Australian app.

The user has uploaded this into a folder called "${ctx.folderName}" under the "${ctx.categoryLabel}" section. Extract the information a user would want to store as a record for this folder.

${
  schemaHint
    ? `Preferred fields for this folder (extract these in this order when present; omit any you can't read):
${schemaHint}

IMPORTANT: after the preferred fields, ALSO append every OTHER labelled piece of information you can clearly read from the document (e.g. certificate number, reference number, issuing authority, awarded date, hours, grade, contact details, etc.). Use the label as it appears on the document. Missing these means the user loses information — err on the side of including extras.`
    : `No preferred field list — extract whatever the document reasonably contains as labelled fields (e.g. "Full name", "Number", "Issue date", "Expiry date").`
}

CRITICAL — prose documents (letters, references, cover letters, emails, correspondence):
Even when the document has NO obvious "Label: value" structure, extract the identifiable data points that are typically useful for filing:
  - Author / signatory name (label as "Author")
  - Author role / title (label as "Author role")
  - Author organisation (label as "Author organisation")
  - Author contact (email + phone, one field labelled "Author contact")
  - Recipient name (label as "Recipient") when a specific person is named
  - Subject / purpose in a few words (label as "Subject")
  - Date the document was written (label as "Date")
Return these as fields[] entries even though they aren't labelled in the source — extract from the letterhead, signature block, and greeting/closing.

General rules:
- title: a short human title for the record (e.g. "Driver's Licence", "Birth Certificate — Jane Smith", "Rental Contract — 12 Smith St").
- Return dates in ISO YYYY-MM-DD. Interpret Australian date formats (DD/MM/YYYY). If only month + year given, use the last day of that month.
- Do NOT invent data. If a field isn't clearly readable, omit it.
- expiryDate: the document's expiry/valid-to date if it has one, else null.
- notes: leave null unless there's genuinely useful context that doesn't fit in a field.
- confidence: "high" if the document is clear and core fields readable, "medium" if some are unclear, "low" if the image/PDF is poor quality or you had to guess a lot.

For multi-page PDFs, consider information from all pages.`;
}

export interface ScanImage {
  data: string; // base64
  mimeType: string;
}

interface ScanInput {
  images: ScanImage[]; // one or more images; PDFs must be the only entry
  folder: {
    id?: string;
    name: string;
    fieldHints: ScanFieldHint[] | null;
  };
  categoryLabel: string;
}

export async function scanDocument(input: ScanInput): Promise<ScanOutput> {
  if (input.images.length === 0) {
    throw new Error("no_images");
  }
  const first = input.images[0];
  const isPdf = first.mimeType === "application/pdf";
  if (isPdf && input.images.length > 1) {
    throw new Error("pdf_multi_image_not_supported");
  }

  const system = buildSystemPrompt({
    folderName: input.folder.name,
    categoryLabel: input.categoryLabel,
    fieldHints: input.folder.fieldHints,
    subcategoryId: input.folder.id ?? null,
  });

  const userText =
    input.images.length > 1
      ? `Extract this document into the schema. Folder: "${input.folder.name}". ${input.images.length} images provided (e.g. front and back of a card) — treat them as one document and merge fields.`
      : `Extract this document into the schema. Folder: "${input.folder.name}".`;

  const content = isPdf
    ? [
        {
          type: "file" as const,
          data: first.data,
          mediaType: "application/pdf",
          filename: `document.pdf`,
        },
        { type: "text" as const, text: userText },
      ]
    : [
        ...input.images.map((img) => ({
          type: "image" as const,
          image: img.data,
          mediaType: img.mimeType,
        })),
        { type: "text" as const, text: userText },
      ];

  const result = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: scanSchema,
    system,
    messages: [
      {
        role: "user",
        content,
      },
    ],
  });

  const parsed = result.object;

  const fields: RecordField[] = parsed.fields.map((f, i) => ({
    key: `f${i}_${Math.random().toString(36).slice(2, 8)}`,
    label: f.label,
    type: f.type,
    value: f.value,
  }));

  return {
    title: parsed.title,
    fields,
    expiryDate: parsed.expiryDate,
    notes: parsed.notes,
    confidence: parsed.confidence,
  };
}
