"use client";

import { useEffect } from "react";

// One-shot: if the browser's IANA time zone differs from what's saved on the
// user, POST it so the cron nudges at the right local hour.
export function TimezoneSync({ current }: { current: string | null }) {
  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!detected || detected === current) return;
      void fetch("/api/user/timezone", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ timezone: detected }),
      });
    } catch {
      // Older browsers without Intl support — ignore.
    }
  }, [current]);
  return null;
}
