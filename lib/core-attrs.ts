import type { MirrorableUserAttr } from "@/lib/db/types";

// Core (user-profile) attributes a folder shows read-only above its form.
// These are values the folder relies on but deliberately does NOT store
// itself — e.g. a degree certificate carries the holder's name, but the
// name lives on the user, so the form has no name field. Editable copies
// of a core value are a different mechanism: page_questions.mirrors_user_attr.
export const CORE_ATTRS_BY_SUBCATEGORY: Record<string, MirrorableUserAttr[]> = {
  "education.tertiary_details": ["first_name", "last_name"],
};

export const CORE_ATTR_LABELS: Record<MirrorableUserAttr, string> = {
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  birthday: "Birthday",
  mobile_phone: "Mobile phone",
  home_phone: "Home phone",
  home_address: "Home address",
  mailing_address: "Mailing address",
  bank_bsb: "Bank BSB",
  bank_account_number: "Bank account number",
  super_fund: "Super fund",
  super_member_number: "Super member number",
};
