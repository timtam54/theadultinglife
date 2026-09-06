"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  familyGroupId: string;
  primaryLabel: string;
}

export function PurgeFamilyGroupButton({
  familyGroupId,
  primaryLabel,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    { usersDeleted: number; storageBlobsDeleted: number } | null
  >(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input as soon as the dialog opens so keyboard users don't
  // have to hunt for it.
  useEffect(() => {
    if (open) {
      setTyped("");
      setError(null);
      setResult(null);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Escape closes the dialog (unless mid-purge).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy]);

  const confirmed = typed.trim().toLowerCase() === primaryLabel.trim().toLowerCase();

  async function purge() {
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/purge-family-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyGroupId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        result?: { usersDeleted: number; storageBlobsDeleted: number };
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "purge_failed");
      }
      setResult(data.result ?? { usersDeleted: 0, storageBlobsDeleted: 0 });
      // Auto-close after 2s and refresh the table.
      setTimeout(() => {
        setOpen(false);
        router.refresh();
      }, 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "purge_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={busy}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-60"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Purge family group
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="purge-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-red-50 border-b border-red-100 px-5 py-4 flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 3 2 20h20L12 3Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path d="M12 10v4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                  <circle cx="12" cy="17" r="1.1" fill="currentColor" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2
                  id="purge-title"
                  className="font-display text-lg text-tal-plum leading-tight"
                >
                  Purge this family group?
                </h2>
                <p className="text-xs text-tal-plum-soft mt-0.5">
                  This is permanent. Not recoverable.
                </p>
              </div>
            </div>

            {result ? (
              <div className="px-5 py-6 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M5 12l5 5 9-11"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="font-medium text-tal-plum">Purged.</div>
                <p className="text-sm text-tal-plum-soft mt-1">
                  {result.usersDeleted} user{result.usersDeleted === 1 ? "" : "s"}
                  {" · "}
                  {result.storageBlobsDeleted} file
                  {result.storageBlobsDeleted === 1 ? "" : "s"} removed
                </p>
              </div>
            ) : (
              <div className="px-5 py-5">
                <p className="text-sm text-tal-plum leading-relaxed">
                  Deleting{" "}
                  <span className="font-semibold">{primaryLabel}</span>&apos;s
                  family group will permanently remove:
                </p>
                <ul className="mt-3 space-y-1 text-sm text-tal-plum-soft">
                  <li className="flex gap-2">
                    <span className="text-red-500">•</span>
                    Every family member&apos;s records, forms and uploads
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-500">•</span>
                    All folder notes, tasks, reminders and receipts
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-500">•</span>
                    All stored files (scans, portraits, receipts)
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-500">•</span>
                    Both sides of any sharing grants
                  </li>
                </ul>

                <div className="mt-4">
                  <label
                    htmlFor="purge-confirm"
                    className="block text-xs text-tal-plum-soft mb-1.5"
                  >
                    Type{" "}
                    <span className="font-semibold text-tal-plum">
                      {primaryLabel}
                    </span>{" "}
                    to confirm:
                  </label>
                  <input
                    ref={inputRef}
                    id="purge-confirm"
                    type="text"
                    autoComplete="off"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    disabled={busy}
                    className="w-full h-10 rounded-lg border border-tal-line px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 disabled:opacity-60"
                    placeholder={primaryLabel}
                  />
                </div>

                {error && (
                  <p
                    role="alert"
                    className="mt-3 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
                  >
                    {error}
                  </p>
                )}

                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={busy}
                    className="h-10 px-4 rounded-lg border border-tal-line text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={purge}
                    disabled={!confirmed || busy}
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {busy ? (
                      "Purging…"
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Permanently delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
