"use client";

import { useEffect } from "react";
import { celebrate, type CelebrateBadge } from "@/lib/celebrate";

// Records that the user opened a lesson today, so the streak ticks and
// any milestone badges (first-lesson etc.) get awarded. Does NOT mark
// the article as read — that's handled by the explicit Mark as read button.
export function RecordLearnVisit() {
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/learn-activity", { method: "POST" });
        if (!res.ok) return;
        const data = (await res.json()) as { newBadges?: CelebrateBadge[] };
        if (data.newBadges && data.newBadges.length > 0) {
          celebrate(data.newBadges);
        }
      } catch {
        // ignore
      }
    })();
  }, []);
  return null;
}
