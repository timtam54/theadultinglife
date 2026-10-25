"use client";

import { useState } from "react";
import { printFileById } from "@/lib/file-client";
import { fileActionBtn } from "@/components/FileActions";

// "Print" for an uploaded document — the original scan, as uploaded.
export function FilePrintButton({ fileId, filename }: { fileId: string; filename?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function print() {
    setBusy(true);
    setError(null);
    try {
      await printFileById(fileId, filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't print the file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={print} disabled={busy} className={fileActionBtn} title="Print the original document">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M7 9V4h10v5M7 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <rect x="7" y="14" width="10" height="6" rx="1" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        {busy ? "Preparing…" : "Print"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      )}
    </>
  );
}
