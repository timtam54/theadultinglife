import { createServiceClient } from "@/lib/supabase/server";
import type { CategoryId, QuizQuestionRow, QuizRow } from "./types";

export async function listQuizzesForCategory(
  categoryId: CategoryId
): Promise<QuizRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("category_id", categoryId)
    .order("subcategory_id", { ascending: true });
  if (error) throw error;
  return (data as QuizRow[] | null) ?? [];
}

export async function getQuizWithQuestions(
  id: string
): Promise<{ quiz: QuizRow; questions: QuizQuestionRow[] } | null> {
  const supabase = createServiceClient();
  const [quizRes, qRes] = await Promise.all([
    supabase.from("quizzes").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", id)
      .order("sort_order", { ascending: true }),
  ]);
  if (quizRes.error) throw quizRes.error;
  if (qRes.error) throw qRes.error;
  const quiz = quizRes.data as QuizRow | null;
  if (!quiz) return null;
  return {
    quiz,
    questions: (qRes.data as QuizQuestionRow[] | null) ?? [],
  };
}

export interface InsertQuizInput {
  categoryId: CategoryId;
  subcategoryId: string | null;
  title: string;
  description: string;
  sourceArticleId: string | null;
  questions: Array<{
    prompt: string;
    options: { id: string; text: string }[];
    correctOptionId: string;
    explanation?: string | null;
  }>;
}

export async function insertQuizWithQuestions(
  input: InsertQuizInput
): Promise<string> {
  const supabase = createServiceClient();
  const { data: quiz, error: quizErr } = await supabase
    .from("quizzes")
    .insert({
      category_id: input.categoryId,
      subcategory_id: input.subcategoryId,
      title: input.title,
      description: input.description,
      source_article_id: input.sourceArticleId,
    })
    .select("id")
    .single();
  if (quizErr || !quiz) throw quizErr ?? new Error("quiz insert failed");
  const quizId = (quiz as { id: string }).id;
  if (input.questions.length) {
    const rows = input.questions.map((q, i) => ({
      quiz_id: quizId,
      prompt: q.prompt,
      options: q.options,
      correct_option_id: q.correctOptionId,
      explanation: q.explanation ?? null,
      sort_order: i,
    }));
    const { error: qErr } = await supabase.from("quiz_questions").insert(rows);
    if (qErr) throw qErr;
  }
  return quizId;
}
