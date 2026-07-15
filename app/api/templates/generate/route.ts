import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { CATEGORY_IDS } from "@/lib/db/types";
import { apiError } from "@/lib/api-error";

const QuestionSchema = z.object({
  label: z.string().min(1).max(200),
  hint: z.string().max(500).nullable(),
  question_type: z.enum([
    "text",
    "textarea",
    "date",
    "int",
    "number",
    "dropdown",
    "image",
  ]),
  options: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .nullable(),
  required: z.boolean(),
  placeholder: z.string().max(200).nullable(),
});

const ResponseSchema = z.object({
  name: z.string().min(1).max(120),
  category_id: z.enum([
    "personal",
    "health",
    "education",
    "employment",
    "admin",
  ]),
  hint: z.string().max(500).nullable(),
  questions: z.array(QuestionSchema).min(1).max(50),
});

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const body = (await request.json().catch(() => ({}))) as {
      prompt?: string;
    };
    const prompt = (body.prompt ?? "").trim();
    if (!prompt) {
      return NextResponse.json({ error: "prompt_required" }, { status: 400 });
    }
    if (prompt.length > 500) {
      return NextResponse.json({ error: "prompt_too_long" }, { status: 400 });
    }

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: ResponseSchema,
      system: [
        "You are a form-design assistant for The Adulting Life, an Australian life-admin app.",
        `Given a short prompt naming a document type, produce a fillable form definition.`,
        "Categories are: personal, health, education, employment, admin. Pick the best fit.",
        `Question types available: text (short), textarea (long), date, int, number, dropdown, image (file upload).`,
        `For dropdowns, always provide 2+ options as {value, label} pairs.`,
        `Use Australian context (Medicare, ATO, TFN, Centrelink where relevant). Dates in Australian format.`,
        `Keep the question count practical (typically 5-15). Group related fields.`,
        `Use plain-English labels (e.g. "Date of birth", not "DOB").`,
        `Mark truly essential fields as required; leave optional ones as not required.`,
        `Include a hint on fields where clarification helps ("Include country code" etc).`,
        `Never invent fields for legal advice — only capture information the user would already know.`,
      ].join("\n"),
      prompt: `Design a fillable form for: "${prompt}"`,
    });

    // extra guard for dropdowns without options
    for (const q of object.questions) {
      if (q.question_type === "dropdown" && (!q.options || q.options.length < 2)) {
        q.question_type = "text";
        q.options = null;
      }
      if (q.question_type !== "dropdown") q.options = null;
    }

    return NextResponse.json(object);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!CATEGORY_IDS) {
      // reference kept so tree-shaker doesn't drop the import
    }
    return apiError("api:templates.generate.POST", e);
  }
}
