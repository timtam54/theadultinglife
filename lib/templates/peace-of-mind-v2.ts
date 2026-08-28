// Peace of Mind Planner — section catalogue.
//
// Sections match the electronic Planner PDF (2026-08-27). Each is one of:
//   - "organiser" — shared with an Organiser folder; the Planner filters by
//     records.include_in_planner. Same data, two skins (option 2).
//   - "planner-only" — data lives only in the Planner (planner_wishes /
//     planner_letters / planner_apologies / planner_last_words / planner_cover
//     / planner_will_meta).

import type { CategoryId } from "@/lib/db/types";

export type PlannerSectionKind = "organiser" | "planner-only";

export interface PlannerSection {
  slug: string;
  title: string;
  hint?: string;
  kind: PlannerSectionKind;
  // For "organiser" sections — the Organiser folder to read from.
  organiserSubcategoryId?: string;
  organiserCategoryId?: CategoryId;
  // For "planner-only" sections — which editor to render.
  plannerEditor?:
    | "cover"
    | "personal-info"
    | "will-meta"
    | "wishes-general"
    | "wishes-spouse"
    | "wishes-children"
    | "wishes-relatives"
    | "wishes-friends"
    | "wishes-pets"
    | "wishes-other"
    | "letters"
    | "apologies"
    | "last-words";
  // Grouped in the PDF's table of contents under this heading.
  group: string;
}

