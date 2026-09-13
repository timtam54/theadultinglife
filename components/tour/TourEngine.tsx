"use client";

/*
 * Interactive tour engine.
 *
 * Reads a script of steps (see TOUR_SCRIPT in lib/tour/script.ts), finds
 * each step's target element in the live DOM via a data-tour selector,
 * dims everything else with a backdrop, and shows a callout beside the
 * highlighted element with Back / Skip / Next controls.
 *
 * Navigation between routes is supported: a step can specify `href` and
 * the engine will call router.push() before waiting for the target
 * element to appear. Uses a MutationObserver + timeout so it works even
 * when the target renders asynchronously.
 *
 * No third-party lib. Purpose-built so we own the code and can tweak
 * without waiting on upstream changes.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { TourStep } from "@/lib/tour/script";

interface Props {
  steps: readonly TourStep[];
  /** Called when the tour finishes normally (user clicked Next past last). */
  onFinish: () => void;
  /** Called when the user explicitly skipped mid-tour. */
  onSkip: () => void;
  /** Fires on mount only. Controls whether the tour is visible right now.
   *  Parent flips this off after finish/skip. */
  active: boolean;
  /** Initial step index. Defaults to 0. */
  initialStep?: number;
}

type Rect = { top: number; left: number; width: number; height: number };

export function TourEngine({
  steps,
  onFinish,
  onSkip,
  active,
  initialStep = 0,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [i, setI] = useState(initialStep);
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const step = steps[i];
  const isLast = i === steps.length - 1;
  const isFirst = i === 0;

  // Lock body scroll while the tour is up.
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  // Escape asks to skip; click on backdrop asks to skip.
  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setConfirmSkip(true);
      if (e.key === "ArrowRight" && ready) advance();
      if (e.key === "ArrowLeft" && !isFirst) back();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ready, isFirst]);

  // Locate the target element for the current step. Navigates to step.href
  // first (if provided and we're not there yet), then waits up to ~4s for
  // the target to appear (target may be async — e.g. matrix row after data
  // load). MutationObserver watches DOM; falls back to a poll if the
  // observer never fires.
  useEffect(() => {
    if (!active || !step) return;
    setReady(false);
    setRect(null);

    let cancelled = false;
    let observer: MutationObserver | null = null;
    let pollId: number | null = null;
    let timeoutId: number | null = null;

    const tryFind = () => {
      if (cancelled) return false;
      const el = step.selector
        ? (document.querySelector(step.selector) as HTMLElement | null)
        : null;
      if (!step.selector) {
        // Centered callout, no highlight.
        setRect(null);
        setReady(true);
        return true;
      }
      if (!el) return false;
      // Scroll into view (block:center works well on desktop; nearest on mobile).
      el.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "smooth",
      });
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
      setReady(true);
      return true;
    };

    async function begin() {
      // Route navigation if needed.
      if (step.href && pathname !== step.href) {
        router.push(step.href);
        // Give Next.js a moment to route before we start observing.
        await new Promise((r) => setTimeout(r, 200));
      }
      if (cancelled) return;
      if (tryFind()) return;
      observer = new MutationObserver(() => {
        if (tryFind() && observer) {
          observer.disconnect();
          observer = null;
        }
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
      // Poll fallback in case the target already exists but is hidden.
      pollId = window.setInterval(() => {
        if (tryFind() && pollId) {
          window.clearInterval(pollId);
          pollId = null;
        }
      }, 250);
      // Give up after 4s — mark ready without a rect so the callout still
      // shows (centered) with the copy.
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        setReady(true);
      }, 4000);
    }
    void begin();

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      if (pollId) window.clearInterval(pollId);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, active]);

  // Recompute rect on window resize / scroll so the callout stays anchored.
  useEffect(() => {
    if (!active || !ready || !step?.selector) return;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = document.querySelector(step.selector!) as HTMLElement | null;
        if (!el) return;
        const r = el.getBoundingClientRect();
        setRect({
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height,
        });
      });
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      cancelAnimationFrame(raf);
    };
  }, [active, ready, step]);

  const back = useCallback(() => {
    if (i > 0) {
      // Clear the stale rect BEFORE we render the new step so the callout
      // doesn't briefly position itself against the previous target.
      setRect(null);
      setReady(false);
      setI((n) => n - 1);
    }
  }, [i]);

  const advance = useCallback(() => {
    if (isLast) {
      onFinish();
    } else {
      setRect(null);
      setReady(false);
      setI((n) => n + 1);
    }
  }, [isLast, onFinish]);

  const placement = useMemo(() => calloutPlacement(rect, step?.placement), [rect, step]);

  if (!active || !step) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] pointer-events-none"
      aria-live="polite"
    >
      {/* Backdrop — only when there's no highlight cutout. When there is a
          cutout, the highlight's giant box-shadow ring IS the backdrop, so
          rendering both would stack two dark layers over the highlighted
          element and make it look blacked out. */}
      {(!rect || !ready) && (
        <button
          type="button"
          aria-label="Backdrop — press Escape to skip"
          onClick={() => setConfirmSkip(true)}
          className="absolute inset-0 bg-black/55 pointer-events-auto"
          style={{
            transition: "opacity 200ms ease",
          }}
        />
      )}

      {/* Highlight cutout. The box-shadow acts as the backdrop everywhere
          outside the rect; the rect's interior is transparent so the
          underlying element shows through clearly. */}
      {rect && ready && (
        <>
          <button
            type="button"
            aria-label="Backdrop — press Escape to skip"
            onClick={() => setConfirmSkip(true)}
            aria-hidden={false}
            className="absolute rounded-xl pointer-events-auto"
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
              transition:
                "top 200ms ease, left 200ms ease, width 200ms ease, height 200ms ease",
            }}
          />
          <div
            aria-hidden
            className="absolute rounded-xl ring-4 ring-white pointer-events-none"
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              transition:
                "top 200ms ease, left 200ms ease, width 200ms ease, height 200ms ease",
            }}
          />
        </>
      )}

      {/* Callout — pinned to the bottom-center of the viewport, guaranteed
          on-screen. The highlighted element's ring shows WHAT is being
          pointed at; the callout carries the copy. Simpler + more robust
          than trying to anchor the card next to arbitrary DOM at any
          scroll position or viewport width. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-callout-title"
        className="fixed left-1/2 bottom-6 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-md rounded-2xl shadow-2xl p-5 pointer-events-auto text-white overflow-hidden ring-1 ring-white/20"
        style={{
          background:
            "linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #0284c7 100%)",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/80 font-semibold">
            <span
              aria-hidden
              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/15"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            Tour · Step {i + 1} of {steps.length}
          </span>
        </div>
        <h3
          id="tour-callout-title"
          className="font-display text-lg leading-tight"
        >
          {step.title}
        </h3>
        <p className="text-sm text-white/85 mt-2 leading-relaxed">
          {step.body}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setConfirmSkip(true)}
            className="text-xs text-white/70 hover:text-white underline underline-offset-2"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={back}
                className="h-9 px-3 rounded-lg border border-white/30 bg-white/10 text-sm text-white hover:bg-white/20"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={advance}
              disabled={!ready}
              className="h-9 px-4 rounded-lg bg-white text-blue-700 text-sm font-semibold disabled:opacity-40 inline-flex items-center gap-1.5 hover:bg-blue-50"
            >
              {isLast ? (
                <>
                  Finish
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M5 12l5 5 9-11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              ) : (
                <>
                  Next
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Skip confirmation */}
      {confirmSkip && (
        <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-auto">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5">
            <h4 className="font-display text-lg text-tal-plum">Skip the tour?</h4>
            <p className="text-sm text-tal-plum-soft mt-1">
              You can replay it any time from Settings.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmSkip(false)}
                className="h-9 px-3 rounded-lg border border-tal-line text-sm text-tal-plum"
              >
                Keep going
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmSkip(false);
                  onSkip();
                }}
                className="h-9 px-4 rounded-lg bg-tal-plum text-white text-sm font-medium"
              >
                Yes, skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Decide where to put the callout relative to the highlighted rect.
 *  Prefers the placement the step requested; falls back to the side with
 *  the most space. Centered if there's no rect. */
