import { NextRequest, NextResponse } from "next/server";
import { getEffectiveAdmin } from "@/lib/auth/session";
import {
  deletePageQuestionForm,
  replacePageQuestionsForForm,
  type NewPageQuestion,
} from "@/lib/db/questions";
import type { QuestionType } from "@/lib/db/types";
import { apiError } from "@/lib/api-error";

const QUESTION_TYPES: QuestionType[] = [
  "text",
  "textarea",
  "int",
  "number",
  "date",
  "datetime",
  "dropdown",
  "image",
  "address",
];

interface IncomingField {
  id?: string;
  label?: string;
  question_type?: string;
  hint?: string | null;
  placeholder?: string | null;
  required?: boolean;
  col_start?: number;
  col_span?: number;
  row_order?: number;
  options?: { value: string; label: string }[] | null;
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "field"
  );
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ subcategoryId: string; pageGroup: string }> }
) {
  try {
    const admin = await getEffectiveAdmin();
    if (!admin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { subcategoryId: subRaw, pageGroup: groupRaw } = await ctx.params;
    const subcategoryId = decodeURIComponent(subRaw);
    const pageGroup = decodeURIComponent(groupRaw);

    const body = (await request.json().catch(() => null)) as {
      fields?: IncomingField[];
    } | null;
    const fields = body?.fields;
    if (!Array.isArray(fields)) {
      return NextResponse.json(
        { error: "fields_required" },
        { status: 400 }
      );
    }

    const usedIds = new Set<string>();
    const rows: NewPageQuestion[] = [];
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      const label = (f.label ?? "").trim();
      if (!label) {
        return NextResponse.json(
          { error: "label_required", message: `Field ${i + 1} needs a label.` },
          { status: 400 }
        );
      }
      const type = f.question_type as QuestionType | undefined;
      if (!type || !QUESTION_TYPES.includes(type)) {
        return NextResponse.json(
          { error: "invalid_type", message: `Field "${label}" has invalid type.` },
          { status: 400 }
        );
      }
      let id = (f.id ?? "").trim();
      if (!id) {
        const base = `${pageGroup}.${slugify(label)}`;
        id = base;
        let suffix = 2;
        while (usedIds.has(id)) {
          id = `${base}_${suffix++}`;
        }
      }
      if (usedIds.has(id)) {
        return NextResponse.json(
          { error: "duplicate_id", message: `Duplicate field id: ${id}` },
          { status: 400 }
        );
      }
      usedIds.add(id);

      const options =
        type === "dropdown" && Array.isArray(f.options)
          ? f.options
              .map((o) => ({
                value: String(o.value ?? "").trim(),
                label: String(o.label ?? "").trim(),
              }))
              .filter((o) => o.value && o.label)
          : null;

      if (type === "dropdown" && (!options || options.length === 0)) {
        return NextResponse.json(
          {
            error: "options_required",
            message: `Dropdown "${label}" needs at least one option.`,
          },
          { status: 400 }
        );
      }

      rows.push({
        id,
        page_group: pageGroup,
        subcategory_id: subcategoryId,
        label,
        hint: f.hint?.trim() ? f.hint.trim() : null,
        question_type: type,
        options,
        col_start:
          Number.isFinite(f.col_start) && f.col_start! >= 1 && f.col_start! <= 12
            ? f.col_start!
            : 1,
        col_span:
          Number.isFinite(f.col_span) && f.col_span! >= 1 && f.col_span! <= 12
            ? f.col_span!
            : 12,
        row_order: Number.isFinite(f.row_order) ? f.row_order! : i,
        required: !!f.required,
        placeholder: f.placeholder?.trim() ? f.placeholder.trim() : null,
        created_by: admin.id,
      });
    }

    await replacePageQuestionsForForm(subcategoryId, pageGroup, rows);
    return NextResponse.json({ ok: true, count: rows.length });
  } catch (e) {
    return apiError("api:admin.folder-forms.PUT", e);
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ subcategoryId: string; pageGroup: string }> }
) {
  try {
    const admin = await getEffectiveAdmin();
    if (!admin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { subcategoryId: subRaw, pageGroup: groupRaw } = await ctx.params;
    await deletePageQuestionForm(
      decodeURIComponent(subRaw),
      decodeURIComponent(groupRaw)
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError("api:admin.folder-forms.DELETE", e);
  }
}
