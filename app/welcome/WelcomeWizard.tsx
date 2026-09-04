"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  WIZARD_STEPS,
  WIZARD_STEP_IDS,
  WIZARD_FINISH_ID,
  type WizardStepId,
} from "@/lib/services/onboarding-wizard";
import {
  pushSupport,
  subscribeToPush,
  type PushSupportState,
} from "@/lib/push-client";
import { FamilyUsersPanel } from "@/components/FamilyUsersPanel";
import type { CategoryId, MemberKind } from "@/lib/db/types";

interface WizardFamilyUser {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  member_kind: MemberKind;
  is_primary: boolean;
}

export interface SectionFolderSummary {
  subcategoryId: string;
  label: string;
  status: "complete" | "started" | "empty";
}

export interface SectionSummary {
  categoryId: CategoryId;
  folders: SectionFolderSummary[];
  startedCount: number;
  completedCount: number;
  totalCount: number;
}

interface Props {
  firstName: string;
  avatarUrl: string | null;
  initialStep: WizardStepId;
  initialSteps: Record<string, string>;
  lifeAdminPct: number;
  totalFolders: number;
  completedFolders: number;
  familyUsers: WizardFamilyUser[];
  familyAllUsersAddedAt: string | null;
  sectionSummaries: Record<CategoryId, SectionSummary>;
}

