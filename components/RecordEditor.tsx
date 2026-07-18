"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CategoryId, RecordField } from "@/lib/db/types";

interface Props {
  categoryId: CategoryId;
  subcategoryId?: string | null;
  mode: "create" | "edit";
  recordId?: string;
  initial?: {
    title: string;
    fields: RecordField[];
    expiryDate: string | null;
    notes: string | null;
    subcategoryId?: string | null;
    tags?: string[];
  };
  suggestedTags?: string[];
  enableScan?: boolean;
}

interface ScanResponse {
  scan: {
    docType: "drivers_licence" | "medicare_card" | "passport" | "unknown";
    title: string;
    fields: RecordField[];
    expiryDate: string | null;
    notes: string | null;
    confidence: "high" | "medium" | "low";
  };
}

const emptyField = (): RecordField => ({
  key: crypto.randomUUID().slice(0, 8),
  label: "",
  type: "text",
  value: "",
});

export function RecordEditor({
  categoryId,
  subcategoryId,
  mode,
  recordId,
  initial,
  suggestedTags = [],
  enableScan = false,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [expiryDate, setExpiryDate] = useState(initial?.expiryDate ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [fields, setFields] = useState<RecordField[]>(
    initial?.fields.length ? initial.fields : [emptyField()]
  );

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

  async function handleScanFile(file: File) {
    setError(null);
    setScanNotice(null);
    setScanning(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/scan-document", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(
          j.error === "unsupported_mime_type"
            ? "That file type isn't supported. Try JPEG, PNG, or WebP."
            : j.error === "file_too_large"
              ? "That file is too large (max 8MB)."
              : "Scan failed. Try again or enter details manually."
        );
        return;
      }
      const { scan } = (await res.json()) as ScanResponse;
      setTitle(scan.title || title);
      if (scan.fields.length) setFields(scan.fields);
      if (scan.expiryDate) setExpiryDate(scan.expiryDate);
      if (scan.notes) setNotes(scan.notes);
      if (scan.docType === "unknown") {
        setScanNotice(
          "Couldn't identify the document — please review the fields."
        );
      } else if (scan.confidence === "low") {
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
  function removeField(idx: number) {
    setFields((prev) => prev.filter((_, i) => i !== idx));
  }
  function addField() {
    setFields((prev) => [...prev, emptyField()]);
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
        fields: fields.filter((f) => f.label.trim()),
        expiryDate: expiryDate || null,
        notes: notes || null,
        tags,
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
      const dest = activeSubcategoryId
        ? `/records/${categoryId}/${encodeURIComponent(activeSubcategoryId)}`
        : `/records/${categoryId}`;
      router.push(dest);
      router.refresh();
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
      const dest = activeSubcategoryId
        ? `/records/${categoryId}/${encodeURIComponent(activeSubcategoryId)}`
        : `/records/${categoryId}`;
      router.push(dest);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {enableScan && mode === "create" && (
        <div className="rounded-2xl border border-tal-line bg-tal-cream-soft p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-display text-tal-plum">
                Scan a document
              </div>
              <p className="text-sm text-tal-plum-soft">
                Upload a photo of your driver's licence, Medicare card or
                passport and we'll fill this in for you.
              </p>
            </div>
            <button
              type="button"
              onClick={() => scanInputRef.current?.click()}
              disabled={scanning}
              className="h-11 px-5 rounded-xl bg-tal-plum text-white font-medium hover:bg-tal-plum-dark disabled:opacity-60"
            >
              {scanning ? "Scanning…" : "Scan document"}
            </button>
            <input
              ref={scanInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
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

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Fields</label>
          <button
            type="button"
            onClick={addField}
            className="text-sm text-tal-plum hover:underline"
          >
            + Add field
          </button>
        </div>
        <div className="space-y-3">
          {fields.map((f, i) => (
            <div
              key={f.key}
              className="grid grid-cols-12 gap-2 items-end rounded-xl bg-white border border-tal-line p-3"
            >
              <div className="col-span-4">
                <label className="block text-xs mb-1 text-tal-plum-soft">Label</label>
                <input
                  type="text"
                  value={f.label}
                  onChange={(e) => updateField(i, { label: e.target.value })}
                  className="w-full h-10 rounded-lg border border-tal-line px-2"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-xs mb-1 text-tal-plum-soft">Type</label>
                <select
                  value={f.type}
                  onChange={(e) =>
                    updateField(i, { type: e.target.value as RecordField["type"] })
                  }
                  className="w-full h-10 rounded-lg border border-tal-line px-2 bg-white"
                >
                  <option value="text">Text</option>
                  <option value="date">Date</option>
                  <option value="number">Number</option>
                </select>
              </div>
              <div className="col-span-4">
                <label className="block text-xs mb-1 text-tal-plum-soft">Value</label>
                <input
                  type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                  value={f.value}
                  onChange={(e) => updateField(i, { value: e.target.value })}
                  className="w-full h-10 rounded-lg border border-tal-line px-2"
                />
              </div>
              <div className="col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeField(i)}
                  className="text-tal-plum-soft hover:text-red-700 h-10"
                  aria-label="Remove field"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
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
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-tal-line p-3 bg-white"
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
          className="h-11 px-5 rounded-xl bg-tal-plum text-white font-medium hover:bg-tal-plum-dark disabled:opacity-60"
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
      </div>
    </form>
  );
}
