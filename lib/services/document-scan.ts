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
}

function buildSystemPrompt(ctx: ScanContext): string {
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

You may add extra fields beyond this list if the document contains other useful information.`
    : `No preferred field list — extract whatever the document reasonably contains as labelled fields (e.g. "Full name", "Number", "Issue date", "Expiry date").`
}

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
