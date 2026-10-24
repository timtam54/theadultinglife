import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { READER_RULES, isBlankish } from "@/lib/services/ai-reader-rules";

/*
 * Reads a photo or PDF of a meal plan (printed template, handwritten list,
 * screenshot) into days × meal slots for the meal planner grid. The user
 * reviews the result before anything is saved.
 */

const slot = z.string().nullable();

const scanSchema = z.object({
  days: z.array(
    z.object({
      // The day as written on the plan: "Monday", "Day 3", "Tue 14 Oct".
      label: z.string(),
      // ISO date only when the plan shows an actual date for this day.
      date: z.string().nullable(),
      breakfast: slot,
      snack1: slot,
      lunch: slot,
      snack2: slot,
      dinner: slot,
    })
  ),
  notes: z.string().nullable(),
  warnings: z.array(z.string()),
});

export type MealPlanScanResult = z.infer<typeof scanSchema>;

const SYSTEM_PROMPT = `You read a photo or PDF of a household meal plan for an Australian family organiser app and turn it into structured data.

The app's planner has five slots per day: breakfast, snack1 (morning snack), lunch, snack2 (afternoon snack), dinner.

Rules:
${READER_RULES}
- One entry in "days" per day on the plan, in the order they appear. Skip days that have no meals at all.
- label: the day as written ("Monday", "Day 3", "Tue 14 Oct"). If unlabelled, use "Day 1", "Day 2", …
- date: ISO YYYY-MM-DD only if that specific day's own row or column shows its calendar date (interpret Australian DD/MM dates). Otherwise null. Never work a date out from a heading such as "week of 13/10" or from a weekday name.
- Copy each meal as written, tidied into plain sentence case (e.g. "Spaghetti bolognese"). Keep it short — no recipes or quantities unless they are the meal name.
- Map each item to the closest slot: "morning tea" → snack1, "afternoon tea" → snack2, "tea"/"supper"/"evening meal" → dinner. A single unlabelled "snack" goes in snack1.
- If a slot is blank or unreadable, use null. Never guess a meal.
- notes: any shopping list, prep notes or general notes on the plan, as plain text; null if none.
- warnings: short plain-English notes (≤ 120 chars each) about anything the user should check — blurry areas, crossed-out items, more than seven days, meals you couldn't place in a slot. Empty array if none.`;

export async function scanMealPlan(
  data: string,
  mimeType: string
): Promise<MealPlanScanResult> {
  const prompt = "Read this meal plan into the schema.";
  const result = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: scanSchema,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          mimeType === "application/pdf"
            ? { type: "file", data, mediaType: mimeType, filename: "meal-plan.pdf" }
            : { type: "file", data, mediaType: mimeType },
          { type: "text", text: prompt },
        ],
      },
    ],
  });
  return tidy(result.object);
}

// The model sometimes writes the word "null" (or "-", "n/a") for an empty
// cell rather than a real null, and may hand back a malformed date.
const clean = (v: string | null) => (isBlankish(v) ? null : v!.trim());

function tidy(scan: MealPlanScanResult): MealPlanScanResult {
  const days = scan.days
    .map((d) => {
      const date = clean(d.date);
      return {
        label: clean(d.label) ?? "",
        date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
        breakfast: clean(d.breakfast),
        snack1: clean(d.snack1),
        lunch: clean(d.lunch),
        snack2: clean(d.snack2),
        dinner: clean(d.dinner),
      };
    })
    .filter((d) => d.breakfast || d.snack1 || d.lunch || d.snack2 || d.dinner)
    .map((d, i) => ({ ...d, label: d.label || `Day ${i + 1}` }));
  // Only trust dates when every day has one and none contradicts its weekday
  // label — the model sometimes copies a "week of …" heading onto day one.
  const datesTrusted = days.every((d) => {
    if (!d.date) return false;
    const wd = WEEKDAYS.indexOf(d.label.slice(0, 3).toLowerCase());
    return wd < 0 || new Date(`${d.date}T00:00:00Z`).getUTCDay() === wd;
  });
  return {
    days: datesTrusted ? days : days.map((d) => ({ ...d, date: null })),
    notes: clean(scan.notes),
    warnings: scan.warnings,
  };
}

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
