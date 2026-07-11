"use client";

import { useEffect, useRef, useState } from "react";
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

type UploadIntent = "ai" | "document" | "portrait";

const IMAGE_EXT = /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i;

function isImageFile(f: File): boolean {
  if (f.type.startsWith("image/")) return true;
  return IMAGE_EXT.test(f.name);
}

export function PageForm({
  group,
  questions,
  initialAnswers,
  subcategoryId,
  targetUserId,
  showPassportPreview = false,
  pdfHref,
}: {
  group: string;
  questions: PageQuestionRow[];
  initialAnswers: Record<string, string | null>;
  subcategoryId: string;
  targetUserId?: string;
  showPassportPreview?: boolean;
  pdfHref?: string;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string | null>>(
    initialAnswers
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [busyIntent, setBusyIntent] = useState<UploadIntent | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAnswers(initialAnswers);
    setSaved(false);
  }, [initialAnswers]);

  const portraitQuestion = questions.find((q) => q.question_type === "image");
  const pendingIsImage = pendingFile ? isImageFile(pendingFile) : false;

  function set(qid: string, value: string | null) {
    setSaved(false);
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  async function saveAsDocument(file: File) {
    const form = new FormData();
    form.append("file", file);
    form.append("subcategoryId", subcategoryId);
    const res = await fetch("/api/files", { method: "POST", body: form });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? "upload_failed");
    }
    router.refresh();
  }

  async function useAsPortrait(file: File) {
    if (!portraitQuestion) throw new Error("no_portrait_field");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/files", { method: "POST", body: form });
    if (!res.ok) throw new Error("upload_failed");
    const body = (await res.json()) as { file: { id: string } };
    set(portraitQuestion.id, body.file.id);
  }

  async function readWithAI(file: File) {
    const form = new FormData();
    form.append("file", file);
    form.append("group", group);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);
    let res: Response;
    try {
      res = await fetch("/api/page-form/import", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
    } catch (e) {
      if (controller.signal.aborted) {
        throw new Error(
          "AI took too long to respond (90s). Try a smaller / clearer photo."
        );
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }
    if (res.status === 503) {
      throw new Error("AI is not configured on this server.");
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
    }
    const body = (await res.json()) as { answers: Record<string, string> };
    const count = Object.keys(body.answers).length;
    if (count === 0) {
      throw new Error(
        "AI didn't find anything readable in the image. Try a clearer photo."
      );
    }
    setAnswers((prev) => ({ ...prev, ...body.answers }));
    setSaved(false);
  }

  const [modalError, setModalError] = useState<string | null>(null);

  async function runIntent(intent: UploadIntent) {
    if (!pendingFile) return;
    setError(null);
    setModalError(null);
    setBusyIntent(intent);
    try {
      if (intent === "ai") await readWithAI(pendingFile);
      else if (intent === "document") await saveAsDocument(pendingFile);
      else if (intent === "portrait") await useAsPortrait(pendingFile);
      setPendingFile(null);
    } catch (e) {
      setModalError(e instanceof Error ? e.message : String(intent) + "_failed");
    } finally {
      setBusyIntent(null);
    }
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
        body: JSON.stringify({ answers, targetUserId }),
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

  return (
    <>
      <div className="flex items-center justify-end gap-2 mb-4">
        {showPassportPreview && (
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="h-9 px-3 rounded-xl border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft flex items-center gap-1.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="12" cy="11" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6 17c1.5-2 4-3 6-3s4.5 1 6 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Preview
          </button>
        )}
        {pdfHref && (
          <a
            href={pdfHref}
            target="_blank"
            rel="noreferrer"
            className="btn h-9 px-3 rounded-xl border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft flex items-center gap-1.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 3v12m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Download PDF
          </a>
        )}
        <button
          type="button"
          onClick={() => uploadRef.current?.click()}
          className="h-9 px-3 rounded-xl bg-tal-plum text-white text-sm font-medium hover:bg-tal-plum-dark"
        >
          Upload
        </button>
        <input
          ref={uploadRef}
          type="file"
          accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setPendingFile(f);
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

      {pendingFile && (
        <UploadChoiceModal
          filename={pendingFile.name}
          canUseAsPortrait={Boolean(portraitQuestion) && pendingIsImage}
          canReadWithAI={pendingIsImage}
          busyIntent={busyIntent}
          errorMessage={modalError}
          onChoose={runIntent}
          onCancel={() => {
            if (busyIntent) return;
            setPendingFile(null);
            setModalError(null);
          }}
        />
      )}
    </>
  );
}

function UploadChoiceModal({
  filename,
  canUseAsPortrait,
  canReadWithAI,
  busyIntent,
  errorMessage,
  onChoose,
  onCancel,
}: {
  filename: string;
  canUseAsPortrait: boolean;
  canReadWithAI: boolean;
  busyIntent: UploadIntent | null;
  errorMessage: string | null;
  onChoose: (intent: UploadIntent) => void;
  onCancel: () => void;
}) {
  const busy = busyIntent !== null;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg text-tal-plum mb-1">
          What would you like to do with this file?
        </h3>
        <div className="text-xs text-tal-plum-soft mb-5 truncate">
          {filename}
        </div>

        <div className="space-y-2">
          {canReadWithAI && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onChoose("ai")}
              className="w-full text-left rounded-xl border border-tal-line bg-white p-4 hover:bg-tal-cream-soft disabled:opacity-60"
            >
              <div className="font-medium text-tal-plum">
                {busyIntent === "ai" ? "Reading…" : "Read it with AI"}
              </div>
              <div className="text-xs text-tal-plum-soft mt-0.5">
                Fill in the form fields from the document automatically.
              </div>
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => onChoose("document")}
            className="w-full text-left rounded-xl border border-tal-line bg-white p-4 hover:bg-tal-cream-soft disabled:opacity-60"
          >
            <div className="font-medium text-tal-plum">
              {busyIntent === "document" ? "Uploading…" : "Save as a document"}
            </div>
            <div className="text-xs text-tal-plum-soft mt-0.5">
              Store it in this folder to download later.
            </div>
          </button>
          {canUseAsPortrait && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onChoose("portrait")}
              className="w-full text-left rounded-xl border border-tal-line bg-white p-4 hover:bg-tal-cream-soft disabled:opacity-60"
            >
              <div className="font-medium text-tal-plum">
                {busyIntent === "portrait"
                  ? "Uploading…"
                  : "Use as portrait photo"}
              </div>
              <div className="text-xs text-tal-plum-soft mt-0.5">
                Attach it to the portrait field on this form.
              </div>
            </button>
          )}
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">
            {errorMessage}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="h-9 px-3 rounded-xl text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
          >
            {errorMessage ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: PageQuestionRow;
  value: string;
  onChange: (v: string) => void;
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
      return <ImagePreview fileId={value} />;
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

function ImagePreview({ fileId }: { fileId: string }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function loadPreview() {
    if (!fileId) return;
    const res = await fetch(`/api/files/${fileId}`);
    if (res.ok) {
      const { url } = (await res.json()) as { url: string };
      setPreviewUrl(url);
    }
  }

  return (
    <div className="rounded-xl border border-tal-line bg-white p-3">
      <button
        type="button"
        onClick={loadPreview}
        className="no-hover-fx h-20 w-16 rounded-lg bg-tal-cream-soft border border-tal-line overflow-hidden flex items-center justify-center text-xs text-tal-plum-soft"
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
      <div className="text-xs text-tal-plum-soft mt-2">
        Use <span className="font-medium">Upload</span> above to set or replace.
      </div>
    </div>
  );
}
