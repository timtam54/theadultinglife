import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import type { RecordField } from "@/lib/db/types";

const scanSchema = z.object({
  docType: z.enum(["drivers_licence", "medicare_card", "passport", "unknown"]),
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
  docType: ScanResult["docType"];
  title: string;
  fields: RecordField[];
  expiryDate: string | null;
  notes: string | null;
  confidence: ScanResult["confidence"];
}

const SYSTEM_PROMPT = `You are extracting structured data from a photo or scan of an identity document for an Australian life-admin app.

Detect which document it is (Australian driver's licence, Medicare card, or passport) and extract the fields a user would want to store. If it isn't one of those three, set docType to "unknown" and still extract what you can.

Return dates in ISO format (YYYY-MM-DD).

Field guidance by document type:

drivers_licence:
  title: "Driver's Licence"
  fields (in this order, omit any missing):
    - "Licence number" (text)
    - "Full name" (text)
    - "Date of birth" (date)
    - "Address" (text)
    - "Class" (text)
    - "State" (text)
  expiryDate: the licence expiry

medicare_card:
  title: "Medicare Card"
  fields:
    - "Medicare number" (text)
    - "IRN" (text) — the individual reference number, 1 digit before the name
    - "Full name" (text)
  expiryDate: the "Valid to" date (may be MM/YYYY — convert to last day of that month)

passport:
  title: "Passport"
  fields:
    - "Passport number" (text)
    - "Full name" (text)
    - "Date of birth" (date)
    - "Nationality" (text)
    - "Place of birth" (text)
    - "Sex" (text)
  expiryDate: the passport expiry

For all types, do NOT include fields you can't read. Never invent data.

confidence: "high" if the image is clear and all core fields readable, "medium" if some are unclear, "low" if the image is poor or you had to guess.

notes: leave null unless there's genuinely useful context that doesn't fit in a field.`;

export async function scanDocument(
  imageBase64: string,
  mimeType: string
): Promise<ScanOutput> {
  const result = await generateObject({
    model: anthropic("claude-sonnet-4-5"),
    schema: scanSchema,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            image: imageBase64,
            mediaType: mimeType,
          },
          {
            type: "text",
            text: "Extract the document into the schema.",
          },
        ],
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
    docType: parsed.docType,
    title: parsed.title,
    fields,
    expiryDate: parsed.expiryDate,
    notes: parsed.notes,
    confidence: parsed.confidence,
  };
}
