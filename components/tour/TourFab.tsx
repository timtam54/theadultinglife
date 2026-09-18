"use client";

/*
 * Floating tour launcher — a matching FAB sat to the LEFT of the Help
 * button (HelpButton owns bottom-right; this one shifts along by 72px so
 * the two never overlap).
 *
 * Behaviour depends on the current route:
 *   • On the Peace of Mind Planner (and its sub-pages) → resets +
 *     launches the Planner tour by navigating to
 *     /templates/peace-of-mind-planner?planner-tour=start.
 *   • Everywhere else → resets + launches the main app tour by
 *     navigating to /dashboard?tour=start.
 *
 * Uses the same visual language as HelpButton (rounded FAB, gradient,
 * blur) but in a blue palette so users can tell them apart at a glance.
 */

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function TourFab() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [busy, setBusy] = useState(false);

  // Hide on print, on the welcome wizard (its own guided flow), and on
  // marketing routes.
  const hidden =
    pathname.startsWith("/welcome") || pathname.startsWith("/login");
  if (hidden) return null;

  const isPlannerRoute = pathname.startsWith(
    "/templates/peace-of-mind-planner"
  );

  async function start() {
    if (busy) return;
    setBusy(true);
    try {
      if (isPlannerRoute) {
        try {
          await fetch("/api/tour/planner/reset", { method: "POST" });
        } catch {
          /* non-fatal */
        }
        router.push("/templates/peace-of-mind-planner?planner-tour=start");
      } else {
        try {
          await fetch("/api/tour/reset", { method: "POST" });
        } catch {
          /* non-fatal */
        }
        router.push("/dashboard?tour=start");
      }
    } finally {
      // Small delay so the click state doesn't flicker off before navigation.
      setTimeout(() => setBusy(false), 500);
    }
  }

  const label = isPlannerRoute ? "Take the Planner tour" : "Take the app tour";

  return (
    <button
      type="button"
      onClick={start}
      disabled={busy}
      aria-label={label}
      title={label}
      className="tal-tour-fab print:hidden fixed bottom-6 z-40 h-14 w-14 rounded-full flex items-center justify-center text-white shadow-xl transition-transform hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/60 disabled:opacity-70"
      style={{
        right: "calc(1.5rem + 72px)", // 1.5rem = right-6; 56px btn + 16px gap
        background:
          "linear-gradient(135deg, rgba(30, 58, 138, 0.95) 0%, rgba(37, 99, 235, 0.95) 55%, rgba(2, 132, 199, 0.95) 100%)",
        backdropFilter: "blur(14px) saturate(160%)",
        WebkitBackdropFilter: "blur(14px) saturate(160%)",
        border: "1px solid rgba(255,255,255,0.4)",
        boxShadow:
          "0 10px 30px rgba(30, 58, 138, 0.35), inset 0 1px 0 rgba(255,255,255,0.35)",
      }}
    >
      {/* Compass icon — evokes "guided tour" without duplicating the ? */}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="1.6"
          opacity="0.65"
        />
        <path
          d="M15 9l-2 5-5 2 2-5 5-2z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
}
