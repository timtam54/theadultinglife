import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { isUserInFamilyGroup, listUsersInFamilyGroup } from "@/lib/db/users";
import { isCategoryId, listUserRecords } from "@/lib/services/records";
import {
  loadPageFormByGroup,
  loadPageFormInstance,
} from "@/lib/services/pageForm";
import { listQuestionsBySubcategory } from "@/lib/db/questions";
import { getSubcategoryForUser } from "@/lib/db/subcategories";
import { GenericFormPrintView } from "@/components/GenericFormPrintView";
import { GenericListPrintView } from "@/components/GenericListPrintView";
import { printFilename } from "@/lib/print-filename";

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

// Set the <title> to something descriptive so Chrome's "Save as PDF"
// picks a useful filename like "Employee Information Form - Tim HAMS.pdf"
// instead of the generic app title. Wrap in try/catch — this runs before
// the page body, so any auth error must not crash metadata generation.
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; subcategory: string }>;
  searchParams: Promise<{ user?: string; instance?: string }>;
}): Promise<Metadata> {
  try {
    const session = await requireSession();
    const { category, subcategory } = await params;
    const subcategoryId = decodeURIComponent(subcategory);
    const folder = await getSubcategoryForUser(session.user.id, subcategoryId);
    if (!folder || folder.category_id !== category) {
      return { title: { absolute: "Save as PDF" }, robots: { index: false } };
    }
    const { user: userParam, instance } = await searchParams;
    let targetUserId = session.user.id;
    if (userParam && userParam !== session.user.id) {
      const ok = await isUserInFamilyGroup(
        userParam,
        session.user.familyGroupId
      );
      if (ok) targetUserId = userParam;
    }
    const familyUsers = await listUsersInFamilyGroup(session.user.familyGroupId);
    const targetUser = familyUsers.find((u) => u.id === targetUserId);
    const userName = targetUser ? displayName(targetUser) : "";
    const docTitle = instance
      ? `${folder.name} - Entry ${instance}`
      : folder.name;
    return {
      title: { absolute: printFilename(docTitle, userName) },
      robots: { index: false, follow: false },
    };
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return { title: { absolute: "Save as PDF" }, robots: { index: false } };
    }
    throw e;
  }
}

export default async function GenericPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; subcategory: string }>;
  searchParams: Promise<{ user?: string; instance?: string }>;
}) {
  const { category, subcategory } = await params;
  if (!isCategoryId(category)) notFound();
  const subcategoryId = decodeURIComponent(subcategory);

  const session = await requireSession();
  const folder = await getSubcategoryForUser(session.user.id, subcategoryId);
  if (!folder || folder.category_id !== category) notFound();

  const { user: userParam, instance: instanceParam } = await searchParams;
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
  //     - `?instance=<id>` prints that specific entry from a repeater;
  //       omitted → prints the singleton (default) row.
  //   - Otherwise → list view (records in the folder)
  const questions = await listQuestionsBySubcategory(subcategoryId);
  if (questions.length > 0) {
    if (instanceParam && folder.repeatable) {
      const loaded = await loadPageFormInstance(
        targetUserId,
        subcategoryId,
        instanceParam
      );
      if (!loaded) notFound();
      return (
        <GenericFormPrintView
          title={folder.name}
          subtitle={`Entry ${instanceParam}`}
          userName={userName}
          questions={loaded.questions}
          answers={loaded.answers}
        />
      );
    }
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
