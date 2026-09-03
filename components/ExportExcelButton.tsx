"use client";

import { useState } from "react";

interface Props {
  href: string;
  label?: string;
  className?: string;
}

export function ExportExcelButton({
  href,
  label = "Export to Excel",
  className,
}: Props) {
  const [busy, setBusy] = useState(false);

  async function handle() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error(`export_failed_${res.status}`);
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "export.xlsx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      className={
        className ??
        "h-9 px-2 sm:px-3 rounded-xl border border-white/30 text-white text-sm hover:bg-white/10 inline-flex items-center gap-1.5 disabled:opacity-60"
      }
      title={label}
      aria-label={label}
    >
      {/* Excel-style icon: page with a small "X" — visually distinct from */}
      {/* the generic download arrow so it reads as Excel export. */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M14 3v6h6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M9 13l6 6M15 13l-6 6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <span className="hidden sm:inline">
        {busy ? "Preparing…" : label}
      </span>
    </button>
  );
}