export function WelcomeWizard({
  firstName,
  avatarUrl,
  initialStep,
  initialSteps,
  lifeAdminPct,
  totalFolders,
  completedFolders,
  familyUsers,
  familyAllUsersAddedAt,
  sectionSummaries,
}: Props) {
  const router = useRouter();
  const [current, setCurrent] = useState<WizardStepId>(initialStep);
  const [steps, setSteps] = useState<Record<string, string>>(initialSteps);
  const [pending, startTransition] = useTransition();

  const isFinish = current === WIZARD_FINISH_ID;
  const currentIndex = WIZARD_STEP_IDS.indexOf(current);
  const doneCount = WIZARD_STEP_IDS.filter((id) => steps[id]).length;
  const meta =
    WIZARD_STEPS.find((s) => s.id === current) ??
    WIZARD_STEPS[WIZARD_STEPS.length - 1];

  const advance = (from: WizardStepId) => {
    if (from === WIZARD_FINISH_ID) return;
    const idx = WIZARD_STEP_IDS.indexOf(from);
    const next = WIZARD_STEP_IDS[idx + 1];
    setCurrent(next ?? WIZARD_FINISH_ID);
  };

  const markDone = (step: WizardStepId, onSuccess?: () => void) => {
    startTransition(async () => {
      const res = await fetch("/api/onboarding-wizard/step", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ step }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        state: { steps: Record<string, string>; isComplete: boolean };
      };
      setSteps(data.state.steps);
      if (onSuccess) onSuccess();
      else advance(step);
    });
  };

  const skip = (step: WizardStepId) => {
    // "Skip for now" leaves the step incomplete but moves on.
    advance(step);
  };

  const exitWithoutCompleting = () => {
    // Exiting the wizard — from the header "Skip", from the finish step, or
    // anywhere else — never fabricates step completions. Individual steps are
    // only marked done when the user clicks "I've done this" (or the server
    // auto-detects the underlying data). The wizard is "complete" only when
    // all 6 steps are individually done.
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-tal-cream-soft">
      <header className="border-b border-tal-line/60 bg-white/60 backdrop-blur">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            aria-label="Go to dashboard"
            className="flex items-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Logo.png"
              alt="The Adulting Life"
              className="h-9 w-auto"
            />
          </Link>
          <button
            type="button"
            onClick={exitWithoutCompleting}
            className="text-sm text-tal-plum-soft hover:text-tal-plum hover:underline disabled:opacity-50"
            disabled={pending}
          >
            Skip for now
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
        <ProgressDots
          current={currentIndex}
          steps={steps}
          onJump={(id) => setCurrent(id)}
        />

        <div className="mt-8 rounded-3xl bg-white ring-1 ring-tal-line shadow-sm p-4 sm:p-10">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-tal-plum-soft font-medium">
            {isFinish
              ? `Wrap up · ${doneCount} of ${WIZARD_STEP_IDS.length} done`
              : `Step ${currentIndex + 1} of ${WIZARD_STEP_IDS.length} · ${doneCount} done`}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-tal-plum leading-tight">
            {meta.title}
          </h1>
          <p className="text-tal-plum-soft mt-2">{meta.subtitle}</p>

          <ProgressChecklist
            steps={steps}
            current={current}
            onJump={(id) => setCurrent(id)}
          />

          <div className="mt-6">
            <StepBody
              step={current}
              firstName={firstName}
              avatarUrl={avatarUrl}
              lifeAdminPct={lifeAdminPct}
              totalFolders={totalFolders}
              completedFolders={completedFolders}
              stepDone={Boolean(steps[current])}
              pending={pending}
              onDone={(onSuccess) => markDone(current, onSuccess)}
              onSkip={() => skip(current)}
              onFinish={exitWithoutCompleting}
              familyUsers={familyUsers}
              familyAllUsersAddedAt={familyAllUsersAddedAt}
              sectionSummaries={sectionSummaries}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between text-sm">
          <button
            type="button"
            className="text-tal-plum-soft hover:text-tal-plum disabled:opacity-40"
            onClick={() => {
              if (isFinish) {
                setCurrent(WIZARD_STEP_IDS[WIZARD_STEP_IDS.length - 1]);
                return;
              }
              const prev = WIZARD_STEP_IDS[currentIndex - 1];
              if (prev) setCurrent(prev);
            }}
            disabled={(!isFinish && currentIndex === 0) || pending}
          >
            ← Back
          </button>
          {!isFinish && (
            <button
              type="button"
              onClick={() => skip(current)}
              className="text-tal-plum-soft hover:text-tal-plum disabled:opacity-40"
              disabled={pending}
            >
              Skip this step
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

function ProgressDots({
  current,
  steps,
  onJump,
}: {
  current: number;
  steps: Record<string, string>;
  onJump: (id: WizardStepId) => void;
}) {
  return (
    <ol className="flex items-start justify-center gap-0.5 sm:gap-2">
      {WIZARD_STEP_IDS.map((id, i) => {
        const done = Boolean(steps[id]);
        const active = i === current;
        const meta =
          WIZARD_STEPS.find((s) => s.id === id) ?? WIZARD_STEPS[i];
        const label = meta.shortTitle;
        return (
          <li key={id} className="flex items-start gap-0.5 sm:gap-2">
            <div className="flex flex-col items-center gap-1.5 w-11 sm:w-20">
              <button
                type="button"
                onClick={() => onJump(id)}
                aria-current={active ? "step" : undefined}
                aria-label={`Step ${i + 1}: ${label}${done ? " · complete" : active ? " · current" : " · not done"}. Click to open.`}
                className={
                  "flex items-center justify-center rounded-full font-semibold transition-all cursor-pointer hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-tal-plum focus-visible:ring-offset-2 " +
                  (active
                    ? "w-9 h-9 sm:w-11 sm:h-11 text-xs sm:text-sm bg-tal-plum text-white ring-2 ring-tal-plum ring-offset-2 shadow-md"
                    : done
                      ? "w-7 h-7 sm:w-8 sm:h-8 text-[11px] sm:text-xs bg-black text-white"
                      : "w-7 h-7 sm:w-8 sm:h-8 text-[11px] sm:text-xs bg-white ring-1 ring-tal-line text-tal-plum-soft")
                }
              >
                {done && !active ? "✓" : i + 1}
              </button>
              <span
                className={
                  "text-[9px] sm:text-xs text-center leading-tight " +
                  (active
                    ? "text-tal-plum font-semibold"
                    : done
                      ? "text-tal-plum"
                      : "text-tal-plum-soft")
                }
              >
                {label}
              </span>
            </div>
            {i < WIZARD_STEP_IDS.length - 1 && (
              <span
                className={
                  "h-0.5 w-1.5 sm:w-6 mt-4 sm:mt-5 shrink-0 " +
                  (done ? "bg-black" : "bg-tal-line")
                }
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ProgressChecklist({
  steps,
  current,
  onJump,
}: {
  steps: Record<string, string>;
  current: WizardStepId;
  onJump: (id: WizardStepId) => void;
}) {
  const doneCount = WIZARD_STEP_IDS.filter((id) => steps[id]).length;
  return (
    <details className="mt-4 rounded-xl border border-tal-line bg-tal-cream-soft/60">
      <summary className="cursor-pointer px-4 py-2.5 text-sm text-tal-plum font-medium select-none">
        Your progress · {doneCount} of {WIZARD_STEP_IDS.length} done
      </summary>
      <ol className="px-4 pb-3 pt-1 space-y-1.5 text-sm">
        {WIZARD_STEPS.filter((s) => s.id !== WIZARD_FINISH_ID).map((s) => {
          const done = Boolean(steps[s.id]);
          const isCurrent = s.id === current;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onJump(s.id)}
                className="w-full flex items-center gap-2.5 text-left rounded-lg px-2 py-1 hover:bg-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-tal-plum"
              >
                <span
                  aria-hidden
                  className={
                    "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 " +
                    (done
                      ? "bg-black text-white"
                      : "bg-white ring-1 ring-tal-line text-tal-plum-soft")
                  }
                >
                  {done ? "✓" : ""}
                </span>
                <span
                  className={
                    (done ? "text-tal-plum" : "text-tal-plum-soft") +
                    (isCurrent ? " font-semibold" : "")
                  }
                >
                  {s.title}
                </span>
                {isCurrent && (
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-tal-plum-soft">
                    You are here
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </details>
  );
}

function StepBody(props: {
  step: WizardStepId;
  firstName: string;
  avatarUrl: string | null;
  lifeAdminPct: number;
  totalFolders: number;
  completedFolders: number;
  stepDone: boolean;
  pending: boolean;
  onDone: (onSuccess?: () => void) => void;
  onSkip: () => void;
  onFinish: () => void;
  familyUsers: WizardFamilyUser[];
  familyAllUsersAddedAt: string | null;
  sectionSummaries: Record<CategoryId, SectionSummary>;
}) {
  const {
    step,
    firstName,
    avatarUrl,
    lifeAdminPct,
    totalFolders,
    completedFolders,
    stepDone,
    pending,
    onDone,
    onSkip,
    onFinish,
    familyUsers,
    familyAllUsersAddedAt,
    sectionSummaries,
  } = props;

  switch (step) {
    case "welcome":
      return (
        <WelcomeStep
          firstName={firstName}
          avatarUrl={avatarUrl}
          pending={pending}
          onContinue={() => onDone()}
        />
      );
    case "family":
      return (
        <FamilyStep
          familyUsers={familyUsers}
          familyAllUsersAddedAt={familyAllUsersAddedAt}
          done={stepDone}
          pending={pending}
          onMarkDone={() => onDone()}
          onSkip={onSkip}
        />
      );
    case "personal":
    case "health":
    case "education":
    case "employment":
    case "admin":
      return (
        <OrganiserSectionStep
          categoryId={step}
          summary={sectionSummaries[step]}
          done={stepDone}
          pending={pending}
          onMarkDone={() => onDone()}
          onSkip={onSkip}
        />
      );
    case "finish":
      return (
        <FinishStep
          firstName={firstName}
          lifeAdminPct={lifeAdminPct}
          totalFolders={totalFolders}
          completedFolders={completedFolders}
          pending={pending}
          onFinish={onFinish}
        />
      );
    default:
      // Retired step ids (contacts / templates / document / reminder) — kept
      // in the type union so old wizard_steps rows still parse, but no longer
      // rendered. If we somehow land on one, treat it as done and move on.
      return (
        <div>
          <p className="text-tal-plum-soft">This step is no longer used.</p>
          <button
            type="button"
            onClick={() => onDone()}
            className="mt-4 h-10 px-4 rounded-xl bg-black text-white text-sm font-medium"
          >
            Continue →
          </button>
        </div>
      );
  }
}

function WelcomeStep({
  firstName,
  avatarUrl,
  pending,
  onContinue,
}: {
  firstName: string;
  avatarUrl: string | null;
  pending: boolean;
  onContinue: () => void;
}) {
  const initial = firstName.charAt(0).toUpperCase();
  return (
    <div>
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={avatarUrl}
            alt=""
            className="w-16 h-16 rounded-full object-cover shrink-0"
          />
        ) : (
          <span className="w-16 h-16 rounded-full bg-black text-white text-2xl font-semibold flex items-center justify-center shrink-0">
            {initial}
          </span>
        )}
        <div>
          <div className="text-tal-plum font-medium">Hi {firstName} 👋</div>
          <p className="text-sm text-tal-plum-soft">
            We&apos;ll walk you through your Adulting Life Organiser
            section by section. You can go as fast or slow as you like.
          </p>
        </div>
      </div>

      <ul className="mt-6 space-y-2 text-sm text-tal-plum">
        <li className="flex gap-3">
          <span className="text-tal-plum-soft">1.</span>
          Add people in your family: partner, kids, anyone you&apos;re organising for
        </li>
        <li className="flex gap-3">
          <span className="text-tal-plum-soft">2.</span>
          Personal Information: emergency contacts, IDs, general info
        </li>
        <li className="flex gap-3">
          <span className="text-tal-plum-soft">3.</span>
          Health &amp; Wellbeing: medical advisers, health plan, medications
        </li>
        <li className="flex gap-3">
          <span className="text-tal-plum-soft">4.</span>
          Education and Employment: skip either if they don&apos;t apply
        </li>
        <li className="flex gap-3">
          <span className="text-tal-plum-soft">5.</span>
          Admin &amp; Bookkeeping: bank, vehicles, insurances, utilities
        </li>
      </ul>

      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={onContinue}
          disabled={pending}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-50"
        >
          Let&apos;s go →
        </button>
      </div>
    </div>
  );
}

function FamilyStep({
  familyUsers,
  familyAllUsersAddedAt,
  done,
  pending,
  onMarkDone,
  onSkip,
}: {
  familyUsers: WizardFamilyUser[];
  familyAllUsersAddedAt: string | null;
  done: boolean;
  pending: boolean;
  onMarkDone: () => void;
  onSkip: () => void;
}) {
  const hasMembers = familyUsers.length > 1;
  return (
    <div>
      <p className="text-tal-plum leading-relaxed">
        Who else will you be organising for? Add your partner, kids, or anyone
        else in your household so their records live in the same place as
        yours. You can always add more later.
      </p>

      <div className="mt-6">
        <FamilyUsersPanel
          initialUsers={familyUsers}
          initialAllUsersAddedAt={familyAllUsersAddedAt}
          canConfirm
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onMarkDone}
          disabled={pending}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-50"
        >
          {done || hasMembers || familyAllUsersAddedAt
            ? "Continue →"
            : "It's just me, continue"}
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={pending}
          className="text-sm text-tal-plum-soft hover:text-tal-plum disabled:opacity-40"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

const SECTION_INTROS: Record<CategoryId, { intro: string; bullets: string[] }> = {
  personal: {
    intro:
      "This section is all about you and your people. Start with emergency contacts and your ID documents first, then add the rest of your Personal Information when it suits you.",
    bullets: [
      "Emergency contacts (who we'd call if something happened)",
      "General information for yourself and each family member",
      "Birth certificate, passport, driver's licence and other IDs",
      "Fill in the form provided, upload a scanned copy, or do both. Totally your choice.",
    ],
  },
  health: {
    intro:
      "This section covers medical advisers, your health plan, medications you're on. Handy if you or a family member ever need urgent care.",
    bullets: [
      "Your GP and any specialists you see",
      "Your health plan and any allergies or conditions",
      "Medications and dosages",
    ],
  },
  education: {
    intro:
      "This section is for study, courses and qualifications. Add anything you are currently studying, qualifications you have completed, and your enrolment details. You can fill in the form provided, upload a scanned copy, or do both. If nobody in your family is studying right now, feel free to skip this section.",
    bullets: [
      "Current courses and enrolment details",
      "Past qualifications and certificates",
      "Student ID and campus info",
      "Fill in the form, upload a scan, or do both. Totally your choice.",
    ],
  },
  employment: {
    intro:
      "This section is all about your work life. Add your employer details, contracts, tax and super information, plus pay records and other important employment documents. Give it a quick update whenever something changes, because a little admin now saves a whole lot of headaches later.",
    bullets: [
      "Current employer and role",
      "Contract, tax file number reference and super fund",
      "Pay history and important employment documents",
      "Update your details whenever something changes",
    ],
  },
  admin: {
    intro:
      "This section is all about the practical everyday admin that keeps life ticking along. Add your bank accounts, vehicles, insurance, utilities and other important details so they are easy to find when you need them. You can also scan in and store your receipts here to help keep your paperwork nice and tidy.",
    bullets: [
      "Bank accounts and financial advisers",
      "Vehicle registrations and insurance policies",
      "Utility accounts and other important admin",
      "Scan in and store your receipts",
    ],
  },
};

function OrganiserSectionStep({
  categoryId,
  summary,
  done,
  pending,
  onMarkDone,
  onSkip,
}: {
  categoryId: CategoryId;
  summary: SectionSummary | undefined;
  done: boolean;
  pending: boolean;
  onMarkDone: () => void;
  onSkip: () => void;
}) {
  const meta = SECTION_INTROS[categoryId];
  const folders = summary?.folders ?? [];
  const startedCount = summary?.startedCount ?? 0;
  const completedCount = summary?.completedCount ?? 0;
  const totalCount = summary?.totalCount ?? 0;
  const hasFolders = totalCount > 0;

  const firstEmpty = folders.find((f) => f.status === "empty");
  const firstStarted = folders.find((f) => f.status === "started");
  const nextFolder = firstStarted ?? firstEmpty ?? folders[0];

  // Tag outbound links so the target folder page knows the user came from the
  // Setup Guide and can render a "return to setup" banner. We also embed the
  // NEXT folder's subcategoryId so the banner can offer a "Next form" button —
  // lets the user rip through several folders without bouncing back to the
  // wizard between each one.
  function buildQuery(currentSubId: string): string {
    const parts = [`from=setup`, `step=${categoryId}`];
    const currentIdx = folders.findIndex((f) => f.subcategoryId === currentSubId);
    const next = currentIdx >= 0 ? folders[currentIdx + 1] : null;
    if (next) {
      parts.push(`next=${encodeURIComponent(next.subcategoryId)}`);
    }
    return parts.join("&");
  }

  const primaryHref = nextFolder
    ? `/records/${categoryId}/${encodeURIComponent(nextFolder.subcategoryId)}?${buildQuery(nextFolder.subcategoryId)}`
    : `/records/${categoryId}?from=setup&step=${categoryId}`;
  const primaryLabel = firstStarted
    ? `Keep going with ${firstStarted.label} →`
    : firstEmpty
      ? `Start with ${firstEmpty.label} →`
      : "Open this section →";

  return (
    <div>
      <p className="text-tal-plum leading-relaxed">{meta.intro}</p>
      <ul className="mt-4 space-y-1.5 text-sm text-tal-plum-soft">
        {meta.bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="text-tal-plum" aria-hidden>
              •
            </span>
            {b}
          </li>
        ))}
      </ul>

      {hasFolders && (
        <div className="mt-6 rounded-2xl border border-tal-line bg-tal-cream-soft/40 p-4">
          <div className="flex items-baseline justify-between mb-3 gap-2 flex-wrap">
            <h3 className="font-display text-tal-plum">Folders in this section</h3>
            <span className="text-xs text-tal-plum-soft">
              {completedCount} complete · {startedCount} started · {totalCount} total
            </span>
          </div>
          <ul className="space-y-1 max-h-64 overflow-y-auto">
            {folders.map((f) => (
              <li key={f.subcategoryId}>
                <Link
                  href={`/records/${categoryId}/${encodeURIComponent(f.subcategoryId)}?${buildQuery(f.subcategoryId)}`}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-white/70"
                >
                  <StatusDot status={f.status} />
                  <span
                    className={
                      f.status === "complete"
                        ? "text-tal-plum font-medium"
                        : "text-tal-plum"
                    }
                  >
                    {f.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {nextFolder && (
          <Link
            href={primaryHref}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-black text-white text-sm font-medium"
          >
            {primaryLabel}
          </Link>
        )}
        <button
          type="button"
          onClick={onMarkDone}
          disabled={pending}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-tal-line bg-white text-sm font-medium text-tal-plum hover:shadow-sm disabled:opacity-50"
        >
          {done ? "Continue →" : "I've done enough for now"}
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={pending}
          className="text-sm text-tal-plum-soft hover:text-tal-plum disabled:opacity-40"
        >
          Skip this section
        </button>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: "complete" | "started" | "empty" }) {
  if (status === "complete") {
    return (
      <span
        aria-hidden
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-black text-white text-[9px] font-bold shrink-0"
      >
        ✓
      </span>
    );
  }
  if (status === "started") {
    return (
      <span
        aria-hidden
        title="Started"
        className="inline-block w-4 h-4 rounded-full bg-amber-400 shrink-0"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="inline-block w-4 h-4 rounded-full bg-white ring-1 ring-tal-line shrink-0"
    />
  );
}

function FinishStep({
  firstName,
  lifeAdminPct,
  totalFolders,
  completedFolders,
  pending,
  onFinish,
}: {
  firstName: string;
  lifeAdminPct: number;
  totalFolders: number;
  completedFolders: number;
  pending: boolean;
  onFinish: () => void;
}) {
  const remaining = Math.max(totalFolders - completedFolders, 0);
  return (
    <div>
      <div className="rounded-2xl bg-tal-cream p-6">
        <div className="flex items-center gap-2 text-tal-plum mb-1">
          <span aria-hidden>✨</span>
          <span className="font-medium">You&apos;re doing great, {firstName}!</span>
        </div>
        <p className="text-sm text-tal-plum-soft mb-3">
          You&apos;ve completed {lifeAdminPct}% of your Organiser.
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-white overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-tal-plum transition-all"
              style={{ width: `${lifeAdminPct}%` }}
            />
          </div>
          <span className="text-sm font-medium text-tal-plum tabular-nums">
            {lifeAdminPct}%
          </span>
        </div>
      </div>

      <p className="mt-6 text-tal-plum leading-relaxed">
        Each section you complete helps keep your important information
        organised, up to date and ready when you need it.
      </p>
      {remaining > 0 && (
        <p className="mt-2 text-sm text-tal-plum-soft">
          {completedFolders} of {totalFolders} folders complete · {remaining}{" "}
          left to go.
        </p>
      )}

      <PushOptInCard />

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onFinish}
          disabled={pending}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-50"
        >
          Take me to my dashboard →
        </button>
        <Link
          href="/records"
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-tal-line bg-white text-sm font-medium text-tal-plum hover:shadow-sm"
        >
          Start filling in your Organiser
        </Link>
      </div>
    </div>
  );
}

function PushOptInCard() {
  const [state, setState] = useState<PushSupportState>("unsupported");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<"idle" | "subscribed" | "declined" | "error">("idle");

  useEffect(() => {
    setState(pushSupport());
  }, []);

  if (state === "unsupported") return null;
  if (state === "granted" || result === "subscribed") {
    return (
      <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
        <span className="font-medium">Notifications on.</span>{" "}
        We&apos;ll let you know when something important is about to expire.
      </div>
    );
  }
  if (state === "denied") {
    return (
      <div className="mt-6 rounded-2xl border border-tal-line bg-white p-4 text-sm text-tal-plum-soft">
        Notifications are blocked in your browser. You can turn them on again
        from your browser&apos;s site settings anytime.
      </div>
    );
  }

  const enable = async () => {
    setBusy(true);
    const res = await subscribeToPush();
    setBusy(false);
    if (res.ok) {
      setResult("subscribed");
    } else if (res.reason === "denied" || res.reason === "default") {
      setResult("declined");
    } else {
      setResult("error");
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-tal-line bg-tal-cream-soft p-5">
      <div className="flex items-start gap-4 flex-wrap">
        <span
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white text-tal-plum shrink-0"
          aria-hidden
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 9a6 6 0 0 1 12 0v5l1.5 2.5H4.5L6 14V9Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M10 19a2 2 0 0 0 4 0"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-tal-plum">
            Get a heads-up before things expire?
          </div>
          <p className="text-xs text-tal-plum-soft mt-0.5">
            We&apos;ll send you a notification when a licence, rego or
            insurance is coming up. Nothing else. You can turn it off any time.
          </p>
          {result === "declined" && (
            <p className="text-xs text-tal-plum-soft mt-2">
              No worries, you can enable it from Settings later.
            </p>
          )}
          {result === "error" && (
            <p className="text-xs text-red-700 mt-2">
              Something went wrong. You can try again from Settings.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-black text-white text-sm font-medium disabled:opacity-50"
        >
          {busy ? "Asking…" : "Turn on notifications"}
        </button>
      </div>
    </div>
  );
}
