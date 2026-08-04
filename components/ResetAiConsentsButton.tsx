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
      className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-tal-line text-sm text-tal-plum hover:bg-tal-cream-soft"
    >
      {state === "done" ? "Reset — will ask again" : "Reset AI consents"}
    </button>
  );
}
