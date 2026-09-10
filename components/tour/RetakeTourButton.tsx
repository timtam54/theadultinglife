"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/*
 * Small button that resets the tour's completion flag then reloads the
 * dashboard with ?tour=start so TourLauncher fires the tour again.
 * Used on the Settings page and (optionally) the Hello step.
 */
export function RetakeTourButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      await fetch("/api/tour/reset", { method: "POST" });
    } catch {
      /* non-fatal — the ?tour=start param still triggers the launcher */
    }
    router.push("/dashboard?tour=start");
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={busy}
      className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 12a8 8 0 0 1 14-5.3M20 4v4h-4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M20 12a8 8 0 0 1-14 5.3M4 20v-4h4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {busy ? "Starting…" : "Take the tour again"}
    </button>
  );
}
