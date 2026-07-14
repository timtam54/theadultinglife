import {
  listQuestionsByGroup,
  listQuestionsBySubcategory,
} from "@/lib/db/questions";
import {
  deleteResponseInstance,
  listResponsesForUser,
  upsertResponses,
} from "@/lib/db/responses";
import type { PageQuestionRow } from "@/lib/db/types";

export interface PageFormData {
  questions: PageQuestionRow[];
  // Non-repeater: { [question_id]: value } — instance is always 'default'.
  answers: Record<string, string | null>;
  // Repeater: [instance_id, { [question_id]: value }] entries, sorted by
  // numeric instance_id ascending. Empty array if user hasn't added any yet.
  instances?: Array<{
    instance_id: string;
    answers: Record<string, string | null>;
  }>;
}

function shapeAnswers(
  questions: PageQuestionRow[],
  responses: {
    question_id: string;
    instance_id: string;
    value: string | null;
  }[]
): Record<string, string | null> {
  const answers: Record<string, string | null> = {};
  for (const q of questions) answers[q.id] = null;
  for (const r of responses) answers[r.question_id] = r.value;
  return answers;
}

function shapeInstances(
  questions: PageQuestionRow[],
  responses: {
    question_id: string;
    instance_id: string;
    value: string | null;
  }[]
): Array<{ instance_id: string; answers: Record<string, string | null> }> {
  const byInstance = new Map<
    string,
    { question_id: string; instance_id: string; value: string | null }[]
  >();
  for (const r of responses) {
    if (r.instance_id === "default") continue;
    const arr = byInstance.get(r.instance_id) ?? [];
    arr.push(r);
    byInstance.set(r.instance_id, arr);
  }
  return Array.from(byInstance.entries())
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([instance_id, rows]) => ({
      instance_id,
      answers: shapeAnswers(questions, rows),
    }));
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
  return { questions, answers: shapeAnswers(questions, responses) };
}

export async function loadPageFormBySubcategory(
  userId: string,
  subcategoryId: string,
  targetUserId?: string,
  repeatable = false
): Promise<PageFormData> {
  const questions = await listQuestionsBySubcategory(subcategoryId);
  const responses = await listResponsesForUser(
    targetUserId ?? userId,
    questions.map((q) => q.id)
  );
  if (repeatable) {
    return {
      questions,
      answers: {},
      instances: shapeInstances(questions, responses),
    };
  }
  return { questions, answers: shapeAnswers(questions, responses) };
}

export async function saveAnswers(
  userId: string,
  group: string,
  answers: Record<string, unknown>,
  targetUserId?: string,
  instanceId?: string
): Promise<void> {
  const questions = await listQuestionsByGroup(group);
  const valid = new Set(questions.map((q) => q.id));
  const rows: {
    question_id: string;
    value: string | null;
    instance_id?: string;
  }[] = [];
  for (const [qid, raw] of Object.entries(answers)) {
    if (!valid.has(qid)) continue;
    const value =
      raw === null || raw === undefined || raw === "" ? null : String(raw);
    rows.push({ question_id: qid, value, instance_id: instanceId });
  }
  await upsertResponses(targetUserId ?? userId, rows);
}

export async function deleteInstance(
  userId: string,
  group: string,
  instanceId: string,
  targetUserId?: string
): Promise<void> {
  if (instanceId === "default") throw new Error("cannot_delete_default");
  const questions = await listQuestionsByGroup(group);
  await deleteResponseInstance(
    targetUserId ?? userId,
    questions.map((q) => q.id),
    instanceId
  );
}
