import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { isUserInFamilyGroup, listUsersInFamilyGroup } from "@/lib/db/users";
import { isCategoryId, listUserRecords } from "@/lib/services/records";
import { listSubcategoriesForUser } from "@/lib/db/subcategories";
import { listQuestionsBySubcategory } from "@/lib/db/questions";
import { loadPageFormByGroup } from "@/lib/services/pageForm";
import { CATEGORY_LABELS, type PageQuestionRow, type RecordRow } from "@/lib/db/types";
import { SectionPrintView } from "@/components/SectionPrintView";

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

export interface SectionPrintFolder {
  id: string;
  name: string;
  hint: string | null;
  variant: "form" | "list";
  questions: PageQuestionRow[];
  answers: Record<string, string | null>;
  records: RecordRow[];
}

export default async function CategoryPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ user?: string }>;
}) {
  const { category } = await params;
  if (!isCategoryId(category)) notFound();

  const session = await requireSession();
  const { user: userParam } = await searchParams;
  let targetUserId = session.user.id;
  if (userParam && userParam !== session.user.id) {
    const ok = await isUserInFamilyGroup(userParam, session.user.familyGroupId);
    if (!ok) notFound();
    targetUserId = userParam;
  }

  const [familyUsers, subcats] = await Promise.all([
    listUsersInFamilyGroup(session.user.familyGroupId),
    listSubcategoriesForUser(targetUserId, category),
  ]);
  const targetUser = familyUsers.find((u) => u.id === targetUserId);
  const userName = targetUser ? displayName(targetUser) : "";

  const folders: SectionPrintFolder[] = await Promise.all(
    subcats.map(async (s) => {
      const questions = await listQuestionsBySubcategory(s.id);
      if (questions.length > 0) {
        const group = questions[0].page_group;
        const { answers } = await loadPageFormByGroup(targetUserId, group);
        return {
          id: s.id,
          name: s.name,
          hint: s.hint,
          variant: "form" as const,
          questions,
          answers,
          records: [],
        };
      }
      const records = await listUserRecords(targetUserId, {
        categoryId: category,
        subcategoryId: s.id,
      });
      return {
        id: s.id,
        name: s.name,
        hint: s.hint,
        variant: "list" as const,
        questions: [],
        answers: {},
        records,
      };
    })
  );

  return (
    <SectionPrintView
      categoryLabel={CATEGORY_LABELS[category]}
      userName={userName}
      folders={folders}
    />
  );
}
