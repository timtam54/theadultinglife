"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CustomReminderForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !dueDate) {
      setError("Give it a title and a date.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/custom-reminders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          dueDate,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Something went wrong.");
        return;
      }
      router.push("/reminders");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      <div>
        <label className="block text-sm mb-1">Title</label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Car service, Book flu jab, Renew visa"
          className="w-full h-11 rounded-xl border border-tal-line px-3 bg-white"
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Due date</label>
        <input
          type="date"
          required
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="h-11 rounded-xl border border-tal-line px-3 bg-white"
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Anything you want to remember about it."
          className="w-full rounded-xl border border-tal-line px-3 py-2 bg-white"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="h-11 px-5 rounded-xl bg-tal-plum text-white font-medium hover:bg-tal-plum-dark disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save reminder"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="h-11 px-5 rounded-xl border border-tal-line text-tal-plum hover:bg-tal-cream-soft"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
