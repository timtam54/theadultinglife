"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CategoryId, RecordField } from "@/lib/db/types";
import { readScanPrefill, type ScanPrefill } from "@/lib/scan-prefill";
import { ScanSourcePreview } from "@/components/ScanSourcePreview";
import { SmartTextarea } from "@/components/SmartTextarea";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { AiConsentGate } from "@/components/AiConsentGate";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { useAiConsent } from "@/hooks/useAiConsent";

interface Props {
  categoryId: CategoryId;
  subcategoryId?: string | null;
  mode: "create" | "edit";
  recordId?: string;
  initial?: {
    title: string;
    fields?: RecordField[]; // legacy: no longer stored, kept for callers
    expiryDate: string | null;
    notes: string | null;
    subcategoryId?: string | null;
    tags?: string[];
  };
  suggestedTags?: string[];
  enableScan?: boolean;
  isAdmin?: boolean;
  // Optional overrides for the post-save/delete flow. When provided, the
  // editor calls the callback instead of navigating to the subcategory
  // page. Useful when the editor is embedded (Planner, modal, wizard) and
  // the host wants to close the sub-view rather than push a new route.
  onSaved?: () => void;
  onDeleted?: () => void;
  onCancel?: () => void;
}

interface ScanResponse {
  scan: {
    title: string;
    fields: RecordField[];
    expiryDate: string | null;
    notes: string | null;
    confidence: "high" | "medium" | "low";
  };
}

