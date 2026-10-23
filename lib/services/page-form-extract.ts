import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import type { PageQuestionRow } from "@/lib/db/types";

// AI readers that fill a page form from a document, answering the form's
// own questions by id (not free labels that then have to be matched up).
//   extractPageFormAnswers — one document → one set of answers (the
//     document field upload and "Read with AI").
//   extractPageFormEntries — one document listing several items → one set
//     of answers per item ("Upload or scan a list").
// Both share the same safeguards: workflow fields (archived / completed /
// end date) are never offered to the AI, and blank-ish values ("N/A",
// "null", "unknown") are dropped.

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

const NON_EXTRACTABLE_TYPES = new Set(["image", "file", "linked_entry", "transactions_json"]);

/** Fields that record what the person did with an entry (archived it,
 *  finished it), not something printed in the document. */
export function isWorkflowQuestion(q: Pick<PageQuestionRow, "id" | "label">): boolean {
  const label = q.label.toLowerCase();
  return (
    /(_archived|\.date_archived|\.end_date|\.date_completed|\.end)$/.test(q.id) ||
    label.includes("archived") ||
    label.includes("completed") ||
    label.includes("end date")
  );
}

function extractable(questions: PageQuestionRow[]): PageQuestionRow[] {
  return questions.filter((q) => !NON_EXTRACTABLE_TYPES.has(q.question_type) && !isWorkflowQuestion(q));
}

const BLANKISH = /^(n\/?a|null|none|nil|unknown|not (stated|provided|applicable|given)|-+|—)$/i;
function keep(value: string): boolean {
  const v = value.trim();
  return v !== "" && !BLANKISH.test(v);
}

function questionSummary(q: PageQuestionRow): string {
  const opts =
    q.question_type === "dropdown" && q.options
      ? ` (allowed: ${q.options.map((o) => `${o.value}=${o.label}`).join(", ")})`
      : "";
  return `- ${q.id} | ${q.label} | type=${q.question_type}${opts}${q.hint ? ` | hint: ${q.hint}` : ""}`;
}

function filePart(base64: string, mimeType: string) {
  return mimeType === "application/pdf"
    ? { type: "file" as const, data: base64, mediaType: "application/pdf", filename: "document.pdf" }
    : { type: "image" as const, image: base64, mediaType: mimeType };
}

const COMMON_RULES = `- Never invent data. Only answer a question when its value is actually printed in the document; otherwise leave it out. Never guess, infer, calculate or make up names, places, numbers or dates.
- Never answer with placeholders such as "N/A", "none", "unknown" or 0 for something the document doesn't state — leave the question out instead.
- Only put an organisation in a business / company / firm question when that organisation IS the subject (e.g. the attorney is a law firm or trustee company). Never use an organisation that is merely mentioned elsewhere in the document. A person who is family or a friend has no business name.
- Dates must be ISO YYYY-MM-DD.
- Numbers must be plain digits, no formatting.
- Dropdown values must exactly match one of the allowed values (case-sensitive).
- For text fields, transcribe faithfully; do not paraphrase. Long free text (the body of a letter, report or directive) goes in a notes / summary / description question if the form has one.`;

export async function extractPageFormAnswers(
  group: string,
  questions: PageQuestionRow[],
  fileBase64: string,
  mimeType: string,
  /** The folder's name (e.g. "Advanced Health Directive"). */
  folderName?: string
): Promise<ExtractResult> {
  const fillable = extractable(questions);
  const list = fillable.map(questionSummary).join("\n");

  const system = `You extract structured data from a scan, photo or PDF of a personal or life-admin document, for an Australian app.

The document was uploaded to ${folderName ? `the "${folderName}" folder` : `a "${group}" form`}. You will be given the form's questions. Each question has:
  question_id | label | type | (allowed values if dropdown) | (hint)

For each question you can confidently answer from the document, return one entry in answers with { question_id, value }.

Rules:
${COMMON_RULES}
- If the source shows only a month and year, use the last day of that month for expiry / end dates and the first day otherwise.
- For multi-page PDFs, consider every page.
- confidence: "high" if the document is clear and most fields readable, "medium" if some are unclear, "low" if it is poor.

The form's questions are:
${list}`;

  const result = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: extractSchema,
    system,
    messages: [
      {
        role: "user",
        content: [filePart(fileBase64, mimeType), { type: "text", text: "Fill in every question you can confidently read." }],
      },
    ],
  });

  const validIds = new Set(fillable.map((q) => q.id));
  const answers: Record<string, string> = {};
  for (const a of result.object.answers) {
    if (validIds.has(a.question_id) && keep(a.value)) answers[a.question_id] = a.value.trim();
  }
  return { answers, confidence: result.object.confidence };
}

// ---------- List import (repeater forms) ----------

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
  mimeType: string,
  /** The folder's name (e.g. "Advanced Health Directive"), so the AI knows
   *  what one entry is. */
  folderName?: string
): Promise<ExtractListResult> {
  const fillable = extractable(questions);
  const list = fillable.map(questionSummary).join("\n");

  const system = `You extract structured data from a scan, photo or PDF that lists several items (for example a medication list, a list of accounts or a list of contacts), for an Australian life-admin app.

Each item in the document becomes one entry on ${folderName ? `the "${folderName}" form (one entry = one ${folderName.replace(/s$/, "")} record)` : `a "${group}" form`}. Each question on the form has:
  question_id | label | type | (allowed values if dropdown) | (hint)

Return one element in entries per item (usually one per table row), in the order they appear. For each question you can confidently answer for that item, include { question_id, value } in its answers.

Rules:
- An item is a separate thing the form keeps one record of (a medication, an account, a person). Paragraphs, clauses, sections or statements WITHIN one document are NOT separate items — they belong together in one entry.
- If the file is a single document of the kind this form holds (e.g. one directive, one certificate, one contract, one policy, one résumé, one report), return exactly ONE entry for it.
- One entry per item. Do not merge items and do not create entries for headers, totals or footnotes.
- Details printed once for the whole document (e.g. the pharmacy or prescriber in the header) apply to every entry that has a matching question and no value of its own.
${COMMON_RULES}
- If the source shows MM/YYYY, use the first day of that month for start dates and the last day for end/expiry dates.
- Combine columns when one question clearly covers them (e.g. strength and dose both belong in a "dosage" question).
- confidence: "high" if the document is clear and most fields readable, "medium" if some are unclear, "low" if it is poor.

The form's questions are:
${list}`;

  const result = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: extractListSchema,
    system,
    messages: [
      {
        role: "user",
        content: [filePart(fileBase64, mimeType), { type: "text", text: "Extract every item in this document as a separate entry." }],
      },
    ],
  });

  const validIds = new Set(fillable.map((q) => q.id));
  const entries: Record<string, string>[] = [];
  for (const e of result.object.entries.slice(0, MAX_LIST_ENTRIES)) {
    const answers: Record<string, string> = {};
    for (const a of e.answers) {
      if (validIds.has(a.question_id) && keep(a.value)) answers[a.question_id] = a.value.trim();
    }
    if (Object.keys(answers).length > 0) entries.push(answers);
  }

  return { entries, confidence: result.object.confidence };
}
