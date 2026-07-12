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
        href={`/learn/${category}`}
        className="text-sm text-tal-plum-soft hover:text-tal-plum"
      >
        ← {CATEGORY_LABELS[category]}
      </Link>
      <h1 className="font-display text-3xl text-tal-plum mt-1 mb-2">
        {quiz.title}
      </h1>
      <p className="text-tal-plum-soft mb-6">{quiz.description}</p>
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
