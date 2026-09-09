import {
  listQuestionsByGroup,
  listQuestionsBySubcategory,
} from "@/lib/db/questions";
import {
  deleteResponseInstance,
  listResponsesForUser,
  upsertResponses,
} from "@/lib/db/responses";
import { findUserById } from "@/lib/db/users";
import type {
  MirrorableUserAttr,
  PageQuestionRow,
  UserRow,
} from "@/lib/db/types";

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
  // For any question that mirrors a user-profile attribute (mirrors_user_attr
  // set), the current value of that attribute on the target user. Client
  // uses this to prefill empty fields and to detect edits that should prompt
  // "Update your profile too?".
  mirroredPrefills?: Record<string, string | null>;
}

/** Load the mirrored user-profile values for a set of questions. Returns
 *  `{ question_id → user-attr-value }` for every question whose
 *  mirrors_user_attr is set on the target user. */
async function buildMirroredPrefills(
  targetUserId: string,
  questions: PageQuestionRow[]
): Promise<Record<string, string | null>> {
  const wanted = questions.filter((q) => q.mirrors_user_attr);
  if (wanted.length === 0) return {};
  let user: UserRow | null = null;
  try {
    user = await findUserById(targetUserId);
  } catch {
    return {};
  }
  if (!user) return {};
  const out: Record<string, string | null> = {};
  for (const q of wanted) {
    const attr = q.mirrors_user_attr as MirrorableUserAttr;
    const val = (user as unknown as Record<string, unknown>)[attr];
    out[q.id] = typeof val === "string" ? val : val == null ? null : String(val);
  }
  return out;
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
  const mirroredPrefills = await buildMirroredPrefills(userId, questions);
  return {
    questions,
    answers: shapeAnswers(questions, responses),
    mirroredPrefills,
  };
}

export async function loadPageFormBySubcategory(
  userId: string,
  subcategoryId: string,
  targetUserId?: string,
  repeatable = false
): Promise<PageFormData> {
  const questions = await listQuestionsBySubcategory(subcategoryId);
  const effectiveUserId = targetUserId ?? userId;
  const responses = await listResponsesForUser(
    effectiveUserId,
    questions.map((q) => q.id)
  );
  const mirroredPrefills = await buildMirroredPrefills(
    effectiveUserId,
    questions
  );
  if (repeatable) {
    return {
      questions,
      answers: {},
      instances: shapeInstances(questions, responses),
      mirroredPrefills,
    };
  }
  return {
    questions,
    answers: shapeAnswers(questions, responses),
    mirroredPrefills,
  };
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
