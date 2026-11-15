"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// On the thank-you page while Stripe is still confirming: checks again every
// couple of seconds (for about half a minute) so the buyer doesn't have to
// refresh to see their order and downloads.
export function RefreshWhilePending() {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      router.refresh();
      if (tries >= 15) clearInterval(timer);
    }, 2000);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
