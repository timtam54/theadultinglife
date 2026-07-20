/*
 * "You're missing X" nudges for the dashboard.
 *
 * Three sources, ranked by urgency:
 *   1. Records that could carry an expiry date but don't (highest — user
 *      already told us this matters by adding the record, one field away
 *      from unlocking a reminder).
 *   2. High-priority folders that are still completely empty.
 *   3. Form-driven folders (per_user scope) that the user has started
 *      but not finished.
 *
 * Returns at most 5 nudges. Order is: expiry-missing > empty-critical >
 * started-incomplete. Card auto-hides when the array is empty.
 */

import { listUserRecords } from "@/lib/services/records";
import { folderProgressForCategory } from "@/lib/services/folder-completion";
import { CATEGORY_IDS, type CategoryId } from "@/lib/db/types";

export type NudgeKind =
  | "missing_expiry"
  | "empty_critical_folder"
  | "started_incomplete";

export interface Nudge {
  id: string;
  kind: NudgeKind;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
}

// Subcategories we treat as "essential" — if empty, we nudge.
// Ordered by importance; the first ones in this list win the top slots.
const CRITICAL_FOLDERS: {
  id: string;
  categoryId: CategoryId;
  label: string;
}[] = [
  { id: "personal.emergency_contacts", categoryId: "personal", label: "Emergency contacts" },
  { id: "personal.licences_ids",       categoryId: "personal", label: "Driver's licence & IDs" },
  { id: "personal.passport_travel",    categoryId: "personal", label: "Passport" },
  { id: "personal.tax_file_number",    categoryId: "personal", label: "Tax File Number" },
  { id: "health.health_insurance_cards", categoryId: "health", label: "Medicare & health card" },
  { id: "health.medical_advisers",     categoryId: "health",   label: "Doctors & medical advisers" },
  { id: "health.medication_list",      categoryId: "health",   label: "Current medications" },
];

// Subcategories a record naturally has an expiry date for. Used to make
// the "missing expiry" nudge speak in a natural voice.
const SUBCATEGORY_LABELS: Record<string, string> = {
  "personal.passport_travel": "Passport",
  "personal.licences_ids": "Driver's licence",
  "personal.vehicle_details": "Car registration",
  "personal.marriage_certificate": "Marriage certificate",
  "admin.vehicle_insurance": "Vehicle insurance",
  "admin.home_insurance": "Home insurance",
  "health.health_insurance": "Health insurance",
  "health.life_insurance": "Life insurance",
  "admin.rental_agreements": "Rental agreement",
  "admin.warranties": "Warranty",
};

const MAX_NUDGES = 5;

export async function loadDashboardNudges(
  userId: string,
  familyGroupId: string
): Promise<Nudge[]> {
  const [records, categoryProgress] = await Promise.all([
    listUserRecords(userId),
    Promise.all(
      CATEGORY_IDS.map((c) =>
        folderProgressForCategory(familyGroupId, c).then((m) => ({ c, m }))
      )
    ),
  ]);

  const nudges: Nudge[] = [];

  // ── 1. Records missing an expiry date on a subcategory that usually has one
  for (const r of records) {
    if (r.expiry_date) continue;
    if (!r.subcategory_id) continue;
    const label = SUBCATEGORY_LABELS[r.subcategory_id];
    if (!label) continue;
    nudges.push({
      id: `missing_expiry:${r.id}`,
      kind: "missing_expiry",
      title: `Add an expiry to ${r.title}`,
      description: `You've saved this ${label.toLowerCase()} but no expiry date — add one so we can remind you.`,
      actionLabel: "Add date",
      href: `/records/${r.category_id}/r/${r.id}`,
    });
  }

  // ── 2. Critical folders that are still empty
  // Use family progress: if 0 folders count as "started" or "completed" for
  // the critical id, treat as empty.
  const progressBySubId = new Map<string, { started: number; completed: number; total: number }>();
  for (const { m } of categoryProgress) {
    for (const [subId, p] of m) {
      progressBySubId.set(subId, {
        started: p.startedCount,
        completed: p.completedCount,
        total:
          p.scope === "user_list" ||
          p.scope === "family_list" ||
          p.scope === "per_user_list"
            ? p.instanceCount
            : p.targetCount,
      });
    }
  }

  for (const f of CRITICAL_FOLDERS) {
    const p = progressBySubId.get(f.id);
    if (!p) continue;
    // "Empty" = nothing started AND nothing completed
    if (p.started === 0 && p.completed === 0) {
      nudges.push({
        id: `empty:${f.id}`,
        kind: "empty_critical_folder",
        title: `Add your ${f.label.toLowerCase()}`,
        description: "This is one of the essentials — a great next step.",
        actionLabel: "Add now",
        href: `/records/${f.categoryId}/${f.id}`,
      });
    }
  }

  // ── 3. Folders started but not complete (form-driven)
  // Only surface up to 3 of these so they don't drown the list.
  const startedIncomplete: Nudge[] = [];
  for (const { c, m } of categoryProgress) {
    for (const [subId, p] of m) {
      // We only nudge on per_user (form) scopes — they have a clear "finish this form" action.
      if (p.scope !== "per_user") continue;
      if (p.startedCount === 0) continue;
      if (p.completedCount >= p.targetCount) continue;
      // Don't dupe if already added as a critical-empty nudge (won't be, but
      // safe) or a missing-expiry.
      startedIncomplete.push({
        id: `started:${subId}`,
        kind: "started_incomplete",
        title: `Finish filling in ${prettyName(subId)}`,
        description: "You've started this — a few more fields and it's done.",
        actionLabel: "Continue",
        href: `/records/${c}/${subId}`,
      });
    }
  }
  nudges.push(...startedIncomplete.slice(0, 3));

  // Dedupe by id (shouldn't collide, but belt-and-braces)
  const seen = new Set<string>();
  const deduped: Nudge[] = [];
  for (const n of nudges) {
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    deduped.push(n);
    if (deduped.length >= MAX_NUDGES) break;
  }
  return deduped;
}

function prettyName(subcategoryId: string): string {
  // Best-effort: "personal.tax_file_number" → "tax file number"
  const tail = subcategoryId.split(".").slice(1).join(".");
  return tail.replace(/_/g, " ") || subcategoryId;
}
