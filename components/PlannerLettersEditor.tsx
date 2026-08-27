"use client";

import { useState } from "react";
import type { PlannerLetterRow } from "@/lib/db/planner-letters";

interface Props {
  initialLetters: PlannerLetterRow[];
}

export function PlannerLettersEditor({ initialLetters }: Props) {
  const [letters, setLetters] = useState<PlannerLetterRow[]>(initialLetters);
  const [mode, setMode] = useState<
    { kind: "list" } | { kind: "add" } | { kind: "edit"; id: number }
  >({ kind: "list" });
  const [recipient, setRecipient] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyDelete, setBusyDelete] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openAdd() {
    setMode({ kind: "add" });
    setRecipient("");
    setBody("");
    setError(null);
  }

  function openEdit(letter: PlannerLetterRow) {
    setMode({ kind: "edit", id: letter.id });
    setRecipient(letter.recipient);
    setBody(letter.body);
    setError(null);
  }

  function closeForm() {
    setMode({ kind: "list" });
    setError(null);
  }

  async function save() {
    setError(null);
    if (!recipient.trim() && !body.trim()) {
      setError("Add a recipient or some text before saving.");
      return;
    }
    setSaving(true);
    try {
      if (mode.kind === "edit") {
        const res = await fetch(`/api/planner-letters/${mode.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipient, body }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          letter?: PlannerLetterRow;
          error?: string;
        };
        if (!res.ok || !data.letter) throw new Error(data.error ?? "save_failed");
        setLetters((prev) =>
          prev.map((l) => (l.id === data.letter!.id ? data.letter! : l))
        );
      } else {
        const res = await fetch("/api/planner-letters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipient, body }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          letter?: PlannerLetterRow;
          error?: string;
        };
        if (!res.ok || !data.letter) throw new Error(data.error ?? "save_failed");
        setLetters((prev) => [...prev, data.letter!]);
      }
      closeForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "save_failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this letter?")) return;
    setBusyDelete(id);
    try {
      const res = await fetch(`/api/planner-letters/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete_failed");
      setLetters((prev) => prev.filter((l) => l.id !== id));
      if (mode.kind === "edit" && mode.id === id) closeForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "delete_failed");
    } finally {
      setBusyDelete(null);
    }
  }

  if (mode.kind !== "list") {
    return (
      <div>
        <button
          type="button"
          onClick={closeForm}
          className="text-sm text-tal-plum-soft hover:text-tal-plum mb-3"
        >
          ← Back to letters
        </button>
        <div className="rounded-2xl border border-tal-line bg-white p-5">
          <div className="text-[10px] uppercase tracking-widest text-tal-plum-soft mb-3 font-medium">
            {mode.kind === "edit" ? "Edit letter" : "New letter"}
          </div>
          <label className="block mb-4">
            <span className="block text-sm text-tal-plum-soft mb-1">Dear</span>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. Sarah, Mum, My children"
              className="w-full h-11 rounded-xl border border-tal-line px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tal-plum/40"
            />
          </label>
          <label className="block">
            <span className="block text-sm text-tal-plum-soft mb-1">
              Your letter
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={16}
              className="w-full rounded-xl border border-tal-line px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tal-plum/40 font-serif"
            />
          </label>

          {error && (
            <div className="mt-3 p-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">
              {error}
            </div>
          )}

          <div className="mt-5 flex items-center justify-end gap-2">
            {mode.kind === "edit" && (
              <button
                type="button"
                onClick={() => remove(mode.id)}
                disabled={busyDelete === mode.id || saving}
                className="mr-auto text-sm text-red-600 hover:underline disabled:opacity-50"
              >
                {busyDelete === mode.id ? "Deleting…" : "Delete"}
              </button>
            )}
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="h-10 px-4 rounded-xl text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="h-10 px-5 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="text-sm text-tal-plum-soft">
          {letters.length} {letters.length === 1 ? "letter" : "letters"}
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-black text-white text-sm font-medium hover:bg-black/85"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Add letter
        </button>
      </div>

      {letters.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-tal-line bg-white p-6 text-sm text-tal-plum-soft">
          No letters yet. Click Add letter to write one.
        </div>
      ) : (
        <ul className="space-y-2">
          {letters.map((l) => {
            const preview = l.body.trim().split("\n")[0]?.slice(0, 120) ?? "";
            return (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => openEdit(l)}
                  className="w-full text-left flex items-center justify-between rounded-xl border border-tal-line bg-white px-4 py-3 hover:shadow-sm hover:bg-tal-cream-soft/40 transition-colors gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-tal-plum">
                      Dear {l.recipient || "…"}
                    </div>
                    {preview && (
                      <div className="text-xs text-tal-plum-soft mt-0.5 truncate">
                        {preview}
                      </div>
                    )}
                  </div>
                  <span className="text-tal-plum-soft shrink-0" aria-hidden>
                    ›
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
