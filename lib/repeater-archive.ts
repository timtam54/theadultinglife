// Per-subcategory "archive by date" configuration.
//
// When a subcategory appears in this map, RepeaterForm splits its instances
// into Current / Past groups based on whether the named date field's value
// is strictly in the past. Empty / future dates keep the instance in the
// Current group. Purely UI grouping — no state change to the stored data.
//
// Keep entries narrow. Only add a folder here when the domain really has a
// current-vs-past distinction worth surfacing (medications, prescriptions,
// jobs). Don't grow this into a general "hide old stuff" filter.

export interface RepeaterArchiveConfig {
  /** Question id whose value determines the group (must be a `date` type). */
  dateFieldId: string;
  /** Label used on the "Current" group heading. */
  currentLabel: string;
  /** Label used on the "Past" group heading. */
  pastLabel: string;
  /** When set, each entry gets an explicit Archive / Reactivate button
   *  that writes the dateFieldId to today (or clears it) and saves the
   *  entry. Omit to keep the date-only flow (user types the date). */
  actions?: {
    archiveLabel: string;
    reactivateLabel: string;
    archiveConfirm: string;
    reactivateConfirm: string;
  };
}

const CONFIG: Record<string, RepeaterArchiveConfig> = {
  "health.medication_list": {
    dateFieldId: "medication.end_date",
    currentLabel: "Current medications",
    pastLabel: "Past medications",
  },
  "health.my_health_plan": {
    dateFieldId: "my_health_plan.end_date",
    currentLabel: "Current plans",
    pastLabel: "Past plans",
    actions: {
      archiveLabel: "Archive plan",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Mark this plan as ended today? It will move to Past plans.",
      reactivateConfirm:
        "Clear the end date and move this plan back to Current plans?",
    },
  },
  "health.scripts": {
    dateFieldId: "scripts.date_completed",
    currentLabel: "Current scripts",
    pastLabel: "Past scripts",
    actions: {
      archiveLabel: "Archive script",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Mark this script as completed today? It will move to Past scripts.",
      reactivateConfirm:
        "Clear the completion date and move this script back to Current scripts?",
    },
  },
  "health.blood_tests": {
    dateFieldId: "blood_tests.date_archived",
    currentLabel: "Current results",
    pastLabel: "Past results",
    actions: {
      archiveLabel: "Archive result",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this blood test result? It will move to Past results.",
      reactivateConfirm:
        "Move this result back to Current results?",
    },
  },
  "health.referrals": {
    dateFieldId: "referrals.date_archived",
    currentLabel: "Current referrals",
    pastLabel: "Past referrals",
    actions: {
      archiveLabel: "Archive referral",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this referral? It will move to Past referrals.",
      reactivateConfirm:
        "Move this referral back to Current referrals?",
    },
  },
  "health.medical_reports": {
    dateFieldId: "medical_reports.date_archived",
    currentLabel: "Current reports",
    pastLabel: "Past reports",
    actions: {
      archiveLabel: "Archive report",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this medical report? It will move to Past reports.",
      reactivateConfirm:
        "Move this report back to Current reports?",
    },
  },
  "health.medical_bills": {
    dateFieldId: "medical_bills.date_archived",
    currentLabel: "Current bills",
    pastLabel: "Past bills",
    actions: {
      archiveLabel: "Archive bill",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this bill? It will move to Past bills.",
      reactivateConfirm:
        "Move this bill back to Current bills?",
    },
  },
};

export function getRepeaterArchive(
  subcategoryId: string
): RepeaterArchiveConfig | null {
  return CONFIG[subcategoryId] ?? null;
}

// Today formatted for a date input (yyyy-mm-dd, local time). Used by the
// Archive button to stamp the end-date field so the entry moves to Past.
export function todayAsDateInput(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// True when the given date string (yyyy-mm-dd or ISO) is strictly before
// today (local). Blank / invalid dates return false (treated as Current).
export function isDateInPast(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOnly = new Date(d);
  dayOnly.setHours(0, 0, 0, 0);
  return dayOnly.getTime() < today.getTime();
}
