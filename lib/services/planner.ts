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

export async function countRecordsBySubcategory(
  userId: string,
  subcategoryIds: string[]
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (subcategoryIds.length === 0) return out;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("records")
    .select("subcategory_id")
    .eq("user_id", userId)
    .in("subcategory_id", subcategoryIds);
  if (error) throw error;
  for (const row of (data ?? []) as { subcategory_id: string | null }[]) {
    if (!row.subcategory_id) continue;
    out.set(row.subcategory_id, (out.get(row.subcategory_id) ?? 0) + 1);
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
