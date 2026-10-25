/*
 * Scan demos — which sample document in public/scan-demos shows off the
 * scan button in which folder. The "How does this work?" button beside a
 * folder's scan control plays a walkthrough with that sample and shows the
 * results the AI pulled from it. Nothing is uploaded or saved.
 *
 * Results are pre-generated (scripts/generate-scan-demos.ts →
 * public/scan-demos/demo-results.json) so the demo is instant and free.
 * Re-run the script after adding a sample or changing a folder's form.
 * The samples are copies of the ones in public/SampleDocs, which is
 * git-ignored — these need to ship with the app. Name each one
 * sample_<folder>.<ext>, the part of the folder id after the dot
 * (personal.drivers_licence → sample_drivers_licence.pdf).
 */

export type ScanDemoKind = "fields" | "list" | "meals";

export interface ScanDemo {
  /** Path under /public. */
  sample: string;
  kind: ScanDemoKind;
}

export const SCAN_DEMOS: Record<string, ScanDemo> = {
  "personal.birth_certificates": { sample: "/scan-demos/sample_birth_certificates.pdf", kind: "fields" },
  "personal.marriage_certificate": { sample: "/scan-demos/sample_marriage_certificate.pdf", kind: "fields" },
  "personal.power_of_attorney": { sample: "/scan-demos/sample_power_of_attorney.pdf", kind: "fields" },
  "personal.drivers_licence": { sample: "/scan-demos/sample_drivers_licence.pdf", kind: "fields" },
  "personal.vehicle_details": { sample: "/scan-demos/sample_vehicle_details.pdf", kind: "fields" },
  "personal.home_property_rates_rent": { sample: "/scan-demos/sample_home_property_rates_rent.pdf", kind: "fields" },
  "admin.rental_agreements": { sample: "/scan-demos/sample_rental_agreements.pdf", kind: "fields" },
  "education.achievement_certificates": { sample: "/scan-demos/sample_achievement_certificates.pdf", kind: "fields" },
  "education.tertiary_reports": { sample: "/scan-demos/sample_tertiary_details.pdf", kind: "fields" },
  "employment.employee_information_form": { sample: "/scan-demos/sample_employee_information_form.pdf", kind: "fields" },
  "employment.job_description": { sample: "/scan-demos/sample_job_description.pdf", kind: "fields" },
  "employment.resume": { sample: "/scan-demos/sample_resume.pdf", kind: "fields" },
  "employment.cover_letter": { sample: "/scan-demos/sample_cover_letter.pdf", kind: "fields" },
  "employment.employee_contracts": { sample: "/scan-demos/sample_employee_contracts.pdf", kind: "fields" },
  "employment.wages_summaries": { sample: "/scan-demos/sample_wages_summaries.pdf", kind: "fields" },
  "health.pension_cards": { sample: "/scan-demos/sample_pension_cards.png", kind: "fields" },
  "admin.annual_tax_report": { sample: "/scan-demos/sample_annual_tax_report.pdf", kind: "fields" },
  "admin.bank_accounts_advisers": { sample: "/scan-demos/sample_bank_accounts_advisers.pdf", kind: "fields" },
  "admin.bank_statements": { sample: "/scan-demos/sample_bank_statements.pdf", kind: "fields" },
  "admin.electricity_gas": { sample: "/scan-demos/sample_electricity_gas.pdf", kind: "fields" },
  "admin.electricity_gas_bills": { sample: "/scan-demos/sample_electricity_gas_bills.pdf", kind: "fields" },
  "admin.home_insurance": { sample: "/scan-demos/sample_home_insurance.pdf", kind: "fields" },
  "admin.investments_deeds": { sample: "/scan-demos/sample_investments_deeds.pdf", kind: "fields" },
  "admin.loan_statements": { sample: "/scan-demos/sample_loan_statements.pdf", kind: "fields" },
  "admin.property_records": { sample: "/scan-demos/sample_property_records.pdf", kind: "fields" },
  "admin.rates_water": { sample: "/scan-demos/sample_rates_water.pdf", kind: "fields" },
  "admin.super_statement_documents": { sample: "/scan-demos/sample_super_statement_documents.pdf", kind: "fields" },
  "admin.super_statements": { sample: "/scan-demos/sample_super_statements.pdf", kind: "fields" },
  "admin.tax_payment_plans": { sample: "/scan-demos/sample_tax_payment_plans.pdf", kind: "fields" },
  "admin.telephone_devices": { sample: "/scan-demos/sample_telephone_devices.pdf", kind: "fields" },
  "admin.telephone_devices_statements": { sample: "/scan-demos/sample_telephone_devices_statements.pdf", kind: "fields" },
  "admin.vehicle_insurance": { sample: "/scan-demos/sample_vehicle_insurance.pdf", kind: "fields" },
  "admin.warranties": { sample: "/scan-demos/sample_warranties.pdf", kind: "fields" },
  "education.course_storage": { sample: "/scan-demos/sample_course_storage.pdf", kind: "fields" },
  "education.courses_enrolment": { sample: "/scan-demos/sample_courses_enrolment.pdf", kind: "fields" },
  "education.other_courses_details": { sample: "/scan-demos/sample_other_courses_details.pdf", kind: "fields" },
  "education.primary_reports": { sample: "/scan-demos/sample_primary_details.pdf", kind: "fields" },
  "education.secondary_reports": { sample: "/scan-demos/sample_secondary_details.pdf", kind: "fields" },
  "education.study_plan": { sample: "/scan-demos/sample_study_plan.pdf", kind: "fields" },
  "employment.annual_payment_summary": { sample: "/scan-demos/sample_annual_payment_summary.pdf", kind: "fields" },
  "employment.correspondence": { sample: "/scan-demos/sample_correspondence.pdf", kind: "fields" },
  "employment.employment_reviews": { sample: "/scan-demos/sample_employment_reviews.pdf", kind: "fields" },
  "employment.letters_of_recommendation": { sample: "/scan-demos/sample_letters_of_recommendation.pdf", kind: "fields" },
  "employment.volunteering_certificates": { sample: "/scan-demos/sample_volunteering_certificates.pdf", kind: "fields" },
  "health.blood_tests": { sample: "/scan-demos/sample_blood_tests.pdf", kind: "fields" },
  "health.concession_cards": { sample: "/scan-demos/sample_concession_cards.pdf", kind: "fields" },
  "health.favourite_recipes": { sample: "/scan-demos/sample_favourite_recipes.pdf", kind: "fields" },
  "health.health_insurance": { sample: "/scan-demos/sample_health_insurance.pdf", kind: "fields" },
  "health.health_insurance_cards": { sample: "/scan-demos/sample_health_insurance_cards.pdf", kind: "fields" },
  "health.hospital_discharge": { sample: "/scan-demos/sample_hospital_discharge.pdf", kind: "fields" },
  "health.life_insurance": { sample: "/scan-demos/sample_life_insurance.pdf", kind: "fields" },
  "health.medical_advisers": { sample: "/scan-demos/sample_medical_advisers.pdf", kind: "fields" },
  "health.medical_bills": { sample: "/scan-demos/sample_medical_bills.pdf", kind: "fields" },
  "health.medical_reports": { sample: "/scan-demos/sample_medical_reports.pdf", kind: "fields" },
  "health.mind_set": { sample: "/scan-demos/sample_mind_set.pdf", kind: "fields" },
  "health.my_health_plan": { sample: "/scan-demos/sample_my_health_plan.pdf", kind: "fields" },
  "health.referrals": { sample: "/scan-demos/sample_referrals.pdf", kind: "fields" },
  "health.retirement_pension": { sample: "/scan-demos/sample_retirement_pension.pdf", kind: "fields" },
  "health.specialist_reports": { sample: "/scan-demos/sample_specialist_reports.pdf", kind: "fields" },
  "personal.abn": { sample: "/scan-demos/sample_abn.pdf", kind: "fields" },
  "personal.advanced_health_directive": { sample: "/scan-demos/sample_advanced_health_directive.pdf", kind: "fields" },
  "personal.electoral_roll": { sample: "/scan-demos/sample_electoral_roll.pdf", kind: "fields" },
  "personal.passport_travel": { sample: "/scan-demos/sample_passport_travel.pdf", kind: "fields" },
  "personal.will_funeral": { sample: "/scan-demos/sample_will_funeral.pdf", kind: "fields" },
  "health.medication_list": { sample: "/scan-demos/sample_medication_list.pdf", kind: "list" },
  "health.meal_planning": { sample: "/scan-demos/sample_meal_planning.pdf", kind: "meals" },
};

export const SCAN_DEMO_RESULTS_URL = "/scan-demos/demo-results.json";

/** Pre-generated results, keyed by subcategory id. */
export type ScanDemoResult =
  | {
      kind: "fields";
      /** fromProfile: the form fills this from the selected person's profile
       *  (name, date of birth, address…) before the scan, which then only
       *  fills the fields that are still empty. */
      fields: { label: string; value: string; fromProfile?: boolean }[];
    }
  | { kind: "list"; columns: string[]; rows: string[][] }
  | {
      kind: "meals";
      days: {
        label: string;
        breakfast: string | null;
        snack1: string | null;
        lunch: string | null;
        snack2: string | null;
        dinner: string | null;
      }[];
      notes: string | null;
    };
