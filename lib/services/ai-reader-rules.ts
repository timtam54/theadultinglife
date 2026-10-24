// The rules every AI reader in the app follows — document Scan, form and
// list import, receipts, meal plans, budgets and the daily routine — so they
// all behave the same way. Each reader adds its own rules after these.

export const READER_RULES = `- Only use what is actually printed or written on the document. Never invent, guess or infer names, places, numbers, dates or items, and never calculate a value the document doesn't state unless a rule below says to.
- If something is missing, unclear or unreadable, leave it empty (null, or leave it out). Never write a placeholder such as "N/A", "none", "unknown", "-" or 0.
- Dates on the document are Australian (day first): 03/04/2026 is 3 April 2026. Return dates as ISO YYYY-MM-DD unless a rule below says otherwise.
- Copy names and wording faithfully — tidy spacing and capitals only; don't paraphrase or correct spelling.
- For multi-page PDFs, read every page.`;

/** Values a reader sometimes writes for "nothing" instead of leaving it empty. */
const BLANKISH = /^(n\/?a|na|null|none|nil|unknown|not (stated|provided|applicable|given)|-+|—)$/i;

export function isBlankish(value: string | null | undefined): boolean {
  return value == null || value.trim() === "" || BLANKISH.test(value.trim());
}
