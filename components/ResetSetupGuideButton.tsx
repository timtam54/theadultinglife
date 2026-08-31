"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResetSetupGuideButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function reset() {
    if (
      !confirm(
        "Restart the Setup guide from the beginning? This won't delete any of your actual data, just resets your progress through the guide."
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding-wizard/reset", {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setDone(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "reset_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={reset}
        disabled={busy || done}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
      >
        {done ? "Reset. Reload the dashboard" : busy ? "Resetting…" : "Restart Setup guide"}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
      {done && (
        <p className="mt-2 text-xs text-emerald-700">
          Setup guide reset. Next time you visit the dashboard it will take you
          back to the guide.
        </p>
      )}
    </div>
  );
}
