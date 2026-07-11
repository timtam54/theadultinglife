import { createServiceClient } from "@/lib/supabase/server";
import type { CategoryId, SubcategoryScope } from "@/lib/db/types";
import { CATEGORY_LABELS } from "@/lib/db/types";

export interface InventoryRow {
  categoryId: CategoryId;
  categoryLabel: string;
  parentPath: string;
  subcategoryId: string;
  name: string;
  hint: string | null;
  scope: SubcategoryScope;
  hasForm: boolean;
  requiredCount: number;
  totalQuestionCount: number;
  sortOrder: number;
}

export async function loadScopeInventory(): Promise<InventoryRow[]> {
  const supabase = createServiceClient();

  const [subsResult, questionsResult] = await Promise.all([
    supabase
      .from("subcategories")
      .select("id, category_id, name, hint, scope, sort_order")
      .order("category_id", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase.from("page_questions").select("subcategory_id, required"),
  ]);
  if (subsResult.error) throw subsResult.error;
  if (questionsResult.error) throw questionsResult.error;

  const subs = (subsResult.data ?? []) as {
    id: string;
    category_id: CategoryId;
    name: string;
    hint: string | null;
    scope: SubcategoryScope;
    sort_order: number;
  }[];

  const questions = (questionsResult.data ?? []) as {
    subcategory_id: string | null;
    required: boolean;
  }[];

  const totalBySub = new Map<string, number>();
  const requiredBySub = new Map<string, number>();
  for (const q of questions) {
    if (!q.subcategory_id) continue;
    totalBySub.set(q.subcategory_id, (totalBySub.get(q.subcategory_id) ?? 0) + 1);
    if (q.required) {
      requiredBySub.set(
        q.subcategory_id,
        (requiredBySub.get(q.subcategory_id) ?? 0) + 1
      );
    }
  }

  return subs.map((s) => ({
    categoryId: s.category_id,
    categoryLabel: CATEGORY_LABELS[s.category_id] ?? s.category_id,
    parentPath: `Life Admin / ${CATEGORY_LABELS[s.category_id] ?? s.category_id}`,
    subcategoryId: s.id,
    name: s.name,
    hint: s.hint,
    scope: s.scope,
    hasForm: (totalBySub.get(s.id) ?? 0) > 0,
    requiredCount: requiredBySub.get(s.id) ?? 0,
    totalQuestionCount: totalBySub.get(s.id) ?? 0,
    sortOrder: s.sort_order,
  }));
}
