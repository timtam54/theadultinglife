"use client";

import { useEffect, useRef, useState } from "react";

// Reusable single-textarea editor for Planner-only content that's just one
// long free-text page per user. Used by Wishes (each audience) and Last Words.
// Autosaves on blur (or on explicit Save button click).

interface Props {
  initialBody: string;
  saveEndpoint: string; // PUT endpoint (e.g. /api/planner-wishes/spouse)
  placeholder?: string;
  rows?: number;
}

export function PlannerSingleTextEditor({
  initialBody,
  saveEndpoint,
  placeholder,
  rows = 20,
}: Props) {
  const [body, setBody] = useState(initialBody);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const savedBodyRef = useRef(initialBody);

  const isDirty = body !== savedBodyRef.current;

  async function save() {
    if (!isDirty || saving) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(saveEndpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "save_failed");
      }
      savedBodyRef.current = body;
      setSavedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "save_failed");
    } finally {
      setSaving(false);
    }
  }

  // Warn if leaving with unsaved changes.
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  return (
    <div className="rounded-2xl border border-tal-line bg-white p-5">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={save}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-xl border border-tal-line px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tal-plum/40 font-serif"
      />

      {error && (
        <div className="mt-3 p-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-tal-plum-soft">
          {saving
            ? "Saving…"
            : isDirty
              ? "Unsaved changes"
              : savedAt
                ? `Saved ${savedAt.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}`
                : initialBody
                  ? "Saved"
                  : "Empty"}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!isDirty || saving}
          className="h-9 px-4 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
