import { createServiceClient } from "@/lib/supabase/server";
import { findUserById } from "@/lib/db/users";

export type WizardStepId =
  | "welcome"
  | "contacts"
  | "templates"
  | "document"
  | "reminder"
  | "finish";

export const WIZARD_STEP_IDS: readonly WizardStepId[] = [
  "welcome",
  "contacts",
  "templates",
  "document",
  "reminder",
  "finish",
] as const;

export interface WizardStepMeta {
  id: WizardStepId;
  title: string;
  subtitle: string;
}

export const WIZARD_STEPS: readonly WizardStepMeta[] = [
  {
    id: "welcome",
    title: "Welcome to The Adulting Life",
    subtitle: "Let's get you set up — takes about 3 minutes.",
  },
  {
    id: "contacts",
    title: "Add your emergency contacts",
    subtitle:
      "The people we'd call if something happens. You can add more later.",
  },
  {
    id: "templates",
    title: "Explore your templates",
    subtitle:
      "Fillable forms that save straight into your Life Admin — start one now.",
  },
  {
    id: "document",
    title: "Upload your first document",
    subtitle:
      "Licence, passport, Medicare card — anything you'd hate to lose.",
  },
  {
    id: "reminder",
    title: "Add your first reminder",
    subtitle: "Never miss a licence or insurance renewal again.",
  },
  {
    id: "finish",
    title: "You're doing great!",
    subtitle: "Here's a snapshot of your Life Admin so far.",
  },
];

export interface WizardState {
  seenAt: string | null;
  completedAt: string | null;
  steps: Record<string, string>;
  doneCount: number;
  totalCount: number;
  isComplete: boolean;
  nextStep: WizardStepId | null;
}

export async function loadWizardState(userId: string): Promise<WizardState> {
  let user: Awaited<ReturnType<typeof findUserById>> = null;
  try {
    user = await findUserById(userId);
  } catch {
    // Migration 035 may not be applied yet — treat as fresh state.
    user = null;
  }
  const steps = (user?.wizard_steps ?? {}) as Record<string, string>;
  const doneCount = WIZARD_STEP_IDS.filter((id) => Boolean(steps[id])).length;
  const totalCount = WIZARD_STEP_IDS.length;
  const isComplete = Boolean(user?.wizard_completed_at) || doneCount === totalCount;
  const nextStep =
    WIZARD_STEP_IDS.find((id) => !steps[id]) ?? null;
  return {
    seenAt: user?.wizard_seen_at ?? null,
    completedAt: user?.wizard_completed_at ?? null,
    steps,
    doneCount,
    totalCount,
    isComplete,
    nextStep,
  };
}

export async function markWizardSeen(userId: string): Promise<void> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  await supabase
    .from("users")
    .update({ wizard_seen_at: now, updated_at: now })
    .eq("id", userId)
    .is("wizard_seen_at", null);
}

export async function markStepDone(
  userId: string,
  step: WizardStepId
): Promise<WizardState> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const current = await loadWizardState(userId);
  const nextSteps = { ...current.steps, [step]: now };
  const doneCount = WIZARD_STEP_IDS.filter((id) => Boolean(nextSteps[id])).length;
  const isComplete = doneCount === WIZARD_STEP_IDS.length;
  const patch: Record<string, unknown> = {
    wizard_steps: nextSteps,
    updated_at: now,
  };
  if (isComplete && !current.completedAt) {
    patch.wizard_completed_at = now;
  }
  const { error } = await supabase.from("users").update(patch).eq("id", userId);
  if (error) throw error;
  return loadWizardState(userId);
}

