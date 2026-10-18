import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import type { PageQuestionRow } from "@/lib/db/types";
import { describeToday } from "@/lib/budget";

/*
 * One turn of a folder form's AI coach (see lib/form-coaches.ts). Asks the
 * questions the form needs, then returns a full draft of answers keyed by
 * question id. Nothing is saved here — the form adds the draft as a new,
 * unsaved entry for the person to check.
 */

export interface CoachMessage {
  role: "user" | "assistant";
  content: string;
}

const NOT_FILLABLE_TYPES = new Set(["file", "image", "linked_entry", "heading", "info"]);

/** Questions the coach may fill: no uploads, and nothing that is workflow
 *  state (archived / ended / completed) rather than part of the plan. */
export function fillableQuestions(questions: PageQuestionRow[]): PageQuestionRow[] {
  return questions.filter(
    (q) =>
      !NOT_FILLABLE_TYPES.has(q.question_type) &&
      !/(_archived|\.date_archived|\.end_date|\.date_completed)$/.test(q.id) &&
      !/archived|completed|end date/i.test(q.label)
  );
}

function describe(q: PageQuestionRow): string {
  const opts = Array.isArray(q.options)
    ? ` — one of: ${q.options.map((o) => `"${o.value}" (${o.label})`).join(", ")}`
    : "";
  const fmt =
    q.question_type === "date"
      ? " — YYYY-MM-DD"
      : q.question_type === "number" || q.question_type === "int"
        ? " — a number only"
        : "";
  const hint = q.hint ? ` — hint: ${q.hint}` : "";
  return `- id "${q.id}": ${q.label} [${q.question_type}]${opts}${fmt}${hint}`;
}

const turnSchema = z.object({
  reply: z.string(),
  answers: z.array(z.object({ questionId: z.string(), value: z.string() })).nullable(),
});

export async function coachFormTurn(input: {
  folderName: string;
  guidance: string;
  questions: PageQuestionRow[];
  messages: CoachMessage[];
  today: string;
}): Promise<{ reply: string; answers: Record<string, string> | null }> {
  const fillable = fillableQuestions(input.questions);
  const system = `You are a warm, practical assistant inside "The Adulting Life", an Australian life-admin app. Use Australian English. Today is ${describeToday(input.today)}. Work out relative dates ("next Monday", "in two weeks") from this exact day.

You are helping the person fill in their "${input.folderName}" form through a friendly conversation.

${input.guidance}

How to run the conversation:
- Ask ONE question at a time (two at most if closely linked). Keep replies short — 1–3 sentences plus the question.
- Follow their lead and don't re-ask what they've already told you.

The form's fields:
${fillable.map(describe).join("\n")}

The "answers" field:
- Leave answers null while you are still asking questions.
- Fill answers when you have enough to draft the form, OR when they ask you to draft / finish / "that's all" — then fill everything you can from what they told you, plus the parts the briefing asks you to write.
- Use the field ids exactly. Dropdowns must use one of the listed values. Dates YYYY-MM-DD; numbers as plain digits.
- Never invent personal facts (names, phone numbers, addresses, conditions) they didn't give you — leave those fields out.
- Put a phone number or email they gave for someone into that person's contact field.
- Where a field asks who will do something and it's the person themselves, write "Me".
- When you fill answers, "reply" is one or two sentences saying the draft is ready to check below, and that nothing is saved until they add it to the form and press Save. Never list or summarise the draft in the reply — it is shown separately.`;

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: turnSchema,
    system,
    messages: input.messages,
  });

  if (!object.answers) return { reply: object.reply, answers: null };
  const byId = new Map(fillable.map((q) => [q.id, q]));
  const answers: Record<string, string> = {};
  for (const { questionId, value } of object.answers) {
    const q = byId.get(questionId);
    const v = value.trim();
    if (!q || !v || /^(null|none|n\/?a|-|—)$/i.test(v)) continue;
    if (q.question_type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(v)) continue;
    if ((q.question_type === "number" || q.question_type === "int") && !Number.isFinite(Number(v))) continue;
    if (Array.isArray(q.options) && !q.options.some((o) => o.value === v)) continue;
    answers[q.id] = v;
  }
  return { reply: object.reply, answers: Object.keys(answers).length ? answers : null };
}
