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
 * git-ignored — these need to ship with the app.
 */

export type ScanDemoKind = "fields" | "list" | "meals";

export interface ScanDemo {
  /** Path under /public. */
  sample: string;
  kind: ScanDemoKind;
}

export const SCAN_DEMOS: Record<string, ScanDemo> = {
  "personal.birth_certificates": { sample: "/scan-demos/sample_birth_certificate.pdf", kind: "fields" },
  "personal.marriage_certificate": { sample: "/scan-demos/specimen-marriage-certificate.pdf", kind: "fields" },
  "personal.power_of_attorney": { sample: "/scan-demos/Sample_General_Power_of_Attorney.pdf", kind: "fields" },
  "personal.drivers_licence": { sample: "/scan-demos/sample_licence_specimen.pdf", kind: "fields" },
  "personal.vehicle_details": { sample: "/scan-demos/sample_vehicle_registration.pdf", kind: "fields" },
  "personal.home_property_rates_rent": { sample: "/scan-demos/Sample_Rental_Agreement.pdf", kind: "fields" },
  "admin.rental_agreements": { sample: "/scan-demos/Sample_Rental_Agreement.pdf", kind: "fields" },
  "education.achievement_certificates": { sample: "/scan-demos/Achievement_Certificates_Sample.pdf", kind: "fields" },
  "education.tertiary_details": { sample: "/scan-demos/sample_tertiary_certificate.pdf", kind: "fields" },
  "employment.employee_information_form": { sample: "/scan-demos/Employee_Information_Form_Sample.pdf", kind: "fields" },
  "employment.job_description": { sample: "/scan-demos/Sample_Job_Description_Senior_FullStack_Developer.pdf", kind: "fields" },
  "employment.resume": { sample: "/scan-demos/Sample_Resume_Jordan_Mitchell.pdf", kind: "fields" },
  "employment.cover_letter": { sample: "/scan-demos/sample_cover_letter.pdf", kind: "fields" },
  "employment.employee_contracts": { sample: "/scan-demos/sample_employment_contract.pdf", kind: "fields" },
  "employment.wages_summaries": { sample: "/scan-demos/sample_wage_summary.pdf", kind: "fields" },
  "health.pension_cards": { sample: "/scan-demos/pension.png", kind: "fields" },
  "health.medication_list": { sample: "/scan-demos/sample_medication_list.pdf", kind: "list" },
  "health.meal_planning": { sample: "/scan-demos/Grainfree_Meal_Plan.pdf", kind: "meals" },
};

export const SCAN_DEMO_RESULTS_URL = "/scan-demos/demo-results.json";

/** Pre-generated results, keyed by subcategory id. */
export type ScanDemoResult =
  | { kind: "fields"; fields: { label: string; value: string }[] }
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
