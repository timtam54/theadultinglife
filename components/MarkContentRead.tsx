"use client";

import { useEffect } from "react";
import { celebrate, type CelebrateBadge } from "@/lib/celebrate";

export function MarkContentRead({ itemId }: { itemId: string }) {
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/progress", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            itemType: "content",
            itemId,
            status: "completed",
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { newBadges?: CelebrateBadge[] };
        if (data.newBadges && data.newBadges.length > 0) {
          celebrate(data.newBadges);
        }
      } catch {
        // ignore
      }
    })();
  }, [itemId]);
  return null;
}
