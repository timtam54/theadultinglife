"use client";

import { useEffect, useState } from "react";
import { celebrate, type CelebrateBadge } from "@/lib/celebrate";

export function MarkContentRead({ itemId }: { itemId: string }) {
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [alreadyRead, setAlreadyRead] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/progress");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          progress?: { item_type: string; item_id: string; status: string }[];
        };
        const already = (data.progress ?? []).some(
          (p) =>
            p.item_type === "content" &&
            p.item_id === itemId &&
            p.status === "completed"
        );
        if (already) setAlreadyRead(true);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  if (alreadyRead || status === "done") {
    return (
      <div className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-700 font-medium">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 12l4 4 10-10"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Marked as read
      </div>
    );
  }

  async function markRead() {
    if (status === "saving") return;
    setStatus("saving");
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
      if (!res.ok) {
        setStatus("idle");
        return;
      }
      const data = (await res.json()) as { newBadges?: CelebrateBadge[] };
      if (data.newBadges && data.newBadges.length > 0) {
        celebrate(data.newBadges);
      }
      setStatus("done");
    } catch {
      setStatus("idle");
    }
  }

  return (
    <button
      type="button"
      onClick={markRead}
      disabled={status === "saving"}
      className="mt-4 inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-tal-plum text-white text-sm font-medium hover:bg-tal-plum-dark disabled:opacity-60"
    >
      {status === "saving" ? "Saving…" : "Mark as read"}
    </button>
  );
}
