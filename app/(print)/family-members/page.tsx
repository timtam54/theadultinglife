import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { listUsersInFamilyGroup } from "@/lib/db/users";
import { loadPageFormByGroup } from "@/lib/services/pageForm";
import { formatQuestionValue } from "@/lib/services/format-question-value";
import { FamilyMembersPrintClient } from "./FamilyMembersPrintClient";

export const metadata: Metadata = {
  title: "Print · Family Members",
  robots: { index: false, follow: false },
};

// Renders every family member (or one, if ?userId=... is set) as a
// printable stack of "paper form" cards. Auto-fires window.print() so
// the user is straight into the Save-as-PDF dialog.
export default async function FamilyMembersPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const allUsers = await listUsersInFamilyGroup(session.user.familyGroupId);
  const users = params.userId
    ? allUsers.filter((u) => u.id === params.userId)
    : allUsers;

  // Load extras for every user in parallel. pom.personal has 13 fields.
  const extras = await Promise.all(
    users.map(async (u) => {
      const form = await loadPageFormByGroup(u.id, "pom.personal");
      return { userId: u.id, form };
    })
  );
  const extrasByUser = new Map(extras.map((e) => [e.userId, e.form]));

  // Pre-shape everything the client needs so the print component can
  // stay a small pure renderer.
  const members = users.map((u) => {
    const form = extrasByUser.get(u.id);
    const answers = form?.answers ?? {};
    const qById = new Map((form?.questions ?? []).map((q) => [q.id, q]));
    const extra = (id: string): string | null => {
      const raw = answers[id];
      if (typeof raw !== "string" || raw.trim().length === 0) return null;
      return formatQuestionValue(qById.get(id), raw);
    };
    return {
      id: u.id,
      displayName:
        [u.first_name, u.last_name].filter(Boolean).join(" ") ||
        u.email ||
        "Untitled",
      memberKind: u.member_kind,
      isPrimary: u.is_primary,
      birthday: u.birthday,
      email: u.email,
      mobilePhone: u.mobile_phone,
      homePhone: u.home_phone,
      homeAddress: cleanAddress(u.home_address),
      mailingAddress: cleanAddress(u.mailing_address),
      bankBsb: u.bank_bsb,
      bankAccountNumber: u.bank_account_number,
      superFund: u.super_fund,
      superMemberNumber: u.super_member_number,
      taxFileNumber: (u as unknown as { tax_file_number?: string | null })
        .tax_file_number,
      nicknames: extra("pom.personal.nicknames"),
      placeOfBirth: extra("pom.personal.pob"),
      motherName: extra("pom.personal.mother_name"),
      fatherName: extra("pom.personal.father_name"),
      maritalStatus: extra("pom.personal.status"),
      partnerName: extra("pom.personal.partner_name"),
      children: extra("pom.personal.children"),
      significantRel: extra("pom.personal.significant_rel"),
      employmentStatus: extra("pom.personal.employment_status"),
      employmentDetail: extra("pom.personal.employment_detail"),
    };
  });

  return <FamilyMembersPrintClient members={members} />;
}

function cleanAddress(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { address?: unknown };
    if (parsed && typeof parsed === "object" && typeof parsed.address === "string") {
      return parsed.address;
    }
  } catch {
    /* legacy plain string */
  }
  return raw;
}
