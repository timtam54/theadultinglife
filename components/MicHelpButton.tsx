"use client";

import { useState } from "react";
import { MicHelpDialog } from "@/components/MicHelpDialog";

/*
 * Small self-contained button + dialog for the Settings page (or anywhere
 * else) so users can find "how to enable your microphone" without having
 * to trigger a permission-denied error first.
 */
export function MicHelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.7" />
          <path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M12 18v3M8 21h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        How to enable your microphone
      </button>
      {open && <MicHelpDialog onClose={() => setOpen(false)} />}
    </>
  );
}
