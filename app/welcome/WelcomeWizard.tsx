"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  WIZARD_STEPS,
  WIZARD_STEP_IDS,
  type WizardStepId,
} from "@/lib/services/onboarding-wizard";

interface Props {
  firstName: string;
  avatarUrl: string | null;
  initialStep: WizardStepId;
  initialSteps: Record<string, string>;
  lifeAdminPct: number;
  totalFolders: number;
  completedFolders: number;
}

export function WelcomeWizard({
  firstName,
  avatarUrl,
  initialStep,
  initialSteps,
  lifeAdminPct,
  totalFolders,
  completedFolders,
}: Props) {
  const router = useRouter();
  const [current, setCurrent] = useState<WizardStepId>(initialStep);
  const [steps, setSteps] = useState<Record<string, string>>(initialSteps);
  const [pending, startTransition] = useTransition();

  const currentIndex = WIZARD_STEP_IDS.indexOf(current);
  const doneCount = WIZARD_STEP_IDS.filter((id) => steps[id]).length;
  const meta = WIZARD_STEPS[currentIndex];

  const advance = (from: WizardStepId) => {
    const next = WIZARD_STEP_IDS[WIZARD_STEP_IDS.indexOf(from) + 1];
    if (next) setCurrent(next);
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
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            aria-label="Go to dashboard"
            className="font-display text-xl text-tal-plum leading-tight"
          >
            The <em className="italic">Adulting</em> Life
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

      <main className="max-w-3xl mx-auto px-6 py-10">
        <ProgressDots current={currentIndex} steps={steps} />

        <div className="mt-8 rounded-3xl bg-white ring-1 ring-tal-line shadow-sm p-8 sm:p-10">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-tal-plum-soft font-medium">
            Step {currentIndex + 1} of {WIZARD_STEP_IDS.length} · {doneCount} done
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-tal-plum leading-tight">
            {meta.title}
          </h1>
          <p className="text-tal-plum-soft mt-2">{meta.subtitle}</p>

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
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between text-sm">
          <button
            type="button"
            className="text-tal-plum-soft hover:text-tal-plum disabled:opacity-40"
            onClick={() => {
              const prev = WIZARD_STEP_IDS[currentIndex - 1];
              if (prev) setCurrent(prev);
            }}
            disabled={currentIndex === 0 || pending}
          >
            ← Back
          </button>
          {current !== "finish" && (
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
}: {
  current: number;
  steps: Record<string, string>;
}) {
  return (
    <ol className="flex items-center justify-center gap-3">
      {WIZARD_STEP_IDS.map((id, i) => {
        const done = Boolean(steps[id]);
        const active = i === current;
        return (
          <li key={id} className="flex items-center gap-3">
            <span
              className={
                "flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-colors " +
                (done
                  ? "bg-tal-plum text-white"
                  : active
                    ? "bg-white ring-2 ring-tal-plum text-tal-plum"
                    : "bg-white ring-1 ring-tal-line text-tal-plum-soft")
              }
              aria-current={active ? "step" : undefined}
              aria-label={`Step ${i + 1}${done ? ", complete" : ""}`}
            >
              {done ? "✓" : i + 1}
            </span>
            {i < WIZARD_STEP_IDS.length - 1 && (
              <span
                className={
                  "h-0.5 w-6 sm:w-10 " +
                  (done ? "bg-tal-plum" : "bg-tal-line")
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
    case "contacts":
      return (
        <DeepLinkStep
          done={stepDone}
          pending={pending}
          intro="These are the people we'd want to reach if something happened to you. Add at least one — you can add more anytime."
          bullets={[
            "Full name and relationship",
            "Best contact number (plus a backup if you have one)",
            "Anything a paramedic should know",
          ]}
          primaryHref="/records/personal/personal.emergency_contacts"
          primaryLabel="Add contacts now"
          onMarkDone={() => onDone()}
          onSkip={onSkip}
        />
      );
    case "templates":
      return (
        <DeepLinkStep
          done={stepDone}
          pending={pending}
          intro="Templates are our fillable forms — start one and it saves straight into your Life Admin. The Peace of Mind Planner is a great one to try first."
          bullets={[
            "Peace of Mind Planner",
            "Personal Information Form",
            "Employment & Incident forms",
          ]}
          primaryHref="/templates"
          primaryLabel="Browse templates"
          onMarkDone={() => onDone()}
          onSkip={onSkip}
        />
      );
    case "document":
      return (
        <DeepLinkStep
          done={stepDone}
          pending={pending}
          intro="Upload one important document — your driver's licence is a good place to start. You can also scan and let TAL AI extract the details for you."
          bullets={[
            "Licence, passport or Medicare card",
            "PDFs or clear photos work",
            "Stored securely, only you can see it",
          ]}
          primaryHref="/records/personal/personal.licences_ids"
          primaryLabel="Upload a document"
          onMarkDone={() => onDone()}
          onSkip={onSkip}
        />
      );
    case "reminder":
      return (
        <DeepLinkStep
          done={stepDone}
          pending={pending}
          intro="Add an expiry date to something important — your licence, rego, or an insurance policy — and we'll remind you before it lapses."
          bullets={[
            "Licence renewal",
            "Vehicle registration",
            "Insurance policies",
          ]}
          primaryHref="/reminders"
          primaryLabel="Add a reminder"
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
          <span className="w-16 h-16 rounded-full bg-tal-plum text-white text-2xl font-semibold flex items-center justify-center shrink-0">
            {initial}
          </span>
        )}
        <div>
          <div className="text-tal-plum font-medium">Hi {firstName} 👋</div>
          <p className="text-sm text-tal-plum-soft">
            We&apos;ll walk you through five quick things so your Adulting Life
            works for you from day one.
          </p>
        </div>
      </div>

      <ul className="mt-6 space-y-2 text-sm text-tal-plum">
        <li className="flex gap-3">
          <span className="text-tal-plum-soft">1.</span>
          Add your emergency contacts
        </li>
        <li className="flex gap-3">
          <span className="text-tal-plum-soft">2.</span>
          Try one of your templates
        </li>
        <li className="flex gap-3">
          <span className="text-tal-plum-soft">3.</span>
          Upload your first document
        </li>
        <li className="flex gap-3">
          <span className="text-tal-plum-soft">4.</span>
          Add a reminder so you never miss a renewal
        </li>
        <li className="flex gap-3">
          <span className="text-tal-plum-soft">5.</span>
          Check your Life Admin progress
        </li>
      </ul>

      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={onContinue}
          disabled={pending}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-black text-white text-sm font-medium hover:bg-tal-plum-dark disabled:opacity-50"
        >
          Let&apos;s go →
        </button>
      </div>
    </div>
  );
}

function DeepLinkStep({
  done,
  pending,
  intro,
  bullets,
  primaryHref,
  primaryLabel,
  onMarkDone,
  onSkip,
}: {
  done: boolean;
  pending: boolean;
  intro: string;
  bullets: string[];
  primaryHref: string;
  primaryLabel: string;
  onMarkDone: () => void;
  onSkip: () => void;
}) {
  return (
    <div>
      <p className="text-tal-plum leading-relaxed">{intro}</p>
      <ul className="mt-4 space-y-1.5 text-sm text-tal-plum-soft">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="text-tal-plum" aria-hidden>
              •
            </span>
            {b}
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href={primaryHref}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-black text-white text-sm font-medium hover:bg-tal-plum-dark"
        >
          {primaryLabel} →
        </Link>
        <button
          type="button"
          onClick={onMarkDone}
          disabled={pending}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-tal-line bg-white text-sm font-medium text-tal-plum hover:shadow-sm disabled:opacity-50"
        >
          {done ? "Continue →" : "I've done this"}
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
          You&apos;ve completed {lifeAdminPct}% of your Life Admin.
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
        Every folder you fill in makes the app smarter — you&apos;ll get
        reminders, an emergency page ready to hand to anyone, and one secure
        place for everything.
      </p>
      {remaining > 0 && (
        <p className="mt-2 text-sm text-tal-plum-soft">
          {completedFolders} of {totalFolders} folders complete · {remaining}{" "}
          left to go.
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onFinish}
          disabled={pending}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-black text-white text-sm font-medium hover:bg-tal-plum-dark disabled:opacity-50"
        >
          Take me to my dashboard →
        </button>
        <Link
          href="/records"
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-tal-line bg-white text-sm font-medium text-tal-plum hover:shadow-sm"
        >
          Start filling in Life Admin
        </Link>
      </div>
    </div>
  );
}
