// Slug ↔ subcategory-id map for the Peace of Mind Planner sections.
// Subcategory IDs bake in a Life Admin category prefix (personal./admin.)
// for historical reasons; URLs shouldn't leak that, hence the mapping.

export type PomSection = {
  slug: string;
  subcategoryId: string;
};

export const POM_SECTIONS: readonly PomSection[] = [
  { slug: "family-members", subcategoryId: "personal.family_contacts" },
  { slug: "friends", subcategoryId: "personal.friends_contacts" },
  { slug: "other-contacts", subcategoryId: "personal.other_contacts" },
  { slug: "device-access", subcategoryId: "personal.device_access" },
  {
    slug: "important-documents-register",
    subcategoryId: "personal.important_documents_register",
  },
  { slug: "end-of-life-wishes", subcategoryId: "personal.end_of_life_wishes" },
  { slug: "legacy-letters", subcategoryId: "personal.legacy_letters" },
  { slug: "accountants", subcategoryId: "admin.accountants" },
  { slug: "loans-register", subcategoryId: "admin.loans_register" },
] as const;

const SLUG_TO_ID = new Map(POM_SECTIONS.map((s) => [s.slug, s.subcategoryId]));
const ID_TO_SLUG = new Map(POM_SECTIONS.map((s) => [s.subcategoryId, s.slug]));

export function pomSubcategoryIdFromSlug(slug: string): string | null {
  return SLUG_TO_ID.get(slug) ?? null;
}

export function pomSlugFromSubcategoryId(id: string): string | null {
  return ID_TO_SLUG.get(id) ?? null;
}
