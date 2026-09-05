"use client";

import { useState } from "react";
import { clearAllConsents } from "@/components/AiConsentGate";

export function ResetAiConsentsButton() {
  const [state, setState] = useState<"idle" | "done">("idle");
  return (
    <button
      type="button"
      onClick={() => {
        clearAllConsents();
        setState("done");
      }}
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-tal-line text-sm text-tal-plum hover:bg-tal-cream-soft"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
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
      {state === "done" ? "Reset — will ask again" : "Reset AI consents"}
    </button>
  );
}
