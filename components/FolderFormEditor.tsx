"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PageQuestionRow, QuestionType } from "@/lib/db/types";

const TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: "text", label: "Text (single line)" },
  { value: "textarea", label: "Textarea (multi-line)" },
  { value: "int", label: "Integer" },
  { value: "number", label: "Number (decimal)" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "Date & time" },
  { value: "dropdown", label: "Dropdown" },
  { value: "image", label: "Image" },
  { value: "address", label: "Address (autocomplete)" },
];

// Width choices in a 12-col grid. Full = 1 field/row, Half = 2, Third = 3, Quarter = 4.
const WIDTH_OPTIONS: { value: number; label: string }[] = [
  { value: 12, label: "Full width (1 per row)" },
  { value: 6, label: "Half (2 per row)" },
  { value: 4, label: "Third (3 per row)" },
  { value: 3, label: "Quarter (4 per row)" },
];

// Given the ordered list of widths (col_span each), pack them left-to-right
// into 12-col rows. A field that would overflow the remaining space wraps to
// the next row starting at col 1. Returns col_start + row index (1-based).
function computeLayout(spans: number[]): { colStart: number; row: number }[] {
  let cursor = 1;
  let row = 1;
  return spans.map((span) => {
    const width = Math.max(1, Math.min(12, span));
    if (cursor + width - 1 > 12) {
      cursor = 1;
      row += 1;
    }
    const colStart = cursor;
    cursor += width;
    if (cursor > 12) {
      cursor = 1;
      row += 1;
    }
    return { colStart, row };
  });
}

interface EditableField {
  id: string;
  label: string;
  question_type: QuestionType;
  hint: string;
  placeholder: string;
  required: boolean;
  col_start: number;
  col_span: number;
  options: { value: string; label: string }[];
  isNew: boolean;
}

interface Props {
  subcategoryId: string;
  subcategoryName: string;
  pageGroup: string;
  initialFields: PageQuestionRow[];
  answerCount: number;
  isNewForm: boolean;
}

function toEditable(q: PageQuestionRow): EditableField {
  return {
    id: q.id,
    label: q.label,
    question_type: q.question_type,
    hint: q.hint ?? "",
    placeholder: q.placeholder ?? "",
    required: q.required,
    col_start: q.col_start,
    col_span: q.col_span,
    options: q.options ?? [],
    isNew: false,
  };
}

