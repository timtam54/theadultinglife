/*
 * Interactive tour script.
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
    selector: '[data-tour="ask-tal-ai"]',
    title: "Meet TAL AI",
    body:
      "TAL = The Adulting Life. Anywhere in the app, tap this and ask anything — it walks you through every section, explains every field, and gives you plain-English answers.",
    placement: "bottom",
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
    href: "/records/personal/personal.emergency_contacts",
    selector: '[data-tour="user-picker"]',
    title: "Switch person here",
    body:
      "Inside any folder, use this pill to view or edit records for a different family member. Great for filling in the kids' details without leaving the page.",
    placement: "bottom",
  },
  {
    href: "/records/personal/personal.emergency_contacts",
    selector: '[data-tour="folder-notes"]',
    title: "Notes for this folder",
    body:
      "Free-text notes at the top of every folder. Jot down anything that doesn't fit a form field — reminders, quirks, phone numbers you keep forgetting.",
    placement: "bottom",
  },
  {
    href: "/records/personal/personal.emergency_contacts",
    selector: '[data-tour="folder-documents"]',
    title: "Documents live here",
    body:
      "Drop passports, licences, insurance PDFs, photos — anything. Every folder has its own document area, tied to the person you're viewing.",
    placement: "top",
  },
  {
    href: "/records/personal/personal.emergency_contacts",
    selector: '[data-tour="share-button"]',
    title: "Share, safely",
    body:
      "Every folder has this Share button. Pick one item (say your emergency contacts) and share it with as many people as you like — each one gets an email invite to open the Planner and view exactly what you shared, nothing else. Revoke any time.",
    placement: "left",
  },
  {
    href: "/settings",
    selector: '[data-tour="family-add"]',
    title: "Add family members",
    body:
      "Add partners, kids, parents — anyone whose life-admin you help manage. Each person gets their own column across every folder.",
    placement: "bottom",
  },
  {
    href: "/dashboard",
    selector: '[data-tour="sidebar-receipts"]',
    title: "Receipts — scan & digitise",
    body:
      "Snap a photo of any receipt. TAL AI reads it, turns it into a digital record, and captures the totals so your accountant has everything at tax time.",
    placement: "right",
  },
  {
    href: "/dashboard",
    selector: '[data-tour="sidebar-reminders"]',
    title: "Reminders & Tasks",
    body:
      "Expiries (passport, licence, insurance) show up as reminders automatically. Add your own tasks alongside them so nothing important slips.",
    placement: "right",
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
    href: "/settings",
    selector: '[data-tour="sidebar-settings"]',
    title: "Settings",
    body:
      "App PIN lock, download your data, delete your account, restart this tour — all in Settings. Come back any time.",
    placement: "right",
  },
];
