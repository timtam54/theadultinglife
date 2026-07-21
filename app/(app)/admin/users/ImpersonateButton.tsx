"use client";

import { useState } from "react";

export function ImpersonateButton({
  userId,
  userLabel,
}: {
  userId: string;
  userLabel: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onClick() {
    if (busy) return;
    const ok = window.confirm(
      `Impersonate ${userLabel}?\n\nYou will see the app as this user. Use the red banner at the top to exit.`
    );
    if (!ok) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `${res.status}`);
      }
      // Hard reload so every server component re-reads the swapped session.
      window.location.href = "/dashboard";
    } catch (e) {
      setBusy(false);
      setErr(e instanceof Error ? e.message : "failed");
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-tal-plum text-white text-xs font-medium hover:bg-tal-plum-dark disabled:opacity-60"
      >
        {busy ? "Switching…" : "Impersonate"}
      </button>
      {err && (
        <span className="text-[10px] text-rose-600" role="alert">
          {err}
        </span>
      )}
    </div>
  );
}