export function FolderFormEditor({
  subcategoryId,
  subcategoryName,
  pageGroup,
  initialFields,
  answerCount,
  isNewForm,
}: Props) {
  const router = useRouter();
  const [fields, setFields] = useState<EditableField[]>(
    initialFields.map(toEditable)
  );
  const [saving, startSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState(0);

  function updateField(i: number, patch: Partial<EditableField>) {
    setFields((prev) =>
      prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f))
    );
  }

  function addField() {
    setFields((prev) => [
      ...prev,
      {
        id: "",
        label: "",
        question_type: "text",
        hint: "",
        placeholder: "",
        required: false,
        col_start: 1,
        col_span: 12,
        options: [],
        isNew: true,
      },
    ]);
  }

  function removeField(i: number) {
    setFields((prev) => prev.filter((_, idx) => idx !== i));
  }

  function move(i: number, dir: -1 | 1) {
    setFields((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function save() {
    setError(null);
    startSaving(async () => {
      const layout = computeLayout(fields.map((f) => f.col_span));
      const payload = {
        fields: fields.map((f, i) => ({
          id: f.isNew ? "" : f.id,
          label: f.label,
          question_type: f.question_type,
          hint: f.hint || null,
          placeholder: f.placeholder || null,
          required: f.required,
          col_start: layout[i].colStart,
          col_span: f.col_span,
          row_order: i,
          options: f.question_type === "dropdown" ? f.options : null,
        })),
      };
      const res = await fetch(
        `/api/admin/folder-forms/${encodeURIComponent(subcategoryId)}/${encodeURIComponent(pageGroup)}`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? body?.error ?? "Save failed.");
        return;
      }
      setSavedTick((t) => t + 1);
      router.refresh();
    });
  }

  async function deleteWholeForm() {
    const msg = `Delete this whole form?\n\nThis removes ${fields.length} field${fields.length === 1 ? "" : "s"}` +
      (answerCount > 0
        ? ` and ${answerCount} user answer${answerCount === 1 ? "" : "s"}`
        : "") +
      `.\n\nThe folder will revert to the free-form "Add Record / Upload Document" UI.`;
    if (!confirm(msg)) return;
    startDeleting(async () => {
      const res = await fetch(
        `/api/admin/folder-forms/${encodeURIComponent(subcategoryId)}/${encodeURIComponent(pageGroup)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? body?.error ?? "Delete failed.");
        return;
      }
      router.push("/admin/folder-forms");
      router.refresh();
    });
  }

  return (
    <div>
      {isNewForm && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Heads up:</strong> saving this form changes how{" "}
          <em>{subcategoryName}</em> looks for users — the free-form
          &ldquo;Add Record / Upload Document&rdquo; UI is replaced with these
          fields.
        </div>
      )}
      <div className="mb-4 rounded-lg border border-tal-line bg-tal-cream-soft p-3 text-xs text-tal-plum-soft">
        Fields flow left-to-right, top-to-bottom. Set each field&rsquo;s
        &ldquo;Width on the form&rdquo; to pack two, three or four fields onto
        the same row. Rows fill from left to right; a field that would overflow
        wraps to the next row.
      </div>

      <ol className="space-y-3">
        {fields.map((f, i) => {
          const layout = computeLayout(fields.map((x) => x.col_span));
          const spot = layout[i];
          const colEnd = spot.colStart + f.col_span - 1;
          const isFirstOnRow =
            i === 0 || layout[i - 1].row !== spot.row;
          return (
          <li
            key={i}
            className={
              "rounded-2xl border border-tal-line bg-white p-4 " +
              (isFirstOnRow ? "" : "border-t-2 border-t-tal-plum/10")
            }
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs text-tal-plum-soft font-mono">
                #{i + 1}
                <span className="ml-2 px-1.5 py-0.5 rounded bg-tal-cream-soft text-tal-plum-soft/80">
                  Row {spot.row} · cols {spot.colStart}–{colEnd}
                </span>
                {!f.isNew && (
                  <>
                    {" · "}
                    <span className="text-tal-plum-soft/70">{f.id}</span>
                  </>
                )}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="h-7 w-7 rounded-md border border-tal-line text-tal-plum disabled:opacity-30 hover:bg-tal-cream-soft"
                  aria-label="Move up"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === fields.length - 1}
                  className="h-7 w-7 rounded-md border border-tal-line text-tal-plum disabled:opacity-30 hover:bg-tal-cream-soft"
                  aria-label="Move down"
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeField(i)}
                  className="h-7 px-2 rounded-md border border-red-200 text-red-700 text-xs hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-xs text-tal-plum-soft">Label</span>
                <input
                  value={f.label}
                  onChange={(e) => updateField(i, { label: e.target.value })}
                  className="mt-1 w-full h-9 rounded-lg border border-tal-line px-2 text-sm"
                  placeholder="e.g. Tax File Number"
                />
              </label>
              <label className="block">
                <span className="text-xs text-tal-plum-soft">Type</span>
                <select
                  value={f.question_type}
                  onChange={(e) =>
                    updateField(i, {
                      question_type: e.target.value as QuestionType,
                    })
                  }
                  className="mt-1 w-full h-9 rounded-lg border border-tal-line px-2 text-sm bg-white"
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs text-tal-plum-soft">
                  Width on the form
                </span>
                <select
                  value={f.col_span}
                  onChange={(e) =>
                    updateField(i, { col_span: Number(e.target.value) })
                  }
                  className="mt-1 w-full h-9 rounded-lg border border-tal-line px-2 text-sm bg-white"
                >
                  {WIDTH_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs text-tal-plum-soft">Hint (optional)</span>
                <input
                  value={f.hint}
                  onChange={(e) => updateField(i, { hint: e.target.value })}
                  className="mt-1 w-full h-9 rounded-lg border border-tal-line px-2 text-sm"
                  placeholder="Shown as helper text below the field"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs text-tal-plum-soft">
                  Placeholder (optional)
                </span>
                <input
                  value={f.placeholder}
                  onChange={(e) =>
                    updateField(i, { placeholder: e.target.value })
                  }
                  className="mt-1 w-full h-9 rounded-lg border border-tal-line px-2 text-sm"
                />
              </label>
              <label className="flex items-center gap-2 md:col-span-2">
                <input
                  type="checkbox"
                  checked={f.required}
                  onChange={(e) =>
                    updateField(i, { required: e.target.checked })
                  }
                />
                <span className="text-sm text-tal-plum">Required</span>
              </label>

              {f.question_type === "dropdown" && (
                <div className="md:col-span-2">
                  <div className="text-xs text-tal-plum-soft mb-1">
                    Dropdown options
                  </div>
                  <div className="space-y-2">
                    {f.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          value={opt.value}
                          onChange={(e) => {
                            const next = [...f.options];
                            next[oi] = { ...next[oi], value: e.target.value };
                            updateField(i, { options: next });
                          }}
                          placeholder="value"
                          className="w-32 h-8 rounded-md border border-tal-line px-2 text-sm font-mono"
                        />
                        <input
                          value={opt.label}
                          onChange={(e) => {
                            const next = [...f.options];
                            next[oi] = { ...next[oi], label: e.target.value };
                            updateField(i, { options: next });
                          }}
                          placeholder="label shown to user"
                          className="flex-1 h-8 rounded-md border border-tal-line px-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = f.options.filter(
                              (_, idx) => idx !== oi
                            );
                            updateField(i, { options: next });
                          }}
                          className="h-8 px-2 rounded-md border border-red-200 text-red-700 text-xs hover:bg-red-50"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        updateField(i, {
                          options: [...f.options, { value: "", label: "" }],
                        })
                      }
                      className="text-xs text-tal-plum hover:underline"
                    >
                      + Add option
                    </button>
                  </div>
                </div>
              )}
            </div>
          </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={addField}
        className="mt-3 h-9 px-3 rounded-lg border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft"
      >
        + Add field
      </button>

      {error && (
        <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="h-10 px-4 rounded-lg bg-black text-white text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {savedTick > 0 && !saving && (
          <span className="text-sm text-emerald-700">Saved.</span>
        )}
        {!isNewForm && (
          <button
            type="button"
            onClick={deleteWholeForm}
            disabled={deleting}
            className="h-10 px-4 rounded-lg border border-red-200 text-red-700 text-sm font-medium disabled:opacity-50 hover:bg-red-50 ml-auto"
          >
            {deleting ? "Deleting…" : "Delete whole form"}
          </button>
        )}
      </div>
    </div>
  );
}
