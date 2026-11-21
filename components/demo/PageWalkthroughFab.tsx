"use client";

import dynamic from "next/dynamic";
import { useState, type ComponentType } from "react";
import { usePathname } from "next/navigation";

// The third round button (next to the tour compass and the help ?): plays the
// current page's walkthrough full screen. Only shown on pages that have one —
// add a page here when its walkthrough is built. See docs/Demo-Walkthroughs.md.

type PopupWalkthrough = ComponentType<{ autoStart?: boolean; popup?: boolean; onExit?: () => void }>;

const WALKTHROUGHS: Record<string, { label: string; Demo: PopupWalkthrough }> = {
  "/dashboard": {
    label: "Watch a walkthrough of the dashboard",
    Demo: dynamic(() => import("./DashboardWalkthrough"), { ssr: false }),
  },
  "/records": {
    label: "Watch a walkthrough of the Organiser",
    Demo: dynamic(() => import("./OrganiserWalkthrough"), { ssr: false }),
  },
  "/templates/peace-of-mind-planner": {
    label: "Watch a walkthrough of the Peace of Mind Planner",
    Demo: dynamic(() => import("./PlannerPageWalkthrough"), { ssr: false }),
  },
};

export function PageWalkthroughFab() {
  const pathname = usePathname() ?? "/";
  const [playing, setPlaying] = useState(false);
  const page = WALKTHROUGHS[pathname];
  if (!page) return null;
  const { Demo, label } = page;

  return (
    <>
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={label}
        title={label}
        className="print:hidden fixed bottom-6 z-40 h-14 w-14 rounded-full flex items-center justify-center bg-black text-white shadow-xl ring-1 ring-white/40 transition-transform hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-tal-cream"
        style={{ right: "calc(1.5rem + 144px)" }} // after the help (right-6) and tour (+72px) buttons
      >
        {/* Play button in a screen — "watch how it works" */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="2.5" y="4" width="19" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10 8.3v5.4l4.6-2.7L10 8.3z" fill="currentColor" />
          <path d="M8 20.5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {playing && <Demo autoStart popup onExit={() => setPlaying(false)} />}
    </>
  );
}
