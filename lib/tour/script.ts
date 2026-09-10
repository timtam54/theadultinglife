/*
 * 8-step interactive tour script.
 *
 * Each step: pick a real UI element via a stable data-tour attribute, tell
 * the engine which route to be on before the step runs, and write a short
 * callout title + body. Placement is a hint (top/bottom/left/right/center)
 * — the engine falls back to whichever side has room if the hint doesn't
 * fit.
 *
 * Kept as data (not JSX) so it's easy to reorder, edit copy, or add/remove
 * steps without touching the engine.
 */

export interface TourStep {
  /** Route the user should be on for this step. TourEngine router.push()es
   *  first if the current path doesn't match. Omit for "wherever the user
   *  currently is". */
  href?: string;
  /** CSS selector for the element to highlight. Prefer `[data-tour="…"]`
   *  attributes over class names — they're stable across restyles.
   *  Omit for a centered callout with no highlight. */
  selector?: string;
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
}

export const TOUR_SCRIPT: readonly TourStep[] = [
  {
    href: "/dashboard",
    selector: '[data-tour="sidebar-dashboard"]',
    title: "Your Dashboard",
    body:
      "Your home screen. What's expiring soon, tasks to do, and how much of your Organiser you've completed — all at a glance.",
    placement: "right",
  },
  {
    href: "/dashboard",
    selector: '[data-tour="sidebar-setup-guide"]',
    title: "Setup Guide",
    body:
      "The step-by-step walkthrough. Everything you type here saves straight into your Organiser folders — no double entry. You can come back any time.",
    placement: "right",
  },
  {
    href: "/dashboard",
    selector: '[data-tour="sidebar-organiser"]',
    title: "The Organiser",
    body:
      "The heart of the app. Every folder — Personal, Health, Employment, Admin — with a column for every family member.",
    placement: "right",
  },
  {
    href: "/records/personal?view=matrix",
    selector: '[data-tour="matrix-container"]',
    title: "One row per folder, one column per person",
    body:
      "Green tick means done, amber half means started, red cross means empty, dash means not applicable. Tap any cell to open the folder for that person.",
    placement: "top",
  },
  {
    href: "/records/personal?view=matrix",
    selector: '[data-tour="user-picker"]',
    title: "Switch person here",
    body:
      "Once you're inside a folder, use this to view or edit records for a different family member. Great for filling in the kids' details.",
    placement: "bottom",
  },
  {
    href: "/templates/peace-of-mind-planner",
    selector: '[data-tour="planner-index"]',
    title: "Peace of Mind Planner",
    body:
      "Different from the Organiser. This is for the things that matter most — letters, wishes, funeral plans, last words. Ready if your family ever needs them.",
    placement: "top",
  },
  {
    // No route change — keep the user on the matrix page. Callout is
    // centered (no selector) so we don't depend on the folder page having
    // loaded a specific share button. Copy explains where the Share button
    // shows up in practice.
    title: "Sharing",
    body:
      "Every folder has a Share button in its top-right corner. Grant access to specific items, per person. Revoke any time. Nothing is ever shared unless you deliberately share it.",
    placement: "center",
  },
  {
    href: "/dashboard",
    selector: '[data-tour="ask-tal-ai"]',
    title: "Ask TAL AI",
    body:
      "TAL = The Adulting Life. Anywhere in the app, tap this and ask anything — it walks you through every section, explains every field.",
    placement: "bottom",
  },
];
