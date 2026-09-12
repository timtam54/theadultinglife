"use client";

/*
 * Client-side watcher that clears the session's unlockedAt claim when:
 *   1. The user has been idle for APP_LOCK_TIMEOUT_MS (mousemove /
 *      touchstart / keydown all reset the timer)
 *   2. The tab is hidden (visibilitychange → hidden)
 *
 * On either trigger, POST /api/security/lock followed by router.refresh()
 * causes the (app) layout to re-render with the AppLockGate visible.
 *
 * Only mounted for users who actually have a PIN set — otherwise this
 * is a no-op.
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const IDLE_MS = 15 * 60 * 1000;

interface Props {
  enabled: boolean;
}

export function AppLockWatcher({ enabled }: Props) {
  const router = useRouter();
  const timerRef = useRef<number | null>(null);
  const lockingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

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
      if (document.visibilityState === "hidden") {
        void lock();
      } else {
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
    document.addEventListener("visibilitychange", onVisibility);
    resetIdleTimer();

    return () => {
      for (const e of events) {
        document.removeEventListener(e, resetIdleTimer);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [enabled, router]);

  return null;
}
