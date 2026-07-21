"use client";

import { useState } from "react";

export function ImpersonationBanner({
  targetLabel,
  adminLabel,
}: {
  targetLabel: string;
  adminLabel: string;
}) {
  const [busy, setBusy] = useState(false);

  async function exit() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/impersonate/exit", { method: "POST" });
      if (!res.ok) throw new Error(`${res.status}`);
      window.location.href = "/admin/users";
    } catch {
      setBusy(false);
      window.alert("Could not exit impersonation. Please try again.");
    }
  }

  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-rose-600 text-white px-4 md:px-6 py-2 text-sm shadow"
    >
      <div className="min-w-0 flex items-center gap-2">
        <span aria-hidden>⚠️</span>
        <span className="truncate">
          Impersonating <strong className="font-semibold">{targetLabel}</strong>{" "}
          as {adminLabel}
        </span>
      </div>
      <button
        type="button"
        onClick={exit}
        disabled={busy}
        className="shrink-0 inline-flex items-center h-8 px-3 rounded-md bg-white text-rose-700 text-xs font-semibold hover:bg-rose-50 disabled:opacity-60"
      >
        {busy ? "Exiting…" : "Exit impersonation"}
      </button>
    </div>
  );
}
