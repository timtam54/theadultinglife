"use client";

import { useState } from "react";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { CoachChat } from "@/components/CoachChat";
import { FORM_COACHES } from "@/lib/form-coaches";
import type { PageQuestionRow } from "@/lib/db/types";

/*
 * "Plan it with AI" for folder forms listed in lib/form-coaches.ts. A chat
 * that asks the questions the form needs, then drafts the answers. The draft
 * is shown for review and handed to the form as a new, unsaved entry — the
 * person still checks it and presses Save.
 */


export function FormCoachButton({
  subcategoryId,
  questions,
  targetUserId,
  onApply,
  className = "",
}: {
  subcategoryId: string;
  questions: PageQuestionRow[];
  targetUserId?: string;
  /** Receives the drafted answers, keyed by question id. */
  onApply: (answers: Record<string, string>) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const coach = FORM_COACHES[subcategoryId];
  if (!coach) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          "inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-black text-white text-sm font-medium " +
          className
        }
      >
        <span aria-hidden>✨</span>
        {coach.buttonLabel}
      </button>
      {open && (
        <FormCoachDialog
          subcategoryId={subcategoryId}
          questions={questions}
          targetUserId={targetUserId}
          onClose={() => setOpen(false)}
          onApply={(answers) => {
            setOpen(false);
            onApply(answers);
          }}
        />
      )}
    </>
  );
}

function FormCoachDialog({
  subcategoryId,
  questions,
  targetUserId,
  onClose,
  onApply,
}: {
  subcategoryId: string;
  questions: PageQuestionRow[];
  targetUserId?: string;
  onClose: () => void;
  onApply: (answers: Record<string, string>) => void;
}) {
  const coach = FORM_COACHES[subcategoryId];
  const labelFor = (q: PageQuestionRow, v: string) =>
    Array.isArray(q.options) ? (q.options.find((o) => o.value === v)?.label ?? v) : v;

  return (
    <CoachChat<Record<string, string>>
      title={coach.title}
      opening={coach.opening}
      consentKind="form-coach"
      applyLabel="Add to my form"
      onApply={onApply}
      onClose={onClose}
      requestTurn={async (messages) => {
        const res = await fetch("/api/form-coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subcategoryId, userId: targetUserId, messages }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          reply?: string;
          answers?: Record<string, string> | null;
          message?: string;
        };
        if (!res.ok || !data.reply) {
          throw new Error(data.message ?? "The AI couldn’t reply just now — try again.");
        }
        return { reply: data.reply, result: data.answers ?? null };
      }}
      renderResult={(draft) => (
        <>
          {/* Shown in the form's own field order. */}
          <dl className="space-y-2">
            {questions
              .filter((q) => draft[q.id])
              .map((q) => (
                <div key={q.id}>
                  <dt className="text-[10px] uppercase tracking-widest text-tal-plum-soft">{q.label}</dt>
                  <dd className="text-sm text-tal-plum whitespace-pre-line">{labelFor(q, draft[q.id])}</dd>
                </div>
              ))}
          </dl>
          <AiDisclaimer variant="inline" />
        </>
      )}
    />
  );
}
