import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { isUserInFamilyGroup, listUsersInFamilyGroup } from "@/lib/db/users";
import { isCategoryId, listUserRecords } from "@/lib/services/records";
import { loadPageFormByGroup } from "@/lib/services/pageForm";
import { listQuestionsBySubcategory } from "@/lib/db/questions";
import { getSubcategoryForUser } from "@/lib/db/subcategories";
import { GenericFormPrintView } from "@/components/GenericFormPrintView";
import { GenericListPrintView } from "@/components/GenericListPrintView";

function displayName(u: {
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  email: string | null;
}): string {
  return (
    [u.first_name, u.last_name].filter(Boolean).join(" ") ||
    u.name ||
    u.email ||
    ""
  );
}

export default async function GenericPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; subcategory: string }>;
  searchParams: Promise<{ user?: string }>;
}) {
  const { category, subcategory } = await params;
  if (!isCategoryId(category)) notFound();
  const subcategoryId = decodeURIComponent(subcategory);

  const session = await requireSession();
  const folder = await getSubcategoryForUser(session.user.id, subcategoryId);
  if (!folder || folder.category_id !== category) notFound();

  const { user: userParam } = await searchParams;
  let targetUserId = session.user.id;
  if (userParam && userParam !== session.user.id) {
    const ok = await isUserInFamilyGroup(userParam, session.user.familyGroupId);
    if (!ok) notFound();
    targetUserId = userParam;
  }

  const familyUsers = await listUsersInFamilyGroup(session.user.familyGroupId);
  const targetUser = familyUsers.find((u) => u.id === targetUserId);
  const userName = targetUser ? displayName(targetUser) : "";

  // Decide print variant:
  //   - Folder has page_questions → form view
  //   - Otherwise → list view (records in the folder)
  const questions = await listQuestionsBySubcategory(subcategoryId);
  if (questions.length > 0) {
    const group = questions[0].page_group;
    const { answers } = await loadPageFormByGroup(targetUserId, group);
    return (
      <GenericFormPrintView
        title={folder.name}
        userName={userName}
        questions={questions}
        answers={answers}
      />
    );
  }

  const records = await listUserRecords(targetUserId, {
    categoryId: category,
    subcategoryId,
  });
  return (
    <GenericListPrintView
      title={folder.name}
      userName={userName}
      records={records}
    />
  );
}
