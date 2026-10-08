import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import type { PageQuestionRow } from "@/lib/db/types";

const extractSchema = z.object({
  answers: z.array(
    z.object({
      question_id: z.string(),
      value: z.string(),
    })
  ),
  confidence: z.enum(["high", "medium", "low"]),
});

export interface ExtractResult {
  answers: Record<string, string>;
  confidence: "high" | "medium" | "low";
}

function questionSummary(q: PageQuestionRow): string {
  const opts =
    q.question_type === "dropdown" && q.options
      ? ` (allowed: ${q.options.map((o) => `${o.value}=${o.label}`).join(", ")})`
      : "";
  return `- ${q.id} | ${q.label} | type=${q.question_type}${opts}${q.hint ? ` | hint: ${q.hint}` : ""}`;
}

export async function extractPageFormAnswers(
  group: string,
  questions: PageQuestionRow[],
  imageBase64: string,
  mimeType: string
): Promise<ExtractResult> {
  const fillable = questions.filter((q) => q.question_type !== "image");
  const list = fillable.map(questionSummary).join("\n");

  const system = `You extract structured data from a scan or photo of an identity/administrative document, for an Australian life-admin app.

You will be given a list of questions on a "${group}" form. Each question has:
  question_id | label | type | (allowed values if dropdown) | (hint)

For each question you can confidently answer from the image, return one entry in answers with { question_id, value }.

Rules:
- Never invent data. Skip questions you can't read.
- Dates must be ISO YYYY-MM-DD. If the source shows MM/YYYY, use the last day of that month.
- Numbers must be plain digits, no formatting.
- Dropdown values must exactly match one of the allowed values (case-sensitive).
- For text fields, transcribe faithfully; do not paraphrase.
- confidence: "high" if image is clear and most fields readable, "medium" if some are unclear, "low" if image is poor.

The form's questions are:
${list}`;

  const result = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: extractSchema,
    system,
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
            text: "Extract as many fields as you can confidently read.",
          },
        ],
      },
    ],
  });

  const validIds = new Set(fillable.map((q) => q.id));
  const answers: Record<string, string> = {};
  for (const a of result.object.answers) {
    if (validIds.has(a.question_id) && a.value.trim() !== "") {
      answers[a.question_id] = a.value;
    }
  }

  return { answers, confidence: result.object.confidence };
}

// ---------- List import (repeater forms) ----------

const NON_EXTRACTABLE_TYPES = new Set([
  "image",
  "file",
  "linked_entry",
  "transactions_json",
]);

const MAX_LIST_ENTRIES = 50;

const extractListSchema = z.object({
  entries: z.array(
    z.object({
      answers: z.array(
        z.object({
          question_id: z.string(),
          value: z.string(),
        })
      ),
    })
  ),
  confidence: z.enum(["high", "medium", "low"]),
});

export interface ExtractListResult {
  entries: Record<string, string>[];
  confidence: "high" | "medium" | "low";
}

// Reads a document that lists several items (e.g. a pharmacy medication list)
// and returns one set of answers per item, for a repeater form to turn into
// separate entries.
export async function extractPageFormEntries(
  group: string,
  questions: PageQuestionRow[],
  fileBase64: string,
  mimeType: string
): Promise<ExtractListResult> {
  const fillable = questions.filter(
    (q) => !NON_EXTRACTABLE_TYPES.has(q.question_type)
  );
  const list = fillable.map(questionSummary).join("\n");

  const system = `You extract structured data from a scan, photo or PDF that lists several items (for example a medication list, a list of accounts or a list of contacts), for an Australian life-admin app.

Each item in the document becomes one entry on a "${group}" form. Each question on the form has:
  question_id | label | type | (allowed values if dropdown) | (hint)

Return one element in entries per item (usually one per table row), in the order they appear. For each question you can confidently answer for that item, include { question_id, value } in its answers.

Rules:
- Never invent data. Skip questions you can't read for an item.
- One entry per item. Do not merge items and do not create entries for headers, totals or footnotes.
- Details printed once for the whole document (e.g. the pharmacy or prescriber in the header) apply to every entry that has a matching question and no value of its own.
- If the document marks items as ceased / past / finished, still include them, and fill any end/finish date question if a date is given.
- Combine columns when one question clearly covers them (e.g. strength and dose both belong in a "dosage" question).
- Dates must be ISO YYYY-MM-DD. If the source shows MM/YYYY, use the first day of that month for start dates and the last day for end/expiry dates.
- Numbers must be plain digits, no formatting.
- Dropdown values must exactly match one of the allowed values (case-sensitive).
- For text fields, transcribe faithfully; do not paraphrase.
- confidence: "high" if the document is clear and most fields readable, "medium" if some are unclear, "low" if it is poor.

The form's questions are:
${list}`;

  const filePart =
    mimeType === "application/pdf"
      ? {
          type: "file" as const,
          data: fileBase64,
          mediaType: "application/pdf",
          filename: "document.pdf",
        }
      : {
          type: "image" as const,
          image: fileBase64,
          mediaType: mimeType,
        };

  const result = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: extractListSchema,
    system,
    messages: [
      {
        role: "user",
        content: [
          filePart,
          {
            type: "text",
            text: "Extract every item in this document as a separate entry.",
          },
        ],
      },
    ],
  });

  const validIds = new Set(fillable.map((q) => q.id));
  const entries: Record<string, string>[] = [];
  for (const e of result.object.entries.slice(0, MAX_LIST_ENTRIES)) {
    const answers: Record<string, string> = {};
    for (const a of e.answers) {
      if (validIds.has(a.question_id) && a.value.trim() !== "") {
        answers[a.question_id] = a.value;
      }
    }
    if (Object.keys(answers).length > 0) entries.push(answers);
  }

  return { entries, confidence: result.object.confidence };
}
