import { listSubcategoriesByTemplateGroup } from "@/lib/db/subcategories";
import { loadPageFormBySubcategory } from "@/lib/services/pageForm";
import { pomSlugFromSubcategoryId } from "@/lib/templates/peace-of-mind";
import { createServiceClient } from "@/lib/supabase/server";
import type {
  PageQuestionRow,
  RecordRow,
  SubcategoryRow,
} from "@/lib/db/types";

// -- New Planner (option 2: same data, two skins) ---------------------------
//
// For Organiser-fed Planner sections, we read the SAME rows from `records`
// that the Organiser page reads. No filter. One list, two views. Adding or
// editing from either page hits the same row.

// Counts "entries" per subcategory for the Planner index. An entry can be:
//   - a row in the `records` table (file-record folders), or
//   - a filled instance in a page-form folder (question_responses).
//
// Repeatable form folders (Attorney, Accountants, etc.) create one instance
// per repeater row; non-repeatable form folders share instance_id='default'
// so they contribute at most one entry when any answer is filled. Both are
// counted from question_responses via the subcategory_id on page_questions.
export async function countRecordsBySubcategory(
  userId: string,
  subcategoryIds: string[]
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (subcategoryIds.length === 0) return out;
  const supabase = createServiceClient();

  // 1) records table — one row = one entry.
  const { data: recordRows, error: recErr } = await supabase
    .from("records")
    .select("subcategory_id")
    .eq("user_id", userId)
    .in("subcategory_id", subcategoryIds);
  if (recErr) throw recErr;
  for (const row of (recordRows ?? []) as { subcategory_id: string | null }[]) {
    if (!row.subcategory_id) continue;
    out.set(row.subcategory_id, (out.get(row.subcategory_id) ?? 0) + 1);
  }

  // 2) form data — count distinct (subcategory_id, instance_id) pairs where
  //    the user has at least one non-empty answer. Two-step because
  //    question_responses doesn't carry subcategory_id directly.
  const { data: qRows, error: qErr } = await supabase
    .from("page_questions")
    .select("id, subcategory_id")
    .in("subcategory_id", subcategoryIds);
  if (qErr) throw qErr;
  const subcatByQuestion = new Map<string, string>();
  for (const q of (qRows ?? []) as { id: string; subcategory_id: string | null }[]) {
    if (q.subcategory_id) subcatByQuestion.set(q.id, q.subcategory_id);
  }
  const questionIds = Array.from(subcatByQuestion.keys());
  if (questionIds.length > 0) {
    const { data: respRows, error: respErr } = await supabase
      .from("question_responses")
      .select("question_id, instance_id, value")
      .eq("user_id", userId)
      .in("question_id", questionIds)
      .not("value", "is", null);
    if (respErr) throw respErr;
    // Distinct (subcategory, instance) pairs = "entries".
    const seen = new Map<string, Set<string>>();
    for (const r of (respRows ?? []) as {
      question_id: string;
      instance_id: string;
      value: string | null;
    }[]) {
      if (!r.value || r.value.trim().length === 0) continue;
      const sub = subcatByQuestion.get(r.question_id);
      if (!sub) continue;
      const set = seen.get(sub) ?? new Set<string>();
      set.add(r.instance_id ?? "default");
      seen.set(sub, set);
    }
    for (const [sub, set] of seen) {
      out.set(sub, (out.get(sub) ?? 0) + set.size);
    }
  }

  return out;
}

export async function listRecordsForSubcategory(
  userId: string,
  subcategoryId: string
): Promise<RecordRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("records")
    .select("*")
    .eq("user_id", userId)
    .eq("subcategory_id", subcategoryId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as RecordRow[]) ?? [];
}

// -- Legacy planner (old template_group='peace_of_mind' architecture) -------
//
// The rows the following code queries are being removed in migration 059.
// The preview/share/print pages that import `loadPlannerForUser` will
// return empty results after 059 runs — those views need rebuilding in a
// follow-up session against the new architecture.

export interface PlannerSectionInstance {
  instance_id: string;
  answers: Record<string, string | null>;
}

export interface PlannerSection {
  subcategoryId: string;
  slug: string | null;
  name: string;
  hint: string | null;
  repeatable: boolean;
  questions: PageQuestionRow[];
  // Non-repeatable sections use `answers`; repeatable sections use `instances`.
  answers: Record<string, string | null>;
  instances: PlannerSectionInstance[];
  filled: boolean;
}

export interface PlannerPayload {
  sections: PlannerSection[];
  filledCount: number;
  totalCount: number;
  nextSlug: string | null;
  nextName: string | null;
}

function isAnswerFilled(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function sectionIsFilled(
  answers: Record<string, string | null>,
  instances: PlannerSectionInstance[]
): boolean {
  if (instances.length > 0) return true;
  return Object.values(answers).some(isAnswerFilled);
}

function cleanName(name: string): string {
  return name.replace(/^TAL\s*[—-]\s*/, "");
}

// Loads every Peace of Mind Planner section (all 9) with the given user's
// answers hydrated. Used by the preview page, the print page, and the
// public share page.
export async function loadPlannerForUser(
  userId: string
): Promise<PlannerPayload> {
  const subs: SubcategoryRow[] =
    await listSubcategoriesByTemplateGroup("peace_of_mind");

  const perSection = await Promise.all(
    subs.map(async (s) => {
      const form = await loadPageFormBySubcategory(
        userId,
        s.id,
        userId,
        s.repeatable
      );
      const answers = form.answers ?? {};
      const instances = form.instances ?? [];
      const filled = sectionIsFilled(answers, instances);
      const section: PlannerSection = {
        subcategoryId: s.id,
        slug: pomSlugFromSubcategoryId(s.id),
        name: cleanName(s.name),
        hint: s.hint,
        repeatable: s.repeatable,
        questions: form.questions,
        answers,
        instances,
        filled,
      };
      return section;
    })
  );

  const filledCount = perSection.filter((s) => s.filled).length;
  const nextSection = perSection.find((s) => !s.filled) ?? null;

  return {
    sections: perSection,
    filledCount,
    totalCount: perSection.length,
    nextSlug: nextSection?.slug ?? null,
    nextName: nextSection?.name ?? null,
  };
}
