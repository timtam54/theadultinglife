"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PageQuestionRow } from "@/lib/db/types";
import { PassportPreview } from "./PassportPreview";

const COL_SPAN: Record<number, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "md:col-span-4",
  5: "md:col-span-5",
  6: "md:col-span-6",
  7: "md:col-span-7",
  8: "md:col-span-8",
  9: "md:col-span-9",
  10: "md:col-span-10",
  11: "md:col-span-11",
  12: "md:col-span-12",
};
const COL_START: Record<number, string> = {
  1: "md:col-start-1",
  2: "md:col-start-2",
  3: "md:col-start-3",
  4: "md:col-start-4",
  5: "md:col-start-5",
  6: "md:col-start-6",
  7: "md:col-start-7",
  8: "md:col-start-8",
  9: "md:col-start-9",
  10: "md:col-start-10",
  11: "md:col-start-11",
  12: "md:col-start-12",
};

function cell(q: PageQuestionRow): string {
  const span = COL_SPAN[Math.min(12, Math.max(1, q.col_span))] ?? "md:col-span-12";
  const start = COL_START[Math.min(12, Math.max(1, q.col_start))] ?? "";
  return `col-span-12 ${span} ${start}`;
}

export function PageForm({
  group,
  questions,
  initialAnswers,
  showPassportPreview = false,
}: {
  group: string;
  questions: PageQuestionRow[];
  initialAnswers: Record<string, string | null>;
  showPassportPreview?: boolean;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string | null>>(
    initialAnswers
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  function set(qid: string, value: string | null) {
    setSaved(false);
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  async function uploadImage(qid: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/files", { method: "POST", body: form });
    if (!res.ok) throw new Error("upload_failed");
    const body = (await res.json()) as { file: { id: string } };
    set(qid, body.file.id);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch(`/api/page-form/${encodeURIComponent(group)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "save_failed");
      }
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "save_failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleImport(file: File) {
    // AI import placeholder — wire up to Anthropic vision later.
    setImporting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("group", group);
      const res = await fetch("/api/page-form/import", {
        method: "POST",
        body: form,
      });
      if (res.status === 501) {
        setError(
          "AI import isn't wired up yet. Fill the fields manually for now."
        );
        return;
      }
      if (!res.ok) throw new Error("import_failed");
      const body = (await res.json()) as {
        answers: Record<string, string>;
      };
      setAnswers((prev) => ({ ...prev, ...body.answers }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "import_failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-end gap-2 mb-4">
        {showPassportPreview && (
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            title="Passport view"
            className="h-9 w-9 rounded-xl border border-tal-line bg-white flex items-center justify-center text-tal-plum hover:bg-tal-cream-soft"
            aria-label="Passport view"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="12" cy="11" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6 17c1.5-2 4-3 6-3s4.5 1 6 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={() => importRef.current?.click()}
          disabled={importing}
          className="h-9 px-3 rounded-xl border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
        >
          {importing ? "Reading…" : "Import from PDF / image"}
        </button>
        <input
          ref={importRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImport(f);
            e.target.value = "";
          }}
        />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-12 gap-4">
          {questions.map((q) => (
            <div key={q.id} className={cell(q)}>
              <label className="block text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
                {q.label}
                {q.required && <span className="text-red-500">*</span>}
              </label>
              <QuestionInput
                question={q}
                value={answers[q.id] ?? ""}
                onChange={(v) => set(q.id, v)}
                onUploadImage={(f) => uploadImage(q.id, f)}
              />
              {q.hint && (
                <div className="text-xs text-tal-plum-soft mt-1">{q.hint}</div>
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 p-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="h-11 px-5 rounded-xl bg-tal-plum text-white font-medium hover:bg-tal-plum-dark disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {saved && (
            <span className="text-sm text-green-700">Saved.</span>
          )}
        </div>
      </form>

      {showPassportPreview && previewOpen && (
        <PassportPreview
          answers={answers}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
  onUploadImage,
}: {
  question: PageQuestionRow;
  value: string;
  onChange: (v: string) => void;
  onUploadImage: (f: File) => Promise<void>;
}) {
  const base =
    "w-full h-11 rounded-xl border border-tal-line px-3 bg-white text-sm";

  switch (question.question_type) {
    case "textarea":
      return (
        <textarea
          value={value}
          placeholder={question.placeholder ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-tal-line p-3 bg-white text-sm"
        />
      );
    case "int":
    case "number":
      return (
        <input
          type="number"
          step={question.question_type === "int" ? 1 : "any"}
          value={value}
          placeholder={question.placeholder ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      );
    case "date":
      return (
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      );
    case "datetime":
      return (
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      );
    case "dropdown":
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        >
          <option value="">—</option>
          {(question.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "image":
      return <ImageField fileId={value} onUpload={onUploadImage} />;
    case "text":
    default:
      return (
        <input
          type="text"
          value={value}
          placeholder={question.placeholder ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      );
  }
}

function ImageField({
  fileId,
  onUpload,
}: {
  fileId: string;
  onUpload: (f: File) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  async function loadPreview() {
    if (!fileId) return;
    const res = await fetch(`/api/files/${fileId}`);
    if (res.ok) {
      const { url } = (await res.json()) as { url: string };
      setPreviewUrl(url);
    }
  }

  return (
    <div className="rounded-xl border border-tal-line bg-white p-3 flex items-center gap-3">
      <button
        type="button"
        onClick={loadPreview}
        className="h-20 w-16 rounded-lg bg-tal-cream-soft border border-tal-line overflow-hidden flex items-center justify-center text-xs text-tal-plum-soft"
        aria-label="Preview image"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : fileId ? (
          "Tap to preview"
        ) : (
          "No image"
        )}
      </button>
      <div className="flex-1 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={busy}
          className="h-9 px-3 rounded-lg border border-tal-line text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60 self-start"
        >
          {busy ? "Uploading…" : fileId ? "Replace" : "Upload"}
        </button>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setBusy(true);
            try {
              await onUpload(f);
              setPreviewUrl(null);
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
    </div>
  );
}
