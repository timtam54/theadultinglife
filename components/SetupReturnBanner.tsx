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

// Very light subcategory-id validation — only allow characters we know are
// used in real ids. Blocks path-traversal / injection via the ?next= param.
function safeSubcategoryId(v: string | null): string | null {
  if (!v) return null;
  return /^[a-z0-9_.]+$/.test(v) ? v : null;
}

function SetupReturnBannerInner() {
  const params = useSearchParams();
  if (params.get("from") !== "setup") return null;
  const stepParam = params.get("step") ?? "";
  const step = VALID_STEPS.has(stepParam) ? stepParam : null;
  const returnHref = step ? `/welcome?step=${step}` : "/welcome";

  // Next folder in the same Setup Guide section, if the wizard passed one.
  const nextSub = safeSubcategoryId(params.get("next"));
  // The category segment of the next-folder URL is either the current step
  // (if it's one of the category ids) or nothing — best-effort. We fall back
  // to the first segment of the current path if step isn't a category.
  const nextHref = nextSub && step
    ? `/records/${step}/${nextSub}?from=setup&step=${step}`
    : null;

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
            Fill this in, then head back or move to the next form.
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 flex-wrap">
        <Link
          href={returnHref}
          className="group inline-flex items-center gap-2 h-11 pl-2 pr-4 rounded-xl bg-white text-tal-plum text-sm font-semibold shadow-sm transition-all hover:bg-tal-cream-soft hover:shadow-md hover:-translate-y-0.5"
        >
          <span
            aria-hidden
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-tal-plum/10 text-tal-plum transition-colors group-hover:bg-tal-plum group-hover:text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </span>
          Return to Setup Guide
        </Link>
        {nextHref && (
          <Link
            href={nextHref}
            className="group inline-flex items-center gap-2 h-11 pl-4 pr-2 rounded-xl bg-tal-cream text-tal-plum text-sm font-semibold shadow-sm transition-all hover:bg-emerald-500 hover:text-white hover:shadow-md hover:-translate-y-0.5"
          >
            Next form
            <span
              aria-hidden
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-tal-plum/10 text-tal-plum transition-all group-hover:bg-white group-hover:text-emerald-600 group-hover:scale-110"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </span>
          </Link>
        )}
      </div>
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
