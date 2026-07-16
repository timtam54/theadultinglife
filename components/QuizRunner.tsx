"use client";

import { useState } from "react";

interface Question {
  id: string;
  prompt: string;
  options: { id: string; text: string }[];
}

export function QuizRunner({
  quizId,
  questions,
}: {
  quizId: string;
  questions: Question[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quizzes/${quizId}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (res.ok) {
        const json = (await res.json()) as { score: number; total: number };
        setResult(json);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const perfect = result.score === result.total;
    const pct = Math.round((result.score / result.total) * 100);
    return (
      <div
        className={
          "rounded-3xl border-2 p-8 text-center shadow-lg transition " +
          (perfect
            ? "border-tal-forest bg-gradient-to-br from-tal-forest to-tal-forest-dark text-white"
            : "border-tal-cream bg-gradient-to-br from-tal-cream-soft to-tal-cream")
        }
      >
        <div className="text-6xl mb-3" aria-hidden>
          {perfect ? "🎉" : "📚"}
        </div>
        <h2
          className={
            "font-display text-3xl mb-2 " +
            (perfect ? "text-white" : "text-tal-plum")
          }
        >
          {result.score} / {result.total}
        </h2>
        <div
          className={
            "text-lg font-medium mb-3 " +
            (perfect ? "text-white/90" : "text-tal-plum")
          }
        >
          {pct}%
        </div>
        <p
          className={
            "text-sm " + (perfect ? "text-white/80" : "text-tal-plum-soft")
          }
        >
          {perfect
            ? "Perfect — nice work."
            : "Not bad. Have another read of the article and try again."}
        </p>
      </div>
    );
  }

  const answered = Object.keys(answers).length;
  const progress = Math.round((answered / questions.length) * 100);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-white/90 backdrop-blur rounded-2xl border border-tal-line shadow-sm">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm font-medium text-tal-plum">
            {answered} of {questions.length} answered
          </span>
          <span className="text-sm text-tal-plum-soft tabular-nums">
            {progress}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-tal-cream overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-tal-forest to-tal-plum transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {questions.map((q, i) => {
        const answered = answers[q.id] != null;
        return (
          <fieldset
            key={q.id}
            className={
              "rounded-2xl border-2 p-5 transition-all " +
              (answered
                ? "border-tal-forest/40 bg-white"
                : "border-tal-line bg-white")
            }
          >
            <legend className="px-3 py-1 -ml-1 rounded-full bg-tal-plum text-white text-xs font-medium tracking-wider uppercase">
              Question {i + 1}
            </legend>
            <p className="font-medium text-tal-plum mt-3 mb-4 text-lg">
              {q.prompt}
            </p>
            <div className="space-y-2">
              {q.options.map((o, idx) => {
                const letter = String.fromCharCode(65 + idx); // A, B, C, D
                const selected = answers[q.id] === o.id;
                return (
                  <label
                    key={o.id}
                    className={
                      "flex items-center gap-3 rounded-xl border-2 p-3 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md " +
                      (selected
                        ? "border-tal-forest bg-tal-forest/5"
                        : "border-tal-line bg-white hover:bg-tal-cream-soft hover:border-tal-cream")
                    }
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={o.id}
                      checked={selected}
                      onChange={() =>
                        setAnswers((prev) => ({ ...prev, [q.id]: o.id }))
                      }
                      required
                      className="sr-only"
                    />
                    <span
                      className={
                        "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold shrink-0 transition-colors " +
                        (selected
                          ? "bg-tal-forest text-white"
                          : "bg-tal-cream-soft text-tal-plum-soft")
                      }
                      aria-hidden
                    >
                      {letter}
                    </span>
                    <span
                      className={
                        selected ? "text-tal-plum font-medium" : "text-tal-plum"
                      }
                    >
                      {o.text}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
      <button
        type="submit"
        disabled={submitting || answered < questions.length}
        className="w-full h-12 rounded-xl bg-gradient-to-r from-tal-plum to-tal-plum-dark text-white font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
      >
        {submitting
          ? "Submitting…"
          : answered < questions.length
          ? `Answer all questions to submit (${questions.length - answered} left)`
          : "Submit answers"}
      </button>
    </form>
  );
}
