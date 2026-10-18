import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { describeToday } from "@/lib/budget";
import type { MealPlanScanResult } from "@/lib/services/meal-plan-scan";

/*
 * "Plan my week with AI" for the meal planner: asks who's eating, dietary
 * needs, budget and time, then plans meals that respect them. The result has
 * the same shape as a scanned meal plan, so the planner's existing review
 * screen places it on the grid. Nothing is saved here.
 */

export interface CoachMessage {
  role: "user" | "assistant";
  content: string;
}

export const RESTRICTIONS = [
  "grain-free",
  "gluten-free",
  "peanut-free",
  "nut-free",
  "vegetarian",
  "vegan",
  "dairy-free",
] as const;
type Restriction = (typeof RESTRICTIONS)[number];

const slot = z.string().nullable();
const turnSchema = z.object({
  reply: z.string(),
  plan: z
    .object({
      // Every household-wide restriction the person mentioned, so the plan
      // can be checked automatically.
      restrictions: z.array(z.enum(RESTRICTIONS)),
      days: z.array(
        z.object({
          label: z.string(),
          breakfast: slot,
          snack1: slot,
          lunch: slot,
          snack2: slot,
          dinner: slot,
        })
      ),
      notes: z.string().nullable(),
    })
    .nullable(),
});

function systemPrompt(today: string, favourites: string[]): string {
  return `You are a friendly, practical meal-planning assistant inside "The Adulting Life", an Australian life-admin app. Use Australian English and Australian foods, ingredients and supermarket terms. Today is ${describeToday(today)}.

You help the person plan meals for their week. Their planner has five slots per day: breakfast, snack1 (morning snack), lunch, snack2 (afternoon snack), dinner.

Ask, ONE question at a time (keep replies to 1–3 sentences plus the question):
- who's eating (adults, kids, ages if relevant);
- dietary needs and allergies — e.g. grain-free, gluten-free, vegetarian, dairy-free, nut allergy, low-FODMAP, diabetes-friendly;
- foods they love or won't eat;
- budget, and how much time they have to cook on weeknights vs weekends;
- which days and which slots they want planned (default: Monday to Sunday, all five slots), and whether they like leftovers or batch cooking.
Follow their lead; don't re-ask what they've told you. If they just say "plan it", plan with sensible defaults.

When you plan (the "plan" field):
- Leave plan null while still asking. Fill it when you have enough, or when they ask you to plan / draft now.
- One entry per day in order, label = the weekday ("Monday"…). Only include the slots they want; use null for the rest.
- Strictly respect every dietary need and allergy in every meal, snack and shopping-list item — never include an excluded ingredient, including hidden ones. Check each item against these before you answer:
  · Grain-free: no wheat, rice (incl. rice cakes, rice noodles), oats (incl. muesli, granola, muesli bars), corn (incl. corn/taco shells, tortillas, corn chips, polenta, popcorn), barley, rye, spelt, quinoa, millet, bread, pasta, couscous, cereal, regular flour or crackers. Use alternatives such as lettuce cups, cauliflower rice, zucchini noodles, almond or coconut flour.
  · Gluten-free: no wheat, barley, rye, spelt, regular oats, bread, pasta, couscous, or soy sauce unless "gluten-free".
  · Nut / peanut allergy: no nuts of the kind they named, peanut butter, satay, or nut-containing bars, pesto or muesli; say "check labels" for packaged foods.
  · Vegetarian: no meat or seafood; vegan: also no eggs, dairy or honey; dairy-free: no milk, cheese, yoghurt, butter or cream.
- If a need applies to only one person, make the shared meal suit everyone where you easily can, or put the swap for that person in brackets in the meal, e.g. "Beef tacos (lettuce cups for me)".
- Make it realistic for their time and budget: quick weeknight dinners, a bigger cook on the weekend, kid-friendly options when there are kids, and variety across the week.
- Leftovers (if they like them): a leftover lunch is always the PREVIOUS day's dinner, named as such ("Leftover roast chicken & veg"); never leftover breakfast. The first day's lunch is a fresh lunch.
- Keep each meal short and clear (e.g. "Chicken & veggie stir-fry with cauliflower rice").
- notes: a shopping list grouped by aisle (Fruit & veg, Meat & seafood, Dairy & eggs, Pantry, Freezer) that only includes ingredients used in the plan, then 2–3 prep tips. Plain text with line breaks — no markdown, asterisks or bold.
- restrictions: list every dietary need or allergy that applies to the WHOLE household's food (if it applies to only one person and you've added bracketed swaps, leave it out of this list).
- When you fill plan, "reply" is one or two sentences saying the plan is ready to check below, that nothing is saved until they add it to the planner, and to check labels for allergens. Never list the plan in the reply.
- General healthy eating only — no medical nutrition therapy; suggest a dietitian or GP for medical diets.
${favourites.length ? `\nMeals this person has planned before (good to reuse favourites):\n${favourites.map((f) => `- ${f}`).join("\n")}` : ""}`;
}

const BLANK = new Set(["", "null", "none", "n/a", "na", "-", "—"]);
const clean = (v: string | null) => (v == null || BLANK.has(v.trim().toLowerCase()) ? null : v.trim());

/*
 * Backstop for dietary rules: words that break each restriction, with the
 * common safe alternatives allowed through. The model is asked to follow the
 * rules; this catches what it misses, triggers one repair, and anything left
 * becomes a warning on the review screen.
 */
