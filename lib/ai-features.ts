import { FORM_COACHES } from "@/lib/form-coaches";

/*
 * Folders with AI help — an AI coach that asks questions and drafts or plans
 * the folder with you — for the AI column in the category matrix. (Document
 * scanning isn't counted: it reads what's uploaded rather than helping you
 * create it.)
 */
export const AI_HELP_FOLDERS = new Set<string>([
  ...Object.keys(FORM_COACHES),
  "health.life_goals_plans",
  "health.meal_planning",
]);
