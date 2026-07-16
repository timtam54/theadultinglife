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
      <div className="rounded-2xl bg-black text-white px-6 py-4 mb-6 shadow-md">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-medium tracking-wider uppercase shrink-0">
            Quiz
          </span>
          <h1 className="font-display text-2xl leading-tight">{quiz.title}</h1>
          {quiz.description && (
            <>
              <span className="text-white/40" aria-hidden>·</span>
              <span className="text-sm text-white/80">{quiz.description}</span>
            </>
          )}
          <span className="text-white/40" aria-hidden>·</span>
          <span className="text-sm text-white/70">
            {questions.length} question{questions.length === 1 ? "" : "s"}
          </span>
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
