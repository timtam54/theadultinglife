"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteAccountSection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (confirmText.trim().toUpperCase() !== "DELETE") return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "delete_failed");
      }
      // Session is destroyed server-side. Redirect to the login page.
      router.push("/login");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "delete_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-red-300 bg-red-50/40 p-6 mb-4">
      <h2 className="font-display text-xl text-red-800 mb-1">Delete account</h2>
      <p className="text-sm text-red-900/80 mb-4">
        Deletes your Adulting Life account and — after 30 days — everything
        stored for your family group, including every family member&apos;s
        records, uploads and Peace of Mind Planner content.
      </p>
      <ul className="text-xs text-red-900/70 list-disc pl-5 mb-4 space-y-1">
        <li>You&apos;re signed out immediately.</li>
        <li>
          Your account is scheduled to be permanently deleted{" "}
          <strong>30 days from now</strong>, along with everything belonging to
          your family group — records, uploads, Peace of Mind Planner content,
          receipts, tasks, reminders.
        </li>
        <li>
          <strong>You can change your mind for the full 30 days.</strong> Sign
          back in during that window and click <em>Cancel deletion</em> on the
          red banner at the top of every page. Nothing is lost.
        </li>
        <li>After 30 days the deletion is permanent and cannot be undone.</li>
        <li>
          Grantees who&apos;ve been shared items by you keep access until the
          30-day purge.
        </li>
        <li>
          Some records may be retained if Australian law requires it (billing
          history, etc.).
        </li>
      </ul>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-10 px-4 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
        >
          Delete my account
        </button>
      ) : (
        <div className="rounded-xl border border-red-300 bg-white p-4">
          <div className="text-sm font-medium text-red-800 mb-2">
            Type DELETE below to confirm.
          </div>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="w-full h-10 rounded-lg border border-red-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 mb-3"
          />
          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
              {error}
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmText("");
                setError(null);
              }}
              disabled={busy}
              className="h-9 px-4 rounded-lg text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={
                busy || confirmText.trim().toUpperCase() !== "DELETE"
              }
              className="h-9 px-4 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? "Deleting…" : "Permanently delete account"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
