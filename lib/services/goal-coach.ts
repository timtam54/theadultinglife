import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

/*
 * Goal coach for Life Goals & Plans: a short interview that asks what the
 * person wants and the questions Donna's template needs, then drafts the
 * whole page (vision, goals, action steps, check-in) for them to review.
 * Nothing here saves — the client applies an approved plan through the
 * normal life-goals endpoints.
 */

const text = z.string().nullable();
const date = z.string().nullable(); // YYYY-MM-DD

const planSchema = z.object({
  lifeVision: text,
  goingWell: text,
  needsChange: text,
  focusGoalTitle: text,
  goals: z.array(
    z.object({
      title: z.string(),
      lifeArea: text,
      why: text,
      successMeasure: text,
      targetDate: date,
      checkinDate: date,
      obstacles: text,
      supports: text,
      steps: z.array(
        z.object({
          action: z.string(),
          needs: text,
          dueDate: date,
        })
      ),
    })
  ),
});

const turnSchema = z.object({
  reply: z.string(),
  plan: planSchema.nullable(),
});

export type GoalCoachPlan = z.infer<typeof planSchema>;
export type GoalCoachTurn = z.infer<typeof turnSchema>;
export interface CoachMessage {
  role: "user" | "assistant";
  content: string;
}

function systemPrompt(today: string, existing: string): string {
  return `You are a warm, practical goal-setting coach inside "The Adulting Life", an Australian life-admin app. Use Australian English. Today is ${today}.

You are helping the user fill in their "Life Goals & Plans" page by asking questions in a friendly conversation. The page has:
- The life I want to build: what they'd like their life to look and feel like.
- Goals, each with: the goal itself (specific), life area (Health, Money, Work, Learning, Relationships, Home, Personal — or their own), why it matters to them, how they'll know they've achieved it, a target date, a next check-in date, 3–6 small action steps (what I will do, what I need / who can help, a due date for each), what might get in the way, and what will help them keep going.
- My focus for now: the one goal to start with.
- A moment to check in: what is going well, and what needs to change.

How to run the conversation:
- Ask ONE question at a time (two at most if they're closely linked). Keep each reply short — 1–3 sentences plus the question.
- Start with the life they want to build unless they jump straight to a goal; follow their lead.
- For each goal, gently make it specific and realistic, then cover why, how they'll know, target date, the steps, obstacles and supports. Suggest example steps if they're stuck, and let them accept or change them.
- Turn relative timeframes into real dates from today (e.g. "in six months" → a date six months from today). Every date you suggest or record must be after today: if a month or season has already passed this year, it means next year (Australian seasons: summer Dec–Feb, autumn Mar–May, winter Jun–Aug, spring Sep–Nov). Suggest a check-in date about a month from today unless they say otherwise.
- After a goal is covered, ask if there's another goal. When they're done, ask which goal they want to focus on first and the two check-in questions.
- Be encouraging, never preachy. No medical, legal or financial advice beyond general common sense; suggest a professional where it matters.

The "plan" field:
- Leave plan null while you are still asking questions.
- Fill plan only when the user has covered their goals and you've asked the focus and check-in questions, OR when they ask you to draft / finish / "that's all" — then fill it with everything gathered so far.
- Only record what the user actually said or agreed to. lifeVision comes from their answer about the life they want. why, successMeasure, obstacles, supports, goingWell and needsChange must be null unless the user told you them — never fill them with your own ideas. Action steps you suggested count only if the user accepted them; if they asked you to draft before discussing steps, you may include 2–3 simple starter steps, which they will review.
- When you fill plan, "reply" is one or two sentences saying the plan is ready to review below and nothing is saved until they choose to add it. Do not repeat the plan in the reply.
- Dates must be YYYY-MM-DD. focusGoalTitle must exactly match one goal's title, or be null.
- Write goal titles as short, clear statements ("Run a 5 km parkrun"), and steps as concrete actions ("Book a running shoe fitting").

${existing}`;
}

export async function coachTurn(input: {
  messages: CoachMessage[];
  today: string;
  existingSummary: string;
}): Promise<GoalCoachTurn> {
  const result = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: turnSchema,
    system: systemPrompt(input.today, input.existingSummary),
    messages: input.messages,
  });
  const { reply, plan } = result.object;
  return { reply, plan: plan ? tidyPlan(plan, input.today) : null };
}

const BLANK = new Set(["", "null", "none", "n/a", "na", "-", "—"]);
const clean = (v: string | null) =>
  v == null || BLANK.has(v.trim().toLowerCase()) ? null : v.trim();

/**
 * A valid YYYY-MM-DD on or after today, or null. Dates the model placed in
 * the past (usually "autumn" read as this year's) are moved on a year.
 */
function futureDate(v: string | null, today: string): string | null {
  const d = clean(v);
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d))) return null;
  const rest = d.slice(4);
  let y = Number(d.slice(0, 4));
  while (`${y}${rest}` < today && y < Number(today.slice(0, 4)) + 2) y += 1;
  const out = `${y}${rest}`;
  return out < today || Number.isNaN(Date.parse(out)) ? null : out;
}

function tidyPlan(plan: GoalCoachPlan, today: string): GoalCoachPlan {
  const goals = plan.goals
    .filter((g) => clean(g.title))
    .map((g) => ({
      title: g.title.trim(),
      lifeArea: clean(g.lifeArea),
      why: clean(g.why),
      successMeasure: clean(g.successMeasure),
      targetDate: futureDate(g.targetDate, today),
      checkinDate: futureDate(g.checkinDate, today),
      obstacles: clean(g.obstacles),
      supports: clean(g.supports),
      steps: g.steps
        .filter((s) => clean(s.action))
        .map((s) => ({
          action: s.action.trim(),
          needs: clean(s.needs),
          dueDate: futureDate(s.dueDate, today),
        })),
    }));
  const focus = clean(plan.focusGoalTitle);
  return {
    lifeVision: clean(plan.lifeVision),
    goingWell: clean(plan.goingWell),
    needsChange: clean(plan.needsChange),
    focusGoalTitle: focus && goals.some((g) => g.title === focus) ? focus : null,
    goals,
  };
}
