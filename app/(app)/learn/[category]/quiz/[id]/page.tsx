import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isCategoryId } from "@/lib/services/records";
import { CATEGORY_LABELS } from "@/lib/db/types";
import { getQuizWithQuestions } from "@/lib/db/quizzes";
import { QuizRunner } from "@/components/QuizRunner";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}): Promise<Metadata> {
  const { category, id } = await params;
  if (!isCategoryId(category)) return {};
  const result = await getQuizWithQuestions(id);
  if (!result || result.quiz.category_id !== category) return {};
  return {
    title: `Quiz · ${result.quiz.title}`,
    description: result.quiz.description,
  };
}

export default async function QuizPage({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}) {
  const { category, id } = await params;
  if (!isCategoryId(category)) notFound();
  const result = await getQuizWithQuestions(id);
  if (!result || result.quiz.category_id !== category) notFound();
  const { quiz, questions } = result;

  return (
    <div className="max-w-2xl">
      <Link
        href={`/learn/${category}?expand=quizzes`}
        className="inline-flex items-center gap-1 text-sm text-tal-plum-soft hover:text-tal-plum mb-4"
      >
        ← {CATEGORY_LABELS[category]}
      </Link>
      <div className="rounded-3xl bg-gradient-to-br from-tal-forest to-tal-forest-dark text-white p-8 mb-6 shadow-lg">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-medium tracking-wider uppercase mb-3">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M9 11.5l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Quiz
        </div>
        <h1 className="font-display text-3xl mb-2 leading-tight">
          {quiz.title}
        </h1>
        {quiz.description && (
          <p className="text-white/80 text-sm">{quiz.description}</p>
        )}
        <div className="mt-4 text-xs text-white/70">
          {questions.length} question{questions.length === 1 ? "" : "s"}
        </div>
      </div>
      <QuizRunner
        quizId={quiz.id}
        questions={questions.map((q) => ({
          id: q.id,
          prompt: q.prompt,
          options: q.options,
        }))}
      />
    </div>
  );
}
