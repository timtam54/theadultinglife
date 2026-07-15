import type { CategoryId, QuestionType, SubcategoryRow } from "@/lib/db/types";
import { createTemplateSubcategory } from "@/lib/db/subcategories";
import { insertPageQuestions, type NewPageQuestion } from "@/lib/db/questions";

export type BuilderQuestion = {
  label: string;
  hint: string | null;
  question_type: QuestionType;
  options: { value: string; label: string }[] | null;
  required: boolean;
  placeholder: string | null;
};

export type BuilderInput = {
  name: string;
  categoryId: CategoryId;
  hint: string | null;
  visibility: "catalogue" | "user_private";
  createdBy: string;
  questions: BuilderQuestion[];
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function questionKey(label: string, i: number): string {
  const s = slugify(label);
  return s || `q${i + 1}`;
}

export async function saveTemplate(input: BuilderInput): Promise<SubcategoryRow> {
  const uid = crypto.randomUUID().slice(0, 8);
  const subcategoryId = `${input.categoryId}.custom_${slugify(input.name)}_${uid}`;
  const pageGroup = `custom_${uid}`;

  const sub = await createTemplateSubcategory({
    id: subcategoryId,
    name: input.name,
    categoryId: input.categoryId,
    visibility: input.visibility,
    createdBy: input.createdBy,
    hint: input.hint,
    sortOrder: 1000,
  });

  const rows: NewPageQuestion[] = input.questions.map((q, i) => ({
    id: `${pageGroup}.${questionKey(q.label, i)}`,
    page_group: pageGroup,
    subcategory_id: subcategoryId,
    label: q.label,
    hint: q.hint,
    question_type: q.question_type,
    options: q.options,
    col_start: 1,
    col_span: 12,
    row_order: i,
    required: q.required,
    placeholder: q.placeholder,
    created_by: input.createdBy,
  }));

  await insertPageQuestions(rows);
  return sub;
}
