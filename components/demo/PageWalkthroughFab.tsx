"use client";

import dynamic from "next/dynamic";
import { useState, type ComponentType } from "react";
import { usePathname } from "next/navigation";

// The tour button (the compass, next to the help ?): plays the current page's
// walkthrough full screen. Only shown on pages that have one — add a page here
// when its walkthrough is built; its sub-pages (e.g. a folder under /records)
// use the same one. The old menu-by-menu app tour is still in the account
// menu ("Take the tour"). See docs/Demo-Walkthroughs.md.

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
  "/emergency": {
    label: "Watch a walkthrough of the Emergency page",
    Demo: dynamic(() => import("./EmergencyPageWalkthrough"), { ssr: false }),
  },
  "/documents": {
    label: "Watch a walkthrough of Documents",
    Demo: dynamic(() => import("./DocumentsPageWalkthrough"), { ssr: false }),
  },
  "/receipts": {
    label: "Watch a walkthrough of Receipts",
    Demo: dynamic(() => import("./ReceiptsWalkthrough"), { ssr: false }),
  },
  "/reminders": {
    label: "Watch a walkthrough of Reminders",
    Demo: dynamic(() => import("./RemindersPageWalkthrough"), { ssr: false }),
  },
  "/tal-ai": {
    label: "Watch a walkthrough of TAL AI",
    Demo: dynamic(() => import("./TalAiPageWalkthrough"), { ssr: false }),
  },
  "/tasks": {
    label: "Watch a walkthrough of Tasks",
    Demo: dynamic(() => import("./TasksPageWalkthrough"), { ssr: false }),
  },
  "/learn": {
    label: "Watch a walkthrough of Learn",
    Demo: dynamic(() => import("./LearnPageWalkthrough"), { ssr: false }),
  },
  "/subscription": {
    label: "Watch a walkthrough of your subscription",
    Demo: dynamic(() => import("./SubscriptionPageWalkthrough"), { ssr: false }),
  },
  "/maps": {
    label: "Watch a walkthrough of Maps",
    Demo: dynamic(() => import("./MapsPageWalkthrough"), { ssr: false }),
  },
  "/welcome": {
    label: "Watch a walkthrough of the Setup guide",
    Demo: dynamic(() => import("./SetupGuideWalkthrough"), { ssr: false }),
  },
  "/settings": {
    label: "Watch a walkthrough of Settings",
    Demo: dynamic(() => import("./SettingsPageWalkthrough"), { ssr: false }),
  },
  "/security": {
    label: "Watch a walkthrough of Settings and Security",
    Demo: dynamic(() => import("./SettingsPageWalkthrough"), { ssr: false }),
  },
};

export function PageWalkthroughFab() {
  const pathname = usePathname() ?? "/";
  const [playing, setPlaying] = useState(false);
  // The page's own walkthrough, or its area's (e.g. a folder under /records).
  const key = Object.keys(WALKTHROUGHS)
    .filter((k) => pathname === k || pathname.startsWith(`${k}/`))
    .sort((a, b) => b.length - a.length)[0];
  const page = key ? WALKTHROUGHS[key] : undefined;
  if (!page) return null;
  const { Demo, label } = page;

  return (
    <>
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={label}
        title={label}
        className="tal-tour-fab print:hidden fixed bottom-6 z-40 h-14 w-14 rounded-full flex items-center justify-center text-white shadow-xl transition-transform hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/60"
        style={{
          // Next to the help button (right-6); the Setup guide has no help button.
          right: pathname.startsWith("/welcome") ? "1.5rem" : "calc(1.5rem + 72px)",
          background:
            "linear-gradient(135deg, rgba(30, 58, 138, 0.95) 0%, rgba(37, 99, 235, 0.95) 55%, rgba(2, 132, 199, 0.95) 100%)",
          backdropFilter: "blur(14px) saturate(160%)",
          WebkitBackdropFilter: "blur(14px) saturate(160%)",
          border: "1px solid rgba(255,255,255,0.4)",
          boxShadow: "0 10px 30px rgba(30, 58, 138, 0.35), inset 0 1px 0 rgba(255,255,255,0.35)",
        }}
      >
        {/* The tour compass */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" opacity="0.65" />
          <path d="M15 9l-2 5-5 2 2-5 5-2z" fill="currentColor" />
        </svg>
      </button>
      {playing && <Demo autoStart popup onExit={() => setPlaying(false)} />}
    </>
  );
}
