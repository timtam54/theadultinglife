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
