import { createServiceClient } from "@/lib/supabase/server";
import { findUserById } from "@/lib/db/users";

// `finish` is a wrap-up screen, not a real task. The retired step ids
// (`contacts`, `templates`, `document`, `reminder`) are kept in the type
// union so existing users' `wizard_steps` rows still parse — they just
// aren't rendered or counted. The active flow now walks the user through
// the five Organiser sections (matches Donna's physical binder).
export type WizardStepId =
  | "welcome"
  | "family"
  | "personal"
  | "health"
  | "education"
  | "employment"
  | "admin"
  | "contacts"
  | "templates"
  | "document"
  | "reminder"
  | "finish";

export const WIZARD_STEP_IDS: readonly WizardStepId[] = [
  "welcome",
  "family",
  "personal",
  "health",
  "education",
  "employment",
  "admin",
] as const;

export const WIZARD_FINISH_ID: WizardStepId = "finish";

export interface WizardStepMeta {
  id: WizardStepId;
  title: string;
  shortTitle: string;
  subtitle: string;
}

export const WIZARD_STEPS: readonly WizardStepMeta[] = [
  {
    id: "welcome",
    title: "Welcome to The Adulting Life",
    shortTitle: "Welcome",
    subtitle: "Let's get you set up — takes about 5 minutes to start.",
  },
  {
    id: "family",
    title: "Add your family",
    shortTitle: "Family",
    subtitle:
      "Partner, kids, anyone else you'll be organising for. You can add more later.",
  },
  {
    id: "personal",
    title: "Personal Information",
    shortTitle: "Personal",
    subtitle:
      "The purple section — emergency contacts, ID documents, general info about you and your family.",
  },
  {
    id: "health",
    title: "Health & Wellbeing",
    shortTitle: "Health",
    subtitle:
      "The yellow section — medical advisers, health plan, medications.",
  },
  {
    id: "education",
    title: "Education",
    shortTitle: "Education",
    subtitle:
      "The blue section — courses, enrolment details, qualifications. Skip if none apply.",
  },
  {
    id: "employment",
    title: "Employment",
    shortTitle: "Employment",
    subtitle:
      "The red section — employer details, contracts, pay. Skip if none apply.",
  },
  {
    id: "admin",
    title: "Admin & Bookkeeping",
    shortTitle: "Admin",
    subtitle:
      "The green section — bank accounts, vehicles, insurances, utilities.",
  },
  {
    id: "finish",
    title: "You're doing great!",
    shortTitle: "Finish",
    subtitle: "Here's a snapshot of your Organiser so far.",
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

// Clears everything so the user is treated as brand-new: next dashboard
// visit force-redirects to /welcome and the setup guide starts fresh.
// Called from Settings → Restart Setup guide.
export async function resetWizardStatus(userId: string): Promise<void> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("users")
    .update({
      wizard_seen_at: null,
      wizard_completed_at: null,
      wizard_steps: {},
      updated_at: now,
    })
    .eq("id", userId);
  if (error) throw error;
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
  // First real step completed → treat wizard as actually seen. Opening the
  // page without doing anything isn't enough (see /welcome page for reason).
  if (!current.seenAt) {
    patch.wizard_seen_at = now;
  }
  if (isComplete && !current.completedAt) {
    patch.wizard_completed_at = now;
  }
  const { error } = await supabase.from("users").update(patch).eq("id", userId);
  if (error) throw error;
  return loadWizardState(userId);
}

