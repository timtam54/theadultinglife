/*
 * Safeguard for the AI coaches (form coach, goal coach, meal coach). A
 * message that suggests suicide or self-harm gets a fixed, human-reviewed
 * response with Australian crisis lines, and the coach stops — this doesn't
 * rely on the model noticing.
 */

const CRISIS_PATTERNS: RegExp[] = [
  /\bsuicid/i,
  /\bkill(ing)? myself\b/i,
  /\bend (it all|my life|my own life)\b/i,
  /\btake my (own )?life\b/i,
  /\b(want|wanted|wanting) to die\b/i,
  /\bdon'?t want to (be here|live|be alive|wake up)\b(?! (at|in|on|for|with)\b)/i,
  /\bbetter off (without me|dead|if i (was|were) gone)\b/i,
  /\bself[- ]?harm/i,
  /\b(hurt(ing)?|cut(ting)?|harm(ing)?) myself\b/i,
  /\bno (reason|point) (to|in) (live|living|going on)\b/i,
  /\bcan'?t (go on|keep going)(\s+(any ?more|like this)\b|\s*[.!]*\s*$)/i,
];

export const CRISIS_REPLY =
  "I'm really sorry you're feeling this way, and I'm glad you said something — you don't have to go through this alone.\n\n" +
  "If you're in danger right now, call 000.\n" +
  "You can talk to someone any time, day or night:\n" +
  "• Lifeline — 13 11 14 (or text 0477 13 11 14)\n" +
  "• Beyond Blue — 1300 22 4636\n" +
  "• Kids Helpline (ages 5–25) — 1800 55 1800\n\n" +
  "Your GP can help too. I'm going to pause the planning here — please reach out to one of them now.";

/** True if the person's latest message suggests suicide or self-harm. */
export function needsCrisisResponse(messages: { role: string; content: string }[]): boolean {
  const last = [...messages].reverse().find((m) => m.role === "user");
  return !!last && CRISIS_PATTERNS.some((p) => p.test(last.content));
}
