import { listSubcategoriesByTemplateGroup } from "@/lib/db/subcategories";
import { loadPageFormBySubcategory } from "@/lib/services/pageForm";
import { pomSlugFromSubcategoryId } from "@/lib/templates/peace-of-mind";
import type { PageQuestionRow, SubcategoryRow } from "@/lib/db/types";

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
