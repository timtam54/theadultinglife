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

  return (
    <>
      {/*
        Safelist. This element is always rendered so Tailwind's build-time
        scanner sees the class names literally in JSX and includes their
        CSS rules in the bundle. Without this, classList.add(...) at
        runtime would add class names for which no CSS exists.
        Positioned off-screen and marked aria-hidden.
      */}
      <span
        aria-hidden
        className="!bg-black !text-white cursor-wait absolute -left-[9999px] top-0 w-px h-px overflow-hidden"
      />
      {active && (
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
      )}
    </>
  );
}

// Inline pending-state helpers. Uses direct style + pointerEvents rather
// than a CSS class so no globals.css rule is needed.

const PENDING_TAG = "data-nav-pending";

// Tailwind classes toggled on/off at runtime via classList. The
// `!` prefix compiles to !important, so they beat the row's own
// bg-red-50 / bg-amber-50 / text-tal-plum etc. A permanent sr-only
// element rendered below guarantees Tailwind's build-time scanner
// includes these class rules in the CSS bundle.
const PENDING_ANCHOR_CLASSES = [
  "!bg-black",
  "!text-white",
  "cursor-wait",
];
const PENDING_CHILD_CLASSES = ["!text-white"];

function applyAnchorPending(el: HTMLAnchorElement): void {
  el.setAttribute(PENDING_TAG, "");
  el.dataset.navPrevPointerEvents = el.style.pointerEvents;
  el.dataset.navPrevAriaDisabled = el.getAttribute("aria-disabled") ?? "";
  el.style.pointerEvents = "none";
  el.setAttribute("aria-disabled", "true");
  el.classList.add(...PENDING_ANCHOR_CLASSES);
  el.querySelectorAll<HTMLElement>("*").forEach((child) => {
    child.classList.add(...PENDING_CHILD_CLASSES);
  });
  // Diagnostic — logs what the browser thinks the computed bg is after
  // classes are applied. Tells us whether Tailwind actually shipped the
  // !bg-black CSS rule.
  requestAnimationFrame(() => {
    const cs = window.getComputedStyle(el);
    // eslint-disable-next-line no-console
    console.log(
      "[NavPending]",
      "classes=", el.className,
      "computed bg=", cs.backgroundColor,
      "computed color=", cs.color
    );
  });
}

function clearAnchorPending(el: HTMLAnchorElement | null): void {
  if (!el || !el.hasAttribute(PENDING_TAG)) return;
  el.style.pointerEvents = el.dataset.navPrevPointerEvents ?? "";
  const prevAria = el.dataset.navPrevAriaDisabled ?? "";
  if (prevAria) el.setAttribute("aria-disabled", prevAria);
  else el.removeAttribute("aria-disabled");
  delete el.dataset.navPrevPointerEvents;
  delete el.dataset.navPrevAriaDisabled;
  el.classList.remove(...PENDING_ANCHOR_CLASSES);
  el.querySelectorAll<HTMLElement>("*").forEach((child) => {
    child.classList.remove(...PENDING_CHILD_CLASSES);
  });
  el.removeAttribute(PENDING_TAG);
}
