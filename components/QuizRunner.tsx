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
    return (
      <div className="rounded-2xl border border-tal-line bg-white p-6">
        <h2 className="font-display text-xl text-tal-plum mb-2">
          You scored {result.score} / {result.total}
        </h2>
        <p className="text-tal-plum-soft">
          {result.score === result.total
            ? "Perfect — nice work."
            : "Not bad. Have another read of the article and try again."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {questions.map((q, i) => (
        <fieldset
          key={q.id}
          className="rounded-2xl border border-tal-line bg-white p-4"
        >
          <legend className="font-medium mb-2">
            {i + 1}. {q.prompt}
          </legend>
          <div className="space-y-2">
            {q.options.map((o) => (
              <label
                key={o.id}
                className="flex items-center gap-3 rounded-xl border border-tal-line p-3 cursor-pointer hover:bg-tal-cream-soft"
              >
                <input
                  type="radio"
                  name={q.id}
                  value={o.id}
                  checked={answers[q.id] === o.id}
                  onChange={() =>
                    setAnswers((prev) => ({ ...prev, [q.id]: o.id }))
                  }
                  required
                />
                <span>{o.text}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <button
        type="submit"
        disabled={submitting}
        className="h-11 px-5 rounded-xl bg-tal-plum text-white font-medium hover:bg-tal-plum-dark disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