export function RecordEditor({
  categoryId,
  subcategoryId,
  mode,
  recordId,
  initial,
  suggestedTags = [],
  enableScan = false,
  isAdmin = false,
  onSaved,
  onDeleted,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onCancel,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromScan = searchParams?.get("fromScan") === "1";

  const prefill = useMemo<ScanPrefill | null>(
    () => (mode === "create" && fromScan ? readScanPrefill() : null),
    [fromScan, mode]
  );

  const [title, setTitle] = useState(prefill?.title ?? initial?.title ?? "");
  const [expiryDate, setExpiryDate] = useState(
    prefill?.expiryDate ?? initial?.expiryDate ?? ""
  );
  const [notes, setNotes] = useState(prefill?.notes ?? initial?.notes ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  // Records-mode fields storage is removed. Kept as a no-op stub so the
  // rest of this component compiles; the fields UI section renders nothing.
  const [fields, setFields] = useState<RecordField[]>(
    prefill?.fields?.length
      ? prefill.fields
      : initial?.fields?.length
        ? initial.fields
        : []
  );
  const [sourceFileId] = useState<string | null>(prefill?.sourceFileId ?? null);
  const [sourceMime] = useState<string | null>(prefill?.sourceMime ?? null);
  const [sourceFilename] = useState<string | null>(
    prefill?.sourceFilename ?? null
  );
  const prefillBanner = prefill
    ? prefill.confidence === "low"
      ? "AI-filled with low confidence — please double-check every field before saving."
      : prefill.confidence === "medium"
        ? "AI-filled — please review the fields before saving."
        : "AI-filled — review and save."
    : null;

  function addTag(raw: string) {
    const t = raw.trim().slice(0, 40);
    if (!t) return;
    setTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setTagDraft("");
  }
  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
  }
  const activeSubcategoryId = subcategoryId ?? initial?.subcategoryId ?? null;
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const [pristineSnapshot, setPristineSnapshot] = useState<string>(() =>
    JSON.stringify({ title, expiryDate, notes, tags, fields })
  );
  const currentSnapshot = JSON.stringify({
    title,
    expiryDate,
    notes,
    tags,
    fields,
  });
  const isDirty = currentSnapshot !== pristineSnapshot;
  const { markSaved } = useUnsavedChangesGuard(isDirty);
  const consent = useAiConsent();

  async function handleScanFile(file: File) {
    if (!subcategoryId) {
      setError("Pick a folder before scanning.");
      return;
    }
    const ok = await consent.requestConsent("scan-document");
    if (!ok) return;
    setError(null);
    setScanNotice(null);
    setScanning(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("subcategoryId", subcategoryId);
      const res = await fetch("/api/scan-document", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(
          j.error === "unsupported_mime_type"
            ? "That file type isn't supported. Try JPEG, PNG, WebP or PDF."
            : j.error === "file_too_large"
              ? "That file is too large (max 20MB)."
              : "Scan failed. Try again or enter details manually."
        );
        return;
      }
      const { scan } = (await res.json()) as ScanResponse;
      setTitle(scan.title || title);
      if (scan.fields.length) setFields(scan.fields);
      if (scan.expiryDate) setExpiryDate(scan.expiryDate);
      if (scan.notes) setNotes(scan.notes);
      if (scan.confidence === "low") {
        setScanNotice("Low confidence — please double-check the fields.");
      } else if (scan.confidence === "medium") {
        setScanNotice("Review the fields before saving.");
      } else {
        setScanNotice("Scanned — review and save.");
      }
    } catch {
      setError("Scan failed. Try again or enter details manually.");
    } finally {
      setScanning(false);
    }
  }

  function updateField(idx: number, patch: Partial<RecordField>) {
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        categoryId,
        subcategoryId: activeSubcategoryId,
        title,
        expiryDate: expiryDate || null,
        notes: notes || null,
        tags,
        ...(mode === "create" && sourceFileId
          ? { sourceFileId }
          : {}),
      };
      const res = await fetch(
        mode === "create" ? "/api/records" : `/api/records/${recordId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Something went wrong");
        return;
      }
      setPristineSnapshot(currentSnapshot);
      markSaved();
      if (onSaved) {
        onSaved();
        router.refresh();
      } else {
        const dest = activeSubcategoryId
          ? `/records/${categoryId}/${encodeURIComponent(activeSubcategoryId)}`
          : `/records/${categoryId}`;
        router.push(dest);
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (mode !== "edit" || !recordId) return;
    if (!confirm("Delete this record?")) return;
    setSubmitting(true);
    try {
      await fetch(`/api/records/${recordId}`, { method: "DELETE" });
      setPristineSnapshot(currentSnapshot);
      markSaved();
      if (onDeleted) {
        onDeleted();
        router.refresh();
      } else {
        const dest = activeSubcategoryId
          ? `/records/${categoryId}/${encodeURIComponent(activeSubcategoryId)}`
          : `/records/${categoryId}`;
        router.push(dest);
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  const showPreview = mode === "create" && !!sourceFileId;

  return (
    <form
      onSubmit={handleSubmit}
      className={
        showPreview
          ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start"
          : "space-y-6 max-w-2xl"
      }
    >
      {showPreview && sourceFileId && (
        <div className="lg:sticky lg:top-4">
          <ScanSourcePreview
            fileId={sourceFileId}
            mime={sourceMime}
            filename={sourceFilename}
          />
        </div>
      )}
      <div className={showPreview ? "space-y-6 min-w-0" : "contents"}>
      {prefillBanner && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 flex items-start gap-2">
          <span aria-hidden>✨</span>
          <div>{prefillBanner}</div>
        </div>
      )}
      {enableScan && mode === "create" && (
        <div className="rounded-2xl border border-tal-line bg-tal-cream-soft p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-display text-tal-plum">
                Scan a document
              </div>
              <p className="text-sm text-tal-plum-soft">
                Upload a photo or PDF of your document and we&apos;ll fill
                this in for you.
              </p>
            </div>
            <button
              type="button"
              onClick={() => scanInputRef.current?.click()}
              disabled={scanning}
              className="h-11 px-5 rounded-xl bg-black text-white font-medium disabled:opacity-60"
            >
              {scanning ? "Scanning…" : "Scan document"}
            </button>
            <input
              ref={scanInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleScanFile(f);
                e.target.value = "";
              }}
            />
          </div>
          {scanNotice && (
            <div className="mt-3 text-sm text-tal-plum">{scanNotice}</div>
          )}
          {scanNotice && <AiDisclaimer />}
        </div>
      )}

      <div>
        <label className="block text-sm mb-1">Title</label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full h-11 rounded-xl border border-tal-line px-3 bg-white"
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Expiry date (optional)</label>
        <input
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          className="h-11 rounded-xl border border-tal-line px-3 bg-white"
        />
      </div>

      <div className="space-y-4">
        {fields.map((f, i) => (
          <div key={f.key}>
            <label
              htmlFor={`field-${f.key}`}
              className="block text-sm mb-1"
            >
              {f.label || "Field"}
            </label>
            <input
              id={`field-${f.key}`}
              type={
                f.type === "date"
                  ? "date"
                  : f.type === "number"
                    ? "number"
                    : "text"
              }
              value={f.value}
              onChange={(e) => updateField(i, { value: e.target.value })}
              className="w-full h-11 rounded-xl border border-tal-line px-3 bg-white"
            />
          </div>
        ))}
      </div>

      <div>
        <label className="block text-sm mb-1">Tags (optional)</label>
        <div className="rounded-xl border border-tal-line bg-white p-2 flex flex-wrap gap-2">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-100 text-violet-800 text-xs font-medium"
            >
              {t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                aria-label={`Remove tag ${t}`}
                className="text-violet-600 hover:text-violet-900"
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag(tagDraft);
              } else if (e.key === "Backspace" && !tagDraft && tags.length) {
                removeTag(tags[tags.length - 1]);
              }
            }}
            onBlur={() => tagDraft && addTag(tagDraft)}
            placeholder={tags.length ? "" : "e.g. wallet, glovebox, safe"}
            className="flex-1 min-w-[120px] h-8 px-2 outline-none text-sm bg-transparent"
          />
        </div>
        {suggestedTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            <span className="text-tal-plum-soft">Existing:</span>
            {suggestedTags
              .filter((t) => !tags.includes(t))
              .slice(0, 12)
              .map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => addTag(t)}
                  className="px-2 py-0.5 rounded-full border border-tal-line text-tal-plum hover:bg-tal-cream-soft"
                >
                  + {t}
                </button>
              ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm mb-1">Notes (optional)</label>
        <SmartTextarea
          value={notes}
          onChange={setNotes}
          rows={3}
          ariaLabel="Notes"
        />
      </div>

      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="h-11 px-5 rounded-xl bg-black text-white font-medium disabled:opacity-60"
        >
          {mode === "create" ? "Create" : "Save changes"}
        </button>
        {mode === "edit" && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="h-11 px-5 rounded-xl border border-red-200 text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
        )}
        {isAdmin && activeSubcategoryId && (
          <a
            href={`/admin/folder-forms/${encodeURIComponent(activeSubcategoryId)}`}
            className="ml-auto h-11 px-4 rounded-xl border border-tal-line text-tal-plum hover:bg-tal-cream-soft flex items-center gap-1.5 text-sm"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M4 20h4l10-10-4-4L4 16v4z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M14 6l4 4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            Edit form
          </a>
        )}
      </div>
      </div>
      {consent.pendingKind && (
        <AiConsentGate
          kind={consent.pendingKind}
          onGranted={consent.onGranted}
          onCancel={consent.onCancel}
        />
      )}
    </form>
  );
}