export const PLANNER_SECTIONS: readonly PlannerSection[] = [
  // My Personal Information (single form, shared with the Organiser's TAL
  // General Information Form)
  {
    slug: "my-personal-information",
    title: "My Personal Information",
    hint: "Name, DOB, contact details, marital status, children, employment.",
    kind: "organiser",
    organiserSubcategoryId: "personal.general_information",
    organiserCategoryId: "personal",
    group: "My Personal Information",
  },

  // Important Consultants & Contacts
  {
    slug: "attorneys",
    title: "Attorney(s)",
    hint: "Your solicitor or legal representative — shared with the Organiser's Power of Attorney folder.",
    kind: "organiser",
    organiserSubcategoryId: "personal.power_of_attorney",
    organiserCategoryId: "personal",
    group: "Important Consultants & Contacts",
  },
  {
    slug: "accountants",
    title: "Accountant(s)",
    kind: "planner-only",
    plannerEditor: "letters",
    group: "Important Consultants & Contacts",
  },
  {
    slug: "doctors",
    title: "Doctors",
    hint: "GP and any specialists — shared with the Organiser's Medical Advisers folder.",
    kind: "organiser",
    organiserSubcategoryId: "health.medical_advisers",
    organiserCategoryId: "health",
    group: "Important Consultants & Contacts",
  },
  {
    slug: "family-members",
    title: "Family Members",
    hint: "Contact details for family — shared with the Organiser's Family Members folder.",
    kind: "organiser",
    organiserSubcategoryId: "personal.family_contacts",
    organiserCategoryId: "personal",
    group: "Important Consultants & Contacts",
  },
  {
    slug: "friends",
    title: "Friends",
    hint: "Shared with the Organiser's Friends folder.",
    kind: "organiser",
    organiserSubcategoryId: "personal.friends_contacts",
    organiserCategoryId: "personal",
    group: "Important Consultants & Contacts",
  },
  {
    slug: "others",
    title: "Others",
    hint: "Shared with the Organiser's Other Important Contacts folder.",
    kind: "organiser",
    organiserSubcategoryId: "personal.other_contacts",
    organiserCategoryId: "personal",
    group: "Important Consultants & Contacts",
  },

  // Device Access Details
  {
    slug: "device-access",
    title: "Device Access Details",
    hint: "Phones, tablets, computers — shared with the Organiser's Device Access folder.",
    kind: "organiser",
    organiserSubcategoryId: "personal.device_access",
    organiserCategoryId: "personal",
    group: "Device Access Details",
  },

  // Online & Social Media Access
  {
    slug: "online-access",
    title: "Online & Social Media Access Details",
    hint: "Email, social, other accounts — shared with the Organiser's Personal Accounts list.",
    kind: "organiser",
    organiserSubcategoryId: "personal.list_of_accounts",
    organiserCategoryId: "personal",
    group: "Online & Social Media Access",
  },

  // Important Documents
  {
    slug: "important-documents",
    title: "Important Documents",
    hint: "Shared with the Organiser's Important Documents Register.",
    kind: "organiser",
    organiserSubcategoryId: "personal.important_documents_register",
    organiserCategoryId: "personal",
    group: "Important Documents",
  },

  // Insurances
  {
    slug: "life-insurance",
    title: "Life Insurance",
    kind: "organiser",
    organiserSubcategoryId: "health.life_insurance",
    organiserCategoryId: "health",
    group: "Insurances",
  },
  {
    slug: "health-insurance",
    title: "Health Insurance",
    kind: "organiser",
    organiserSubcategoryId: "health.health_insurance",
    organiserCategoryId: "health",
    group: "Insurances",
  },
  {
    slug: "vehicle-insurance",
    title: "Vehicle Insurance",
    kind: "organiser",
    organiserSubcategoryId: "admin.vehicle_insurance",
    organiserCategoryId: "admin",
    group: "Insurances",
  },
  {
    slug: "other-insurance",
    title: "Other Insurance",
    hint: "Home and other business insurance.",
    kind: "organiser",
    organiserSubcategoryId: "admin.home_insurance",
    organiserCategoryId: "admin",
    group: "Insurances",
  },

  // Will
  {
    slug: "will",
    title: "Information Regarding My Will",
    hint: "Shared with the Organiser's Will & Funeral Instructions folder.",
    kind: "organiser",
    organiserSubcategoryId: "personal.will_funeral",
    organiserCategoryId: "personal",
    group: "Will",
  },

  // Financial Information
  {
    slug: "bank-accounts",
    title: "Bank Accounts / Credit Cards",
    kind: "organiser",
    organiserSubcategoryId: "admin.bank_accounts_advisers",
    organiserCategoryId: "admin",
    group: "Financial Information",
  },
  {
    slug: "investment-accounts",
    title: "Investment Accounts",
    kind: "organiser",
    organiserSubcategoryId: "admin.investments_deeds",
    organiserCategoryId: "admin",
    group: "Financial Information",
  },
  {
    slug: "superannuation",
    title: "Superannuation Retirement Accounts",
    kind: "organiser",
    organiserSubcategoryId: "admin.super_statements",
    organiserCategoryId: "admin",
    group: "Financial Information",
  },
  {
    slug: "open-loans",
    title: "Open Loans",
    kind: "organiser",
    organiserSubcategoryId: "admin.loan_statements",
    organiserCategoryId: "admin",
    group: "Financial Information",
  },
  {
    slug: "other-financial",
    title: "Other Financial Information",
    kind: "organiser",
    organiserSubcategoryId: "admin.budgets",
    organiserCategoryId: "admin",
    group: "Financial Information",
  },

  // Property Information
  {
    slug: "my-property",
    title: "My Property",
    kind: "organiser",
    organiserSubcategoryId: "personal.home_property_rates_rent",
    organiserCategoryId: "personal",
    group: "Property Information",
  },
  {
    slug: "vehicle-information",
    title: "Vehicle Information",
    kind: "organiser",
    organiserSubcategoryId: "personal.vehicle_details",
    organiserCategoryId: "personal",
    group: "Property Information",
  },

  // My End-of-Life Plan
  {
    slug: "wishes-general",
    title: "Wishes (general)",
    kind: "planner-only",
    plannerEditor: "wishes-general",
    group: "My End-of-Life Plan",
  },
  {
    slug: "wishes-spouse",
    title: "Wishes for my spouse / partner",
    kind: "planner-only",
    plannerEditor: "wishes-spouse",
    group: "My End-of-Life Plan",
  },
  {
    slug: "wishes-children",
    title: "Wishes for my children",
    kind: "planner-only",
    plannerEditor: "wishes-children",
    group: "My End-of-Life Plan",
  },
  {
    slug: "wishes-relatives",
    title: "Wishes for my relatives",
    kind: "planner-only",
    plannerEditor: "wishes-relatives",
    group: "My End-of-Life Plan",
  },
  {
    slug: "wishes-friends",
    title: "Wishes for my friends",
    kind: "planner-only",
    plannerEditor: "wishes-friends",
    group: "My End-of-Life Plan",
  },
  {
    slug: "wishes-pets",
    title: "Wishes for my pets",
    kind: "planner-only",
    plannerEditor: "wishes-pets",
    group: "My End-of-Life Plan",
  },
  {
    slug: "wishes-other",
    title: "Other requests",
    kind: "planner-only",
    plannerEditor: "wishes-other",
    group: "My End-of-Life Plan",
  },

  // Letters / Apologies / Last Words
  {
    slug: "letters",
    title: "Letters",
    kind: "planner-only",
    plannerEditor: "letters",
    group: "Letters",
  },
  {
    slug: "apologies",
    title: "Apologies",
    kind: "planner-only",
    plannerEditor: "apologies",
    group: "Apologies",
  },
  {
    slug: "last-words",
    title: "My Last Words",
    kind: "planner-only",
    plannerEditor: "last-words",
    group: "My Last Words",
  },
] as const;

const SLUG_TO_SECTION = new Map(
  PLANNER_SECTIONS.map((s) => [s.slug, s])
);

export function plannerSectionBySlug(slug: string): PlannerSection | null {
  return SLUG_TO_SECTION.get(slug) ?? null;
}

// Groups in display order, preserving the PDF's contents-page ordering.
export const PLANNER_GROUPS: readonly string[] = Array.from(
  new Set(PLANNER_SECTIONS.map((s) => s.group))
);

export function sectionsByGroup(): Map<string, PlannerSection[]> {
  const map = new Map<string, PlannerSection[]>();
  for (const s of PLANNER_SECTIONS) {
    const list = map.get(s.group) ?? [];
    list.push(s);
    map.set(s.group, list);
  }
  return map;
}
