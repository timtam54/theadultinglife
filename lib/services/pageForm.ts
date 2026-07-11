import {
  listQuestionsByGroup,
  listQuestionsBySubcategory,
} from "@/lib/db/questions";
import {
  listResponsesForUser,
  upsertResponses,
} from "@/lib/db/responses";
import type { PageQuestionRow } from "@/lib/db/types";

export interface PageFormData {
  questions: PageQuestionRow[];
  answers: Record<string, string | null>;
}

export async function loadPageFormByGroup(
  userId: string,
  group: string
): Promise<PageFormData> {
  const questions = await listQuestionsByGroup(group);
  const responses = await listResponsesForUser(
    userId,
    questions.map((q) => q.id)
  );
  const answers: Record<string, string | null> = {};
  for (const q of questions) answers[q.id] = null;
  for (const r of responses) answers[r.question_id] = r.value;
  return { questions, answers };
}

export async function loadPageFormBySubcategory(
  userId: string,
  subcategoryId: string,
  targetUserId?: string
): Promise<PageFormData> {
  const questions = await listQuestionsBySubcategory(subcategoryId);
  const responses = await listResponsesForUser(
    targetUserId ?? userId,
    questions.map((q) => q.id)
  );
  const answers: Record<string, string | null> = {};
  for (const q of questions) answers[q.id] = null;
  for (const r of responses) answers[r.question_id] = r.value;
  return { questions, answers };
}

export async function saveAnswers(
  userId: string,
  group: string,
  answers: Record<string, unknown>,
  targetUserId?: string
): Promise<void> {
  const questions = await listQuestionsByGroup(group);
  const valid = new Set(questions.map((q) => q.id));
  const rows: { question_id: string; value: string | null }[] = [];
  for (const [qid, raw] of Object.entries(answers)) {
    if (!valid.has(qid)) continue;
    if (raw === null || raw === undefined || raw === "") {
      rows.push({ question_id: qid, value: null });
    } else {
      rows.push({ question_id: qid, value: String(raw) });
    }
  }
  await upsertResponses(targetUserId ?? userId, rows);
}