const SAFE = /\b(cauliflower rice|broccoli rice|zucchini (noodles|spaghetti|pasta)|zoodles|almond (flour|milk|meal)|coconut (flour|milk|yoghurt|yogurt|cream)|lettuce (wraps?|cups?)|oat milk|soy milk|nut-free|peanut-free|dairy-free|vegan cheese|gluten-free (bread|pasta|wraps?|soy sauce)|tamari)\b/gi;
const BANNED: Record<Restriction, RegExp> = {
  "grain-free":
    /\b(rice( cakes?| noodles?)?|oats?|oatmeal|porridge|muesli|granola|corn|popcorn|polenta|tortillas?|taco shells?|corn chips|wheat|barley|rye|spelt|quinoa|millet|bread|toast|sandwich(es)?|wraps?|pasta|spaghetti|noodles?|couscous|cereal|crackers?|flour|pizza( base)?|bagels?|muffins?|crumpets?|buns?)\b/i,
  "gluten-free":
    /\b(wheat|barley|rye|spelt|couscous|bread|toast|sandwich(es)?|wraps?|pasta|spaghetti|noodles?|crackers?|flour|pizza( base)?|bagels?|muffins?|crumpets?|buns?|soy sauce|muesli|granola|porridge|oats?)\b/i,
  "peanut-free": /\b(peanuts?|peanut butter|satay|mixed nuts|trail mix|nut bars?|nut butter)\b/i,
  "nut-free":
    /\b(nuts?|peanuts?|almonds?|cashews?|walnuts?|pecans?|hazelnuts?|pistachios?|macadamias?|satay|pesto|nut butter|trail mix|marzipan|nutella)\b/i,
  vegetarian:
    /\b(chicken|beef|pork|lamb|veal|fish|salmon|tuna|prawns?|shrimp|bacon|ham|mince|sausages?|steak|turkey|seafood|anchov(y|ies))\b/i,
  vegan:
    /\b(chicken|beef|pork|lamb|fish|salmon|tuna|prawns?|bacon|ham|mince|sausages?|steak|eggs?|cheese|feta|milk|yoghurt|yogurt|butter|cream|honey)\b/i,
  "dairy-free": /\b(cheese|feta|parmesan|milk|yoghurt|yogurt|butter|cream|custard|ice cream)\b/i,
};

export function violations(plan: z.infer<typeof turnSchema>["plan"]): string[] {
  if (!plan || plan.restrictions.length === 0) return [];
  const items: { text: string; swap: boolean }[] = [];
  for (const d of plan.days) {
    for (const v of [d.breakfast, d.snack1, d.lunch, d.snack2, d.dinner]) {
      // A bracketed swap for one person ("… (lettuce cups for me)") marks a
      // deliberately mixed meal — fine for diets, but allergens are still
      // checked, since the food is in the house.
      if (v) items.push({ text: v, swap: /\(.*\bfor\b.*\)/i.test(v) });
    }
  }
  // Shopping list lines, before the prep tips.
  for (const line of (plan.notes ?? "").split(/\n/)) {
    if (/prep tips?/i.test(line)) break;
    items.push(...line.replace(/^[^:]*:/, "").split(/[,;]/).map((t) => ({ text: t, swap: false })));
  }
  const ALLERGIES = new Set<Restriction>(["peanut-free", "nut-free"]);
  const found = new Set<string>();
  for (const { text: raw, swap } of items) {
    const text = raw.replace(SAFE, " ").trim();
    for (const r of plan.restrictions) {
      if (swap && !ALLERGIES.has(r)) continue;
      const m = text.match(BANNED[r]);
      if (m) found.add(`"${raw.trim()}" may not be ${r} (${m[0]})`);
    }
  }
  return [...found];
}

export async function mealCoachTurn(input: {
  messages: CoachMessage[];
  today: string;
  favourites: string[];
}): Promise<{ reply: string; plan: MealPlanScanResult | null }> {
  const system = systemPrompt(input.today, input.favourites);
  // A stronger model than the app's default: plans must follow dietary and
  // allergy rules reliably.
  const model = openai("gpt-4o");
  let { object } = await generateObject({ model, schema: turnSchema, system, messages: input.messages });
  let problems = violations(object.plan);
  if (object.plan && problems.length) {
    // One repair pass: hand back exactly what broke the rules.
    const repaired = await generateObject({
      model,
      schema: turnSchema,
      system,
      messages: [
        ...input.messages,
        { role: "assistant", content: JSON.stringify(object) },
        {
          role: "user",
          content: `Some items break the dietary rules:\n${problems.join("\n")}\nReplace only those items (in the meals and the shopping list) with safe alternatives and return the full plan again.`,
        },
      ],
    });
    if (repaired.object.plan) {
      object = { reply: object.reply, plan: repaired.object.plan };
      problems = violations(object.plan);
    }
  }
  if (!object.plan) return { reply: object.reply, plan: null };
  const days = object.plan.days
    .map((d) => ({
      label: clean(d.label) ?? "",
      date: null,
      breakfast: clean(d.breakfast),
      snack1: clean(d.snack1),
      lunch: clean(d.lunch),
      snack2: clean(d.snack2),
      dinner: clean(d.dinner),
    }))
    .filter((d) => d.breakfast || d.snack1 || d.lunch || d.snack2 || d.dinner)
    .map((d, i) => ({ ...d, label: d.label || `Day ${i + 1}` }));
  return {
    reply: object.reply,
    plan: days.length
      ? {
          days,
          notes: clean(object.plan.notes),
          // Anything the automatic check still doubts is flagged for review.
          warnings: problems.map((p) => `Check: ${p}`),
        }
      : null,
  };
}
