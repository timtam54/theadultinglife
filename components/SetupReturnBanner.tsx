"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

// Valid Setup Guide step ids we're willing to route back to. Guards against
// arbitrary ?step= values (would return a 404 or the fallback wizard state).
const VALID_STEPS = new Set([
  "welcome",
  "family",
  "personal",
  "health",
  "education",
  "employment",
  "admin",
  "finish",
]);

function SetupReturnBannerInner() {
  const params = useSearchParams();
  if (params.get("from") !== "setup") return null;
  const stepParam = params.get("step") ?? "";
  const step = VALID_STEPS.has(stepParam) ? stepParam : null;
  const href = step ? `/welcome?step=${step}` : "/welcome";

  return (
    <div className="mb-4 rounded-2xl border border-tal-plum/20 bg-tal-plum text-white px-4 py-3 flex items-center justify-between gap-3 flex-wrap shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <span
          aria-hidden
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/15 shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v6M12 22v-6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M22 12h-6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24" />
          </svg>
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium">You&apos;re in the Setup Guide</div>
          <div className="text-xs text-white/70">
            Fill this in, then head back to keep setting up.
          </div>
        </div>
      </div>
      <Link
        href={href}
        className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white text-tal-plum text-sm font-medium hover:shadow-md"
      >
        ← Return to Setup Guide
      </Link>
    </div>
  );
}

export function SetupReturnBanner() {
  // useSearchParams needs a Suspense boundary in the app router.
  return (
    <Suspense fallback={null}>
      <SetupReturnBannerInner />
    </Suspense>
  );
}
