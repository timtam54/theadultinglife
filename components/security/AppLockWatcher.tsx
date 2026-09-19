"use client";

/*
 * Client-side watcher that clears the session's unlockedAt claim when:
 *   1. The user has been idle for IDLE_MS (mousemove / touchstart /
 *      keydown / scroll reset the timer)
 *   2. On mobile only, the tab has been hidden for HIDDEN_GRACE_MOBILE_MS
 *
 * On either trigger, POST /api/security/lock followed by router.refresh()
 * causes the (app) layout to re-render with the AppLockGate visible.
 *
 * Tuned to match CommBank behaviour:
 *   - NetBank on desktop: 8 min idle timeout, no tab-switch lock. If you
 *     tab away and come back within the idle window, you're still in.
 *   - CommBank iOS/Android app: ~1 min grace on backgrounding, then
 *     PIN required.
 *
 * On our app:
 *   - Desktop browsers → 8 min idle. Visibility changes are ignored.
 *   - Mobile (touch-capable OR installed PWA) → 8 min idle AND 1 min
 *     hidden = lock.
 *
 * Only mounted for users who actually have a PIN set — otherwise this
 * is a no-op.
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const IDLE_MS = 8 * 60 * 1000;
const HIDDEN_GRACE_MOBILE_MS = 60 * 1000;

// True on any touch-capable device or when running as an installed PWA
// (standalone display mode). Used to decide whether to arm the hidden-tab
// lock trigger — desktop browsers skip it entirely.
function isMobileSurface(): boolean {
  if (typeof window === "undefined") return false;
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const isTouch =
    "ontouchstart" in window ||
    (navigator.maxTouchPoints ?? 0) > 0;
  return isStandalone || isTouch;
}

interface Props {
  enabled: boolean;
}

export function AppLockWatcher({ enabled }: Props) {
  const router = useRouter();
  const timerRef = useRef<number | null>(null);
  const hiddenTimerRef = useRef<number | null>(null);
  const lockingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const mobile = isMobileSurface();

    async function lock() {
      if (lockingRef.current) return;
      lockingRef.current = true;
      try {
        await fetch("/api/security/lock", { method: "POST" });
      } catch {
        /* non-fatal */
      }
      router.refresh();
      // Give the refresh a moment then release so a subsequent unlock
      // can re-lock again later.
      setTimeout(() => {
        lockingRef.current = false;
      }, 500);
    }

    function resetIdleTimer() {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(lock, IDLE_MS);
    }

    function onVisibility() {
      // Desktop browsers: ignore visibility changes entirely. Matches
      // CommBank NetBank — tab-switching doesn't kick you out; only the
      // idle timeout does.
      if (!mobile) return;
      if (document.visibilityState === "hidden") {
        if (hiddenTimerRef.current) window.clearTimeout(hiddenTimerRef.current);
        hiddenTimerRef.current = window.setTimeout(lock, HIDDEN_GRACE_MOBILE_MS);
      } else {
        if (hiddenTimerRef.current) {
          window.clearTimeout(hiddenTimerRef.current);
          hiddenTimerRef.current = null;
        }
        resetIdleTimer();
      }
    }

    const events: (keyof DocumentEventMap)[] = [
      "mousemove",
      "keydown",
      "touchstart",
      "scroll",
    ];
    for (const e of events) {
      document.addEventListener(e, resetIdleTimer, { passive: true });
    }
    if (mobile) {
      document.addEventListener("visibilitychange", onVisibility);
    }
    resetIdleTimer();

    return () => {
      for (const e of events) {
        document.removeEventListener(e, resetIdleTimer);
      }
      if (mobile) {
        document.removeEventListener("visibilitychange", onVisibility);
      }
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (hiddenTimerRef.current) window.clearTimeout(hiddenTimerRef.current);
    };
  }, [enabled, router]);

  return null;
}
