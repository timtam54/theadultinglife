import { getFamilyGroup } from "@/lib/db/family-groups";
import { listProgress } from "@/lib/db/progress";
import { categoryProgressForFamily } from "@/lib/services/folder-completion";
import { listSubcategoriesByTemplateGroup } from "@/lib/db/subcategories";
import { countInstancesBySubcategory } from "@/lib/db/responses";

export interface OnboardingTask {
  id: string;
  label: string;
  href: string;
  done: boolean;
}

export interface OnboardingSummary {
  tasks: OnboardingTask[];
  doneCount: number;
  totalCount: number;
  outstandingCount: number;
  pct: number;
}

export async function loadOnboardingSummary(
  userId: string,
  familyGroupId: string
): Promise<OnboardingSummary> {
  const [progressRows, categoryProgress, pomSubs, familyGroup] =
    await Promise.all([
      listProgress(userId),
      categoryProgressForFamily(familyGroupId),
      listSubcategoriesByTemplateGroup("peace_of_mind"),
      getFamilyGroup(familyGroupId),
    ]);

  const pomCounts = await countInstancesBySubcategory(
    userId,
    pomSubs.map((s) => s.id)
  );

  const articlesRead = progressRows.filter(
    (p) => p.item_type === "content" && p.status === "completed"
  ).length;
  const quizzesTaken = progressRows.filter(
    (p) => p.item_type === "quiz"
  ).length;

  const pomSectionsWithEntries = pomSubs.filter(
    (s) => (pomCounts.get(s.id) ?? 0) > 0
  ).length;

  const familyRosterDone = familyGroup?.all_users_added_at != null;

  const totalStartedFolders = Array.from(categoryProgress.values()).reduce(
    (a, c) => a + c.startedFolders,
    0
  );
  const totalCompletedFolders = Array.from(categoryProgress.values()).reduce(
    (a, c) => a + c.completedFolders,
    0
  );

  const tasks: OnboardingTask[] = [
    {
      id: "family-roster",
      label: "Add your family members (or confirm it's just you)",
      href: "/records/personal/personal.general_information",
      done: familyRosterDone,
    },
    {
      id: "folder-start",
      label: "Start filling in a Life Admin folder",
      href: "/records",
      done: totalStartedFolders > 0 || totalCompletedFolders > 0,
    },
    {
      id: "folder-complete",
      label: "Finish filling in a Life Admin folder",
      href: "/records",
      done: totalCompletedFolders > 0,
    },
    {
      id: "pom-start",
      label: "Fill in one Peace of Mind section",
      href: "/templates/peace-of-mind-planner",
      done: pomSectionsWithEntries >= 1,
    },
    {
      id: "pom-half",
      label: "Complete 5 Peace of Mind sections",
      href: "/templates/peace-of-mind-planner",
      done: pomSectionsWithEntries >= 5,
    },
    {
      id: "learn-article",
      label: "Read your first Learn article",
      href: "/learn",
      done: articlesRead >= 1,
    },
    {
      id: "quiz-first",
      label: "Take a quiz",
      href: "/learn/quizzes",
      done: quizzesTaken >= 1,
    },
    {
      id: "watch-video",
      label: "Watch a Learn video",
      href: "/learn/videos",
      done: false,
    },
  ];

  const doneCount = tasks.filter((t) => t.done).length;
  const totalCount = tasks.length;
  const outstandingCount = totalCount - doneCount;
  const pct = Math.round((doneCount / totalCount) * 100);

  return { tasks, doneCount, totalCount, outstandingCount, pct };
}
