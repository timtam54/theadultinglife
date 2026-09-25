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
  "health.meal_planning": {
    dateFieldId: "meal_planning.date_archived",
    currentLabel: "Current plans",
    pastLabel: "Past plans",
    actions: {
      archiveLabel: "Archive plan",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this meal plan? It will move to Past plans.",
      reactivateConfirm:
        "Move this plan back to Current plans?",
    },
  },
  "health.favourite_recipes": {
    dateFieldId: "favourite_recipes.date_archived",
    currentLabel: "Current recipes",
    pastLabel: "Past recipes",
    actions: {
      archiveLabel: "Archive recipe",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this recipe? It will move to Past recipes.",
      reactivateConfirm:
        "Move this recipe back to Current recipes?",
    },
  },
  "health.life_goals_plans": {
    dateFieldId: "life_goals_plans.date_archived",
    currentLabel: "Current goals",
    pastLabel: "Past goals",
    actions: {
      archiveLabel: "Archive goal",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this goal? It will move to Past goals.",
      reactivateConfirm:
        "Move this goal back to Current goals?",
    },
  },
  "health.mind_set": {
    dateFieldId: "mindset.date_archived",
    currentLabel: "Current plans",
    pastLabel: "Past plans",
    actions: {
      archiveLabel: "Archive plan",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this mindset plan? It will move to Past plans.",
      reactivateConfirm:
        "Move this plan back to Current plans?",
    },
  },
  "health.retirement_pension": {
    dateFieldId: "retirement_pension.date_archived",
    currentLabel: "Current plans",
    pastLabel: "Past plans",
    actions: {
      archiveLabel: "Archive plan",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this plan? It will move to Past plans.",
      reactivateConfirm:
        "Move this plan back to Current plans?",
    },
  },
  "education.study_plan": {
    dateFieldId: "study_plan.date_archived",
    currentLabel: "Current plans",
    pastLabel: "Past plans",
    actions: {
      archiveLabel: "Archive plan",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this study plan? It will move to Past plans.",
      reactivateConfirm:
        "Move this plan back to Current plans?",
    },
  },
  "education.achievement_certificates": {
    dateFieldId: "achievement_certificates.date_archived",
    currentLabel: "Current certificates",
    pastLabel: "Past certificates",
    actions: {
      archiveLabel: "Archive certificate",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this certificate? It will move to Past certificates.",
      reactivateConfirm:
        "Move this certificate back to Current certificates?",
    },
  },
  "education.other_courses_details": {
    dateFieldId: "other_education.date_archived",
    currentLabel: "Current courses",
    pastLabel: "Past courses",
    actions: {
      archiveLabel: "Archive course",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this course? It will move to Past courses.",
      reactivateConfirm:
        "Move this course back to Current courses?",
    },
  },
  "education.course_storage": {
    dateFieldId: "course_storage.date_archived",
    currentLabel: "Current items",
    pastLabel: "Past items",
    actions: {
      archiveLabel: "Archive item",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this item? It will move to Past items.",
      reactivateConfirm:
        "Move this item back to Current items?",
    },
  },
  "employment.employee_information_form": {
    dateFieldId: "employee_information.end_date",
    currentLabel: "Current employment",
    pastLabel: "Past employment",
    actions: {
      archiveLabel: "Mark as ended",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Mark this job as ending today? It will move to Past employment.",
      reactivateConfirm:
        "Clear the end date and move this job back to Current employment?",
    },
  },
  "employment.cover_letter": {
    dateFieldId: "cover_letter.date_archived",
    currentLabel: "Current letters",
    pastLabel: "Past letters",
    actions: {
      archiveLabel: "Archive letter",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this cover letter? It will move to Past letters.",
      reactivateConfirm:
        "Move this letter back to Current letters?",
    },
  },
  "employment.resume": {
    dateFieldId: "resume.date_archived",
    currentLabel: "Current resumes",
    pastLabel: "Past resumes",
    actions: {
      archiveLabel: "Archive resume",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this resume? It will move to Past resumes.",
      reactivateConfirm:
        "Move this resume back to Current resumes?",
    },
  },
  "employment.letters_of_recommendation": {
    dateFieldId: "letters_of_recommendation.date_archived",
    currentLabel: "Current letters",
    pastLabel: "Past letters",
    actions: {
      archiveLabel: "Archive letter",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this letter? It will move to Past letters.",
      reactivateConfirm:
        "Move this letter back to Current letters?",
    },
  },
  "employment.volunteering_certificates": {
    dateFieldId: "volunteering_certificates.date_archived",
    currentLabel: "Current certificates",
    pastLabel: "Past certificates",
    actions: {
      archiveLabel: "Archive certificate",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this certificate? It will move to Past certificates.",
      reactivateConfirm:
        "Move this certificate back to Current certificates?",
    },
  },
  "employment.employee_contracts": {
    dateFieldId: "employee_contracts.date_archived",
    currentLabel: "Current contracts",
    pastLabel: "Past contracts",
    actions: {
      archiveLabel: "Archive contract",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this contract? It will move to Past contracts.",
      reactivateConfirm:
        "Move this contract back to Current contracts?",
    },
  },
  "employment.job_description": {
    dateFieldId: "job_description.date_archived",
    currentLabel: "Current job descriptions",
    pastLabel: "Past job descriptions",
    actions: {
      archiveLabel: "Archive JD",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this job description? It will move to Past job descriptions.",
      reactivateConfirm:
        "Move this job description back to Current job descriptions?",
    },
  },
  "employment.employment_reviews": {
    dateFieldId: "employment_reviews.date_archived",
    currentLabel: "Current reviews",
    pastLabel: "Past reviews",
    actions: {
      archiveLabel: "Archive review",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this review? It will move to Past reviews.",
      reactivateConfirm:
        "Move this review back to Current reviews?",
    },
  },
  "employment.correspondence": {
    dateFieldId: "correspondence.date_archived",
    currentLabel: "Current correspondence",
    pastLabel: "Past correspondence",
    actions: {
      archiveLabel: "Archive item",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this item? It will move to Past correspondence.",
      reactivateConfirm:
        "Move this item back to Current correspondence?",
    },
  },
  "employment.wages_summaries": {
    dateFieldId: "wages_summaries.date_archived",
    currentLabel: "Current summaries",
    pastLabel: "Past summaries",
    actions: {
      archiveLabel: "Archive summary",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this summary? It will move to Past summaries.",
      reactivateConfirm:
        "Move this summary back to Current summaries?",
    },
  },
  "employment.annual_payment_summary": {
    dateFieldId: "annual_payment_summary.date_archived",
    currentLabel: "Current summaries",
    pastLabel: "Past summaries",
    actions: {
      archiveLabel: "Archive summary",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this summary? It will move to Past summaries.",
      reactivateConfirm:
        "Move this summary back to Current summaries?",
    },
  },
  "admin.budgets": {
    dateFieldId: "budgets.date_archived",
    currentLabel: "Current budgets",
    pastLabel: "Past budgets",
    actions: {
      archiveLabel: "Archive budget",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this budget? It will move to Past budgets.",
      reactivateConfirm:
        "Move this budget back to Current budgets?",
    },
  },
  "admin.investments_deeds": {
    dateFieldId: "investments_deeds.date_archived",
    currentLabel: "Current investments",
    pastLabel: "Past investments",
    actions: {
      archiveLabel: "Archive investment",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this investment? It will move to Past investments.",
      reactivateConfirm:
        "Move this investment back to Current investments?",
    },
  },
  "admin.super_statements": {
    dateFieldId: "pom.super.end_date",
    currentLabel: "Current funds",
    pastLabel: "Past funds",
    actions: {
      archiveLabel: "Mark as ended",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Mark this fund as ended today? It will move to Past funds.",
      reactivateConfirm:
        "Clear the end date and move this fund back to Current funds?",
    },
  },
  "admin.property_records": {
    dateFieldId: "pom.property.sale_date",
    currentLabel: "Current properties",
    pastLabel: "Past properties",
    actions: {
      archiveLabel: "Mark as sold",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Mark this property as sold today? It will move to Past properties.",
      reactivateConfirm:
        "Clear the sale date and move this property back to Current properties?",
    },
  },
  "admin.annual_tax_report": {
    dateFieldId: "annual_tax_report.date_archived",
    currentLabel: "Current returns",
    pastLabel: "Past returns",
    actions: {
      archiveLabel: "Archive return",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this return? It will move to Past returns.",
      reactivateConfirm:
        "Move this return back to Current returns?",
    },
  },
  "admin.tax_payment_plans": {
    dateFieldId: "tax_payment_plans.date_archived",
    currentLabel: "Current plans",
    pastLabel: "Past plans",
    actions: {
      archiveLabel: "Archive plan",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this plan? It will move to Past plans.",
      reactivateConfirm:
        "Move this plan back to Current plans?",
    },
  },
  "admin.electricity_gas_bills": {
    dateFieldId: "electricity_gas_bills.paid_date",
    currentLabel: "Current bills",
    pastLabel: "Past bills",
    actions: {
      archiveLabel: "Mark as paid",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Mark this bill as paid today? It will move to Past bills.",
      reactivateConfirm:
        "Clear the paid date and move this bill back to Current bills?",
    },
  },
  "admin.rates_water": {
    dateFieldId: "admin_rates_water_documents.paid_date",
    currentLabel: "Current bills",
    pastLabel: "Past bills",
    actions: {
      archiveLabel: "Mark as paid",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Mark this bill as paid today? It will move to Past bills.",
      reactivateConfirm:
        "Clear the paid date and move this bill back to Current bills?",
    },
  },
  "admin.rental_agreements": {
    dateFieldId: "admin_rental_agreements.moved_out",
    currentLabel: "Current agreements",
    pastLabel: "Past agreements",
    actions: {
      archiveLabel: "Mark as moved out",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Set the move-out date to today? It will move to Past agreements.",
      reactivateConfirm:
        "Clear the move-out date and move this agreement back to Current?",
    },
  },
  "personal.advanced_health_directive": {
    dateFieldId: "personal_advanced_health_directive.date_archived",
    currentLabel: "Current directives",
    pastLabel: "Past directives",
    actions: {
      archiveLabel: "Archive",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this directive? It will move to Past directives.",
      reactivateConfirm:
        "Clear the archive date and move this directive back to Current?",
    },
  },
  "personal.licences_ids": {
    dateFieldId: "personal_licences_ids.date_archived",
    currentLabel: "Current cards",
    pastLabel: "Past cards",
    actions: {
      archiveLabel: "Archive",
      reactivateLabel: "Reactivate",
      archiveConfirm:
        "Archive this card? It will move to Past cards.",
      reactivateConfirm:
        "Clear the archive date and move this card back to Current?",
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
