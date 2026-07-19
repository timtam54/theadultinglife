import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import { categoryProgressForFamily } from "@/lib/services/folder-completion";
import { listRemindersForFamily } from "@/lib/services/reminders";
import { buildEmergencyView } from "@/lib/services/emergency";
import {
  loadWizardState,
  markWizardSeen,
  WIZARD_STEP_IDS,
  type WizardStepId,
} from "@/lib/services/onboarding-wizard";
import { WelcomeWizard } from "./WelcomeWizard";

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

  const [emergency, categoryProgress, reminders] = await Promise.all([
    buildEmergencyView(session.user.familyGroupId),
    categoryProgressForFamily(session.user.familyGroupId),
    listRemindersForFamily(session.user.familyGroupId),
  ]);

  // Auto-detect the two steps that map cleanly to concrete data;
  // the others rely on the user's "I've done this" click.
  const detected: Partial<Record<WizardStepId, boolean>> = {
    contacts: emergency.sections.some(
      (s) =>
        s.subcategoryId === "personal.emergency_contacts" && s.records.length > 0
    ),
    reminder: reminders.length > 0,
  };
  const stepsMerged = { ...state.steps };
  const now = new Date().toISOString();
  for (const id of ["contacts", "reminder"] as WizardStepId[]) {
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
  const initialStep: WizardStepId =
    stepParam && WIZARD_STEP_IDS.includes(stepParam)
      ? stepParam
      : (WIZARD_STEP_IDS.find((id) => !stepsMerged[id]) ?? "finish");

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
    />
  );
}
