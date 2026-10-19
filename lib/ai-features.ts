import { FORM_COACHES } from "@/lib/form-coaches";

/*
 * Which folders offer AI help, for the AI column in the category matrix.
 *   plan — an AI coach that asks questions and drafts the folder for you
 *   scan — AI reads an uploaded document and fills the form
 * Scan support comes from the folder's form (any file field), worked out on
 * the server; the planning coaches are listed here.
 */

export interface FolderAi {
  plan: boolean;
  scan: boolean;
}

/** Folders with an AI coach: the form coaches plus the custom screens. */
export const AI_PLAN_FOLDERS = new Set<string>([
  ...Object.keys(FORM_COACHES),
  "health.life_goals_plans",
  "health.meal_planning",
]);

/** Folders whose form (and so its upload scan) is replaced by a custom
 *  screen with no AI scan of its own. */
export const NO_FORM_SCAN = new Set<string>(["health.life_goals_plans", "admin.budgets"]);
