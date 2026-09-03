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
      {/* Microsoft Excel brand icon (Simple Icons, CC0). */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        role="img"
        aria-hidden
        fill="#1a7f37"
      >
        <path d="M23.181 1.5H8.818A.818.818 0 0 0 8 2.318v3.273h15.181c.452 0 .819-.366.819-.819V2.318a.818.818 0 0 0-.819-.818zM8 22.5h15.181c.453 0 .819-.366.819-.818v-2.454a.818.818 0 0 0-.819-.819H8V22.5zM24 6.409H8v3.273h16V6.41zM8 14.591h16V11.318H8v3.273zM8 18.409h16v-3.273H8v3.273zM7.023 4.91L0 3.638v16.723l7.023-1.272V4.909z" />
        <path
          fill="#fff"
          d="M4.803 10.001l-1.398-.104-.883 2.234-.94-2.353-1.301-.088L1.9 12.5l-1.62 2.827 1.267-.093.87-2.365 1.007 2.263 1.408-.108-1.749-2.804 1.72-2.219z"
        />
      </svg>
      <span className="hidden sm:inline">
        {busy ? "Preparing…" : label}
      </span>
    </button>
  );
}
