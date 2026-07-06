"use client";

import { useEffect } from "react";

export function MarkContentRead({ itemId }: { itemId: string }) {
  useEffect(() => {
    fetch("/api/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        itemType: "content",
        itemId,
        status: "completed",
      }),
    }).catch(() => {});
  }, [itemId]);
  return null;
}