function calloutPlacement(
  rect: Rect | null,
  preferred?: "top" | "bottom" | "left" | "right" | "center"
): { top: string | number; left: string | number; transform: string } {
  if (!rect || preferred === "center") {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const vw = typeof window === "undefined" ? 400 : window.innerWidth;
  // Safety net: if the highlighted rect is entirely off-screen (stale
  // rect from a page we've since navigated away from, or a negative
  // coordinate mid-scroll), we can't anchor to it. Fall back to a
  // centered callout so the user always sees the copy.
  if (
    rect.left + rect.width < 0 ||
    rect.left > vw ||
    rect.top + rect.height < 0 ||
    rect.top > vh
  ) {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }
  const spaces = {
    top: rect.top,
    bottom: vh - (rect.top + rect.height),
    left: rect.left,
    right: vw - (rect.left + rect.width),
  };
  const side =
    preferred && spaces[preferred] > 200
      ? preferred
      : (Object.entries(spaces).sort((a, b) => b[1] - a[1])[0][0] as
          | "top"
          | "bottom"
          | "left"
          | "right");

  const gap = 16;
  // Callout is w-[92vw] max-w-sm = min(92% of viewport, 384px). Use half
  // for centering clamps so the card can never overflow the viewport.
  const calloutHalfWidth = Math.min(vw * 0.46, 192);
  const edgePad = 12; // keep at least this many px from the viewport edge

  switch (side) {
    case "top":
      return {
        top: rect.top - gap,
        left: clamp(
          rect.left + rect.width / 2,
          calloutHalfWidth + edgePad,
          vw - calloutHalfWidth - edgePad
        ),
        transform: "translate(-50%, -100%)",
      };
    case "bottom":
      return {
        top: rect.top + rect.height + gap,
        left: clamp(
          rect.left + rect.width / 2,
          calloutHalfWidth + edgePad,
          vw - calloutHalfWidth - edgePad
        ),
        transform: "translate(-50%, 0)",
      };
    case "left":
      return {
        top: rect.top + rect.height / 2,
        left: rect.left - gap,
        transform: "translate(-100%, -50%)",
      };
    case "right":
    default:
      return {
        top: rect.top + rect.height / 2,
        left: rect.left + rect.width + gap,
        transform: "translate(0, -50%)",
      };
  }
}

function clamp(value: number, min: number, max: number): number {
  if (min > max) return (min + max) / 2;
  return Math.min(Math.max(value, min), max);
}
