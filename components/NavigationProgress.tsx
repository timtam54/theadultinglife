"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Top-of-page progress bar for route navigations. Shows instantly on
 * click so the user knows something is happening while Next.js is
 * fetching the next page's data server-side.
 *
 * Approach:
 * - Global click listener intercepts internal <a>/<Link> clicks and starts
 *   the bar immediately (before Next's router has done anything).
 * - `usePathname()` change ends the bar (nav complete).
 * - Auto-hides after a max timeout as a safety net.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAt = useRef<number | null>(null);

  // Tracks the element currently marked as "navigating" so we can clear
  // its state when nav completes.
  const activeAnchor = useRef<HTMLAnchorElement | null>(null);

  // Intercept internal link clicks to start the bar immediately.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      // Only left-click, no modifier keys (those open in new tab/window)
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.defaultPrevented) return;

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === "_blank") return;
      if (anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      // Ignore hash-only, mailto, tel, external
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("http://") ||
        href.startsWith("https://")
      ) {
        return;
      }
      // Immediate visual feedback on the tapped anchor: dim it and block
      // further pointer events (prevents double-tap firing nav twice).
      // Applied inline so no globals.css rule is needed.
      clearAnchorPending(activeAnchor.current);
      applyAnchorPending(anchor);
      activeAnchor.current = anchor;
      start();
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // When pathname/search changes, complete the bar.
  useEffect(() => {
    if (active) complete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search]);

  function start() {
    if (tickTimer.current) clearInterval(tickTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    startedAt.current = Date.now();
    setProgress(8);
    setActive(true);
    // Slowly creep toward 90% while nav is pending.
    tickTimer.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        // Ease-out: smaller increments as we approach 90.
        const step = Math.max(0.5, (90 - p) * 0.08);
        return Math.min(90, p + step);
      });
    }, 120);
    // Safety net — if navigation truly never fires, hide after 8s.
    hideTimer.current = setTimeout(() => complete(), 8000);
  }

  function complete() {
    if (tickTimer.current) {
      clearInterval(tickTimer.current);
      tickTimer.current = null;
    }
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    // Snap to 100, then fade after a beat so the user actually sees it complete.
    setProgress(100);
    setTimeout(() => {
      setActive(false);
      setProgress(0);
    }, 180);
    // Clear the pending styling on the clicked anchor.
    clearAnchorPending(activeAnchor.current);
    activeAnchor.current = null;
  }

  if (!active) return null;

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[100] pointer-events-none"
    >
      <div
        className="h-0.5 bg-tal-plum transition-[width,opacity] ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress >= 100 ? 0 : 1,
          transitionDuration:
            progress >= 100 ? "180ms" : progress > 8 ? "300ms" : "0ms",
          boxShadow: "0 0 8px 0 rgba(76, 55, 60, 0.5)",
        }}
      />
    </div>
  );
}

// Inline pending-state helpers. Uses direct style + pointerEvents rather
// than a CSS class so no globals.css rule is needed.

const PENDING_TAG = "data-nav-pending";

function applyAnchorPending(el: HTMLAnchorElement): void {
  // Remember originals so complete() can restore.
  el.setAttribute(PENDING_TAG, "");
  el.dataset.navPrevBg = el.style.backgroundColor;
  el.dataset.navPrevColor = el.style.color;
  el.dataset.navPrevPointerEvents = el.style.pointerEvents;
  el.dataset.navPrevTransition = el.style.transition;
  el.dataset.navPrevCursor = el.style.cursor;
  el.dataset.navPrevAriaDisabled = el.getAttribute("aria-disabled") ?? "";
  el.style.transition = "background-color 120ms ease, color 120ms ease";
  el.style.backgroundColor = "#000000";
  el.style.color = "#ffffff";
  el.style.pointerEvents = "none";
  el.style.cursor = "wait";
  el.setAttribute("aria-disabled", "true");
}

function clearAnchorPending(el: HTMLAnchorElement | null): void {
  if (!el || !el.hasAttribute(PENDING_TAG)) return;
  el.style.backgroundColor = el.dataset.navPrevBg ?? "";
  el.style.color = el.dataset.navPrevColor ?? "";
  el.style.pointerEvents = el.dataset.navPrevPointerEvents ?? "";
  el.style.transition = el.dataset.navPrevTransition ?? "";
  el.style.cursor = el.dataset.navPrevCursor ?? "";
  const prevAria = el.dataset.navPrevAriaDisabled ?? "";
  if (prevAria) el.setAttribute("aria-disabled", prevAria);
  else el.removeAttribute("aria-disabled");
  delete el.dataset.navPrevBg;
  delete el.dataset.navPrevColor;
  delete el.dataset.navPrevPointerEvents;
  delete el.dataset.navPrevTransition;
  delete el.dataset.navPrevCursor;
  delete el.dataset.navPrevAriaDisabled;
  el.removeAttribute(PENDING_TAG);
}
