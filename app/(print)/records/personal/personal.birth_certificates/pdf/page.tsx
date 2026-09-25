import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { loadPageFormByGroup } from "@/lib/services/pageForm";
import { isUserInFamilyGroup, listUsersInFamilyGroup } from "@/lib/db/users";
import { BirthCertificatePrintView } from "./BirthCertificatePrintView";
import { printFilename } from "@/lib/print-filename";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}): Promise<Metadata> {
  try {
    const session = await requireSession();
    const { user: userParam } = await searchParams;
    let targetUserId = session.user.id;
    if (userParam && userParam !== session.user.id) {
      const ok = await isUserInFamilyGroup(
        userParam,
        session.user.familyGroupId
      );
      if (ok) targetUserId = userParam;
    }
    const users = await listUsersInFamilyGroup(session.user.familyGroupId);
    const u = users.find((x) => x.id === targetUserId);
    const name = u
      ? [u.first_name, u.last_name].filter(Boolean).join(" ") ||
        u.name ||
        u.email ||
        ""
      : "";
    return {
      title: { absolute: printFilename("Birth Certificate", name) },
      robots: { index: false, follow: false },
    };
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return {
        title: { absolute: "Birth Certificate" },
        robots: { index: false },
      };
    }
    throw e;
  }
}

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
