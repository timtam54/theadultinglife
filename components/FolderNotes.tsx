"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function FolderNotes({
  subcategoryId,
  initialBody,
  updatedAt,
}: {
  subcategoryId: string;
  initialBody: string;
  updatedAt: string | null;
}) {
  const router = useRouter();
  const [body, setBody] = useState(initialBody);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/folder-notes/${encodeURIComponent(subcategoryId)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body }),
        }
      );
      if (!res.ok) throw new Error("Save failed");
      setEditing(false);
      startTransition(() => router.refresh());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const isEmpty = !body.trim();

  return (
    <section className="rounded-2xl border border-tal-line bg-amber-50/40 p-5">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-700"
            aria-hidden
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 5.5A1.5 1.5 0 0 1 5.5 4H16l4 4v10.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-13Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path d="M15 4v5h5" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          </span>
          <h3 className="font-display text-lg text-tal-plum">Notes</h3>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-tal-plum-soft hover:text-tal-plum underline"
          >
            {isEmpty ? "Add note" : "Edit"}
          </button>
        )}
      </div>

      {editing ? (
        <>
          <textarea
            autoFocus
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="e.g. Passport in fireproof safe, top drawer of my bedroom."
            className="w-full min-h-[120px] rounded-lg border border-tal-line bg-white p-3 text-sm text-tal-plum resize-y focus:outline-none focus:border-tal-plum"
          />
          {err && <div className="text-xs text-red-600 mt-2">{err}</div>}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="h-9 px-3 rounded-lg bg-tal-plum text-white text-sm font-medium hover:bg-tal-plum-dark disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save note"}
            </button>
            <button
              type="button"
              onClick={() => {
                setBody(initialBody);
                setEditing(false);
                setErr(null);
              }}
              className="h-9 px-3 rounded-lg border border-tal-line text-sm text-tal-plum-soft hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </>
      ) : isEmpty ? (
        <p className="text-sm text-tal-plum-soft">
          Add a private note for your family — reminders, where the physical
          document lives, who to call.
        </p>
      ) : (
        <>
          <p className="text-sm text-tal-plum whitespace-pre-line">{body}</p>
          {updatedAt && (
            <p className="text-[10px] text-tal-plum-soft mt-2 uppercase tracking-widest">
              Updated {new Date(updatedAt).toLocaleDateString()}
            </p>
          )}
        </>
      )}
    </section>
  );
}
