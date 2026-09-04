import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { loadPageFormByGroup } from "@/lib/services/pageForm";
import { isUserInFamilyGroup, listUsersInFamilyGroup } from "@/lib/db/users";
import { BirthCertificatePrintView } from "./BirthCertificatePrintView";

export default async function BirthCertificatePrintPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const session = await requireSession();
  const { user: userParam } = await searchParams;

  let targetUserId = session.user.id;
  if (userParam && userParam !== session.user.id) {
    const ok = await isUserInFamilyGroup(userParam, session.user.familyGroupId);
    if (!ok) notFound();
    targetUserId = userParam;
  }

  const [{ questions, answers }, familyUsers] = await Promise.all([
    loadPageFormByGroup(targetUserId, "personal_birth_certificates"),
    listUsersInFamilyGroup(session.user.familyGroupId),
  ]);
  if (questions.length === 0) notFound();

  // The print view was authored against short "bc.*" answer keys, but the DB
  // stores them under the full "personal_birth_certificates.*" question ids.
  // Remap here rather than touching every field ref in the view.
  const viewAnswers: Record<string, string | null> = {};
  for (const [k, val] of Object.entries(answers)) {
    viewAnswers[k.replace(/^personal_birth_certificates\./, "bc.")] = val;
  }

  const targetUser = familyUsers.find((u) => u.id === targetUserId);
  const targetUserName =
    [targetUser?.first_name, targetUser?.last_name].filter(Boolean).join(" ") ||
    targetUser?.name ||
    targetUser?.email ||
    "";

  return (
    <BirthCertificatePrintView answers={viewAnswers} userName={targetUserName} />
  );
}
