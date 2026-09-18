/*
 * Peace of Mind Planner walkthrough — a 5-step focused tour that fires
 * the first time a user visits /templates/peace-of-mind-planner.
 *
 * Framing: this is about the user's OWN Planner (things they compose for
 * their family). We deliberately don't lead with the "shared with you"
 * receiving-side flow — that has its own violet banner on the index page
 * and doesn't need a tour to explain.
 *
 * Each step points at real UI via data-tour attributes. Placement is a
 * hint; the engine falls back if there isn't room.
 */

import type { TourStep } from "@/lib/tour/script";

export const PLANNER_TOUR_SCRIPT: readonly TourStep[] = [
  {
    href: "/templates/peace-of-mind-planner",
    title: "Welcome to your Peace of Mind Planner",
    body:
      "This is different from the Organiser. It's the personal things — letters, wishes, funeral plans — that only matter if your family ever needs them. Everything here is private by default. Only you can see it unless you deliberately share.",
    placement: "center",
  },
  {
    href: "/templates/peace-of-mind-planner",
    selector: '[data-tour="planner-section-letters"]',
    title: "Stuck? Start with Letters",
    body:
      "A letter to a partner, child or parent. Doesn't need to be long — one or two sentences is enough to make an enormous difference to the person reading it later.",
    placement: "top",
  },
  {
    href: "/templates/peace-of-mind-planner/letters",
    selector: '[data-tour="planner-privacy-banner"]',
    title: "Private until you share",
    body:
      "Nothing you write here is visible to anyone else — not even other family members in your account — until you press Share on that specific item. No accidental exposure.",
    placement: "bottom",
  },
  {
    href: "/templates/peace-of-mind-planner/letters",
    selector: '[data-tour="planner-share-hint"]',
    title: "Share with the people who need it",
    body:
      "When you're ready, share each item with the specific person — your executor, spouse, or a trusted friend. They get an email invite, sign in, and see only what you shared. Revoke any time from Settings → What you've shared.",
    placement: "top",
  },
  {
    href: "/templates/peace-of-mind-planner",
    selector: '[data-tour="planner-shared-sections"]',
    title: "Some sections come from your Organiser",
    body:
      "Sections marked with ↔ pull straight from your Organiser folders (Will, Bank Accounts, Super, etc.). Edit in either place — the data is the same. No double entry.",
    placement: "top",
  },
];
