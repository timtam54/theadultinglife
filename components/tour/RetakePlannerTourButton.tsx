"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/*
 * Replay the Planner-specific 5-step walkthrough. Resets the completion
 * flag then navigates to the Planner with ?planner-tour=start so the
 * PlannerTourLauncher fires without needing a full reload.
 */
export function RetakePlannerTourButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      await fetch("/api/tour/planner/reset", { method: "POST" });
    } catch {
      /* non-fatal — the ?planner-tour=start param still triggers the launcher */
    }
    router.push("/templates/peace-of-mind-planner?planner-tour=start");
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
          d="M12 3l1.9 5.9L20 10l-6.1 1.1L12 17l-1.9-5.9L4 10l6.1-1.1L12 3z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      {busy ? "Starting…" : "Replay Planner tour"}
    </button>
  );
}
