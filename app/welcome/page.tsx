import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import {
  categoryProgressForFamily,
  folderProgressForCategory,
  folderIsComplete,
  folderIsStarted,
} from "@/lib/services/folder-completion";
import {
  loadWizardState,
  markWizardSeen,
  WIZARD_STEP_IDS,
  WIZARD_FINISH_ID,
  type WizardStepId,
} from "@/lib/services/onboarding-wizard";
import { listUsersInFamilyGroup } from "@/lib/db/users";
import { getFamilyGroup } from "@/lib/db/family-groups";
import { listSubcategoriesForUser } from "@/lib/db/subcategories";
import { CATEGORY_IDS, type CategoryId } from "@/lib/db/types";
import { WelcomeWizard, type SectionSummary } from "./WelcomeWizard";

export const metadata: Metadata = {
  title: "Welcome — The Adulting Life",
  description: "Set up your Adulting Life account in a few quick steps.",
};

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  await markWizardSeen(session.user.id);

  const state = await loadWizardState(session.user.id);

  const [
    categoryProgress,
    familyUsers,
    familyGroup,
    ...perSectionFolderMaps
  ] = await Promise.all([
    categoryProgressForFamily(session.user.familyGroupId),
    listUsersInFamilyGroup(session.user.familyGroupId),
    getFamilyGroup(session.user.familyGroupId),
    ...CATEGORY_IDS.map((cid) =>
      folderProgressForCategory(session.user.familyGroupId, cid)
    ),
  ]);

  const folderProgressByCategory = new Map(
    CATEGORY_IDS.map((cid, i) => [cid, perSectionFolderMaps[i]])
  );

  // Load subcategory rows for each section so we can render folder names in
  // the wizard checklist. Fetched from the caller's view (per-user + catalogue
  // subcategories are visible).
  const perSectionSubs = await Promise.all(
    CATEGORY_IDS.map((cid) => listSubcategoriesForUser(session.user.id, cid))
  );

  const sectionSummaries: Record<CategoryId, SectionSummary> =
    CATEGORY_IDS.reduce(
      (acc, cid, i) => {
        const subs = perSectionSubs[i];
        const progressMap = folderProgressByCategory.get(cid);
        const folders = subs.map((s) => {
          const p = progressMap?.get(s.id);
          const status: "complete" | "started" | "empty" = p
            ? folderIsComplete(p)
              ? "complete"
              : folderIsStarted(p)
                ? "started"
                : "empty"
            : "empty";
          return {
            subcategoryId: s.id,
            label: s.label,
            status,
          };
        });
        acc[cid] = {
          categoryId: cid,
          folders,
          startedCount: folders.filter(
            (f) => f.status === "started" || f.status === "complete"
          ).length,
          completedCount: folders.filter((f) => f.status === "complete").length,
          totalCount: folders.length,
        };
        return acc;
      },
      {} as Record<CategoryId, SectionSummary>
    );

  // Auto-detect: family is complete once they've added at least one
  // non-primary member OR explicitly confirmed nobody else. Each Organiser
  // section auto-completes once the user has started at least half of its
  // folders — a "you've got the hang of it" threshold. Users can also mark
  // any section done manually from within the step.
  const detected: Partial<Record<WizardStepId, boolean>> = {
    family:
      familyUsers.length > 1 || Boolean(familyGroup?.all_users_added_at),
  };
  for (const cid of CATEGORY_IDS) {
    const sum = sectionSummaries[cid];
    if (sum.totalCount === 0) continue;
    if (sum.startedCount / sum.totalCount >= 0.5) {
      detected[cid as WizardStepId] = true;
    }
  }

  const stepsMerged = { ...state.steps };
  const now = new Date().toISOString();
  const autoDetectIds: WizardStepId[] = [
    "family",
    ...(CATEGORY_IDS as readonly WizardStepId[]),
  ];
  for (const id of autoDetectIds) {
    if (detected[id] && !stepsMerged[id]) stepsMerged[id] = now;
  }

  const totalCompletedFolders = Array.from(categoryProgress.values()).reduce(
    (a, c) => a + c.completedFolders,
    0
  );
  const totalFolders = Array.from(categoryProgress.values()).reduce(
    (a, c) => a + c.totalFolders,
    0
  );
  const lifeAdminPct =
    totalFolders > 0
      ? Math.round((totalCompletedFolders / totalFolders) * 100)
      : 0;

  const params = await searchParams;
  const stepParam = (params.step as WizardStepId | undefined) ?? null;
  const stepParamAllowed =
    stepParam &&
    (WIZARD_STEP_IDS.includes(stepParam) || stepParam === WIZARD_FINISH_ID);
  const initialStep: WizardStepId = stepParamAllowed
    ? stepParam
    : (WIZARD_STEP_IDS.find((id) => !stepsMerged[id]) ?? WIZARD_FINISH_ID);

  const firstName =
    session.user.firstName ??
    session.user.name?.split(" ")[0] ??
    "there";

  return (
    <WelcomeWizard
      firstName={firstName}
      avatarUrl={session.user.avatarUrl}
      initialStep={initialStep}
      initialSteps={stepsMerged}
      lifeAdminPct={lifeAdminPct}
      totalFolders={totalFolders}
      completedFolders={totalCompletedFolders}
      familyUsers={familyUsers.map((u) => ({
        id: u.id,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        member_kind: u.member_kind,
        is_primary: u.is_primary,
      }))}
      familyAllUsersAddedAt={familyGroup?.all_users_added_at ?? null}
      sectionSummaries={sectionSummaries}
    />
  );
}
