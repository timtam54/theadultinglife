import type { PlannerPayload, PlannerSection } from "@/lib/services/planner";

// Renders a full read-only Peace of Mind Planner. Used by:
//   • /templates/peace-of-mind-planner/preview  (owner preview)
//   • /planner                                  (print layout)
//   • /share/planner/[token]                    (public secure share)
//
// Empty sections are shown with a muted "Not filled in yet" line so
// the recipient sees the full outline, not just partial data.
export function PlannerReadOnlyView({
  payload,
  ownerName,
  compact = false,
}: {
  payload: PlannerPayload;
  ownerName?: string | null;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "space-y-6 text-sm"
          : "space-y-8"
      }
    >
      <header>
        <h1 className="font-display text-2xl sm:text-3xl text-tal-plum leading-tight">
          Peace of Mind Planner
          {ownerName ? <span className="text-tal-plum-soft"> — {ownerName}</span> : null}
        </h1>
        <p className="text-sm text-tal-plum-soft mt-1">
          {payload.filledCount} of {payload.totalCount} sections filled in.
        </p>
      </header>

      {payload.sections.map((s) => (
        <SectionBlock key={s.subcategoryId} section={s} />
      ))}
    </div>
  );
}

function SectionBlock({ section }: { section: PlannerSection }) {
  return (
    <section className="rounded-2xl border border-tal-line bg-white p-5">
      <div className="mb-3">
        <h2 className="font-display text-lg text-tal-plum">{section.name}</h2>
        {section.hint && (
          <p className="text-xs italic text-tal-plum-soft mt-0.5">
            {section.hint}
          </p>
        )}
      </div>

      {!section.filled ? (
        <p className="text-sm text-tal-plum-soft italic">Not filled in yet.</p>
      ) : section.repeatable ? (
        <ul className="space-y-4">
          {section.instances.map((inst, idx) => (
            <li
              key={inst.instance_id}
              className="rounded-xl border border-tal-line p-3"
            >
              <div className="text-xs uppercase tracking-wide text-tal-plum-soft mb-2">
                Entry {idx + 1}
              </div>
              <AnswerGrid
                questions={section.questions}
                answers={inst.answers}
              />
            </li>
          ))}
        </ul>
      ) : (
        <AnswerGrid
          questions={section.questions}
          answers={section.answers}
        />
      )}
    </section>
  );
}

function AnswerGrid({
  questions,
  answers,
}: {
  questions: PlannerSection["questions"];
  answers: Record<string, string | null>;
}) {
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {questions.map((q) => {
        const raw = answers[q.id];
        const value =
          typeof raw === "string" && raw.trim().length > 0 ? raw : null;
        return (
          <div key={q.id} className="min-w-0">
            <dt className="text-xs uppercase tracking-wide text-tal-plum-soft">
              {q.label}
            </dt>
            <dd
              className={
                "text-sm mt-0.5 whitespace-pre-wrap " +
                (value ? "text-tal-plum" : "text-tal-plum-soft/60 italic")
              }
            >
              {value ?? "—"}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
