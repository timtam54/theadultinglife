"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TaskRow } from "@/lib/db/types";

interface RecordOption {
  id: string;
  title: string;
  categoryId: string;
  categoryLabel: string;
}

export function TasksList({
  initialTasks,
  records,
}: {
  initialTasks: TaskRow[];
  records: RecordOption[];
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);
  const [showAdd, setShowAdd] = useState(initialTasks.length === 0);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [recordId, setRecordId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [, startRefresh] = useTransition();

  const visible = tasks.filter((t) =>
    filter === "open" ? !t.completed_at : true
  );
  const openCount = tasks.filter((t) => !t.completed_at).length;

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Give it a title.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          dueDate: dueDate || null,
          recordId: recordId || null,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Failed to add task.");
        return;
      }
      const { task } = (await res.json()) as { task: TaskRow };
      setTasks((prev) => [task, ...prev]);
      setTitle("");
      setDueDate("");
      setRecordId("");
      startRefresh(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  async function toggleComplete(t: TaskRow) {
    const nextCompleted = t.completed_at ? null : new Date().toISOString();
    setTasks((prev) =>
      prev.map((x) =>
        x.id === t.id ? { ...x, completed_at: nextCompleted } : x
      )
    );
    await fetch(`/api/tasks/${t.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ completed: !t.completed_at }),
    });
  }

  async function remove(t: TaskRow) {
    if (!confirm(`Delete "${t.title}"?`)) return;
    setTasks((prev) => prev.filter((x) => x.id !== t.id));
    await fetch(`/api/tasks/${t.id}`, { method: "DELETE" });
  }

  const recordById = new Map(records.map((r) => [r.id, r]));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-lg border border-tal-line bg-white p-1">
          <button
            type="button"
            onClick={() => setFilter("open")}
            className={
              "h-8 px-3 rounded-md text-xs font-medium transition-colors " +
              (filter === "open"
                ? "bg-black text-white"
                : "text-tal-plum-soft hover:text-tal-plum")
            }
          >
            Open ({openCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={
              "h-8 px-3 rounded-md text-xs font-medium transition-colors " +
              (filter === "all"
                ? "bg-black text-white"
                : "text-tal-plum-soft hover:text-tal-plum")
            }
          >
            All ({tasks.length})
          </button>
        </div>
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => setShowAdd((s) => !s)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-tal-cream-soft text-tal-plum border border-tal-line text-sm font-medium hover:shadow-sm"
          >
            {showAdd ? "Close" : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Add a task
              </>
            )}
          </button>
        </div>
      </div>

      {showAdd && (
        <form
          onSubmit={addTask}
          className="rounded-2xl border border-tal-line bg-white p-4 space-y-3"
        >
          <div>
            <label className="block text-xs text-tal-plum-soft mb-1">
              What do you need to do?
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Renew rego, book dentist, upload Sam's report card"
              className="w-full h-10 rounded-lg border border-tal-line px-3 bg-white text-sm"
              autoFocus
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-xs text-tal-plum-soft mb-1">
                Due (optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-10 rounded-lg border border-tal-line px-2 bg-white text-sm"
              />
            </div>
            {records.length > 0 && (
              <div className="min-w-0 flex-1">
                <label className="block text-xs text-tal-plum-soft mb-1">
                  Link to a record (optional)
                </label>
                <select
                  value={recordId}
                  onChange={(e) => setRecordId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-tal-line px-2 bg-white text-sm"
                >
                  <option value="">None</option>
                  {records.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} · {r.categoryLabel}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}
          <div>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-4 rounded-lg bg-black text-white text-sm font-medium disabled:opacity-60"
            >
              {saving ? "Adding…" : "Save"}
            </button>
          </div>
        </form>
      )}

      {visible.length === 0 && !showAdd && (
        <div className="rounded-2xl border border-dashed border-tal-line bg-white p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-tal-cream-soft text-tal-plum mb-3">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="m8 12 3 3 5-6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="font-display text-xl text-tal-plum mb-1">
            {filter === "open" ? "Nothing to do right now" : "No tasks yet"}
          </div>
          <p className="text-sm text-tal-plum-soft mb-4 max-w-md mx-auto">
            Keep a running list of the little things — a call to make, a form
            to fill, a doc to upload — and tick them off as you go.
          </p>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-black text-white text-sm font-medium"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Add your first task
          </button>
        </div>
      )}

      {visible.length > 0 && (
        <ul className="space-y-2">
          {visible.map((t) => {
            const linked = t.record_id ? recordById.get(t.record_id) : null;
            const done = !!t.completed_at;
            return (
              <li key={t.id}>
                <div
                  className={
                    "flex items-center gap-3 rounded-xl border p-3 transition " +
                    (done
                      ? "border-tal-line bg-tal-cream-soft/60"
                      : "border-tal-line bg-white hover:shadow-sm")
                  }
                >
                  <button
                    type="button"
                    onClick={() => toggleComplete(t)}
                    aria-label={done ? "Mark as not done" : "Mark as done"}
                    className={
                      "shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full border transition " +
                      (done
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-tal-line hover:border-tal-plum")
                    }
                  >
                    {done && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path
                          d="M5 12l4 4 10-10"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div
                      className={
                        "text-sm " +
                        (done
                          ? "line-through text-tal-plum-soft"
                          : "font-medium text-tal-plum")
                      }
                    >
                      {t.title}
                    </div>
                    <div className="text-xs text-tal-plum-soft mt-0.5 flex items-center gap-2 flex-wrap">
                      {t.due_date && <span>Due {formatDate(t.due_date)}</span>}
                      {linked && (
                        <a
                          href={`/records/${linked.categoryId}/r/${linked.id}`}
                          className="underline hover:text-tal-plum"
                        >
                          → {linked.title}
                        </a>
                      )}
                      {!t.due_date && !linked && (
                        <span>Added {formatDate(t.created_at.slice(0, 10))}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(t)}
                    aria-label={`Delete "${t.title}"`}
                    className="shrink-0 text-tal-plum-soft hover:text-red-700 h-8 w-8 rounded-lg hover:bg-red-50"
                  >
                    ×
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
