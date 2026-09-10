"use client";

/*
 * Mounts inside the (app) layout. When `shouldAutoLaunch` is true, this
 * seeds the demo data via /api/tour/start then renders the TourEngine.
 * Handles the finish/skip lifecycle by POSTing /api/tour/finish and
 * hiding the tour.
 *
 * Also exposes an imperative "start now" behaviour: when the URL contains
 * `?tour=start`, it forces the tour to launch regardless of the auto-launch
 * flag. Used by the "Take the tour again" button so we don't need to
 * reload after resetting the DB flags.
 */

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TourEngine } from "@/components/tour/TourEngine";
import { TOUR_SCRIPT } from "@/lib/tour/script";

interface Props {
  shouldAutoLaunch: boolean;
}

export function TourLauncher({ shouldAutoLaunch }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceStart = searchParams.get("tour") === "start";
  const [active, setActive] = useState(false);
  const [seeded, setSeeded] = useState(false);

  // Decide whether to launch on mount / when force flag flips.
  useEffect(() => {
    if (shouldAutoLaunch || forceStart) {
      setActive(true);
    }
  }, [shouldAutoLaunch, forceStart]);

  // Seed demo data when the tour becomes active. Fire and forget — if it
  // fails the tour still runs (just with an empty matrix), and the error
  // is server-side visible in the logs.
  useEffect(() => {
    if (!active || seeded) return;
    let cancelled = false;
    (async () => {
      try {
        await fetch("/api/tour/start", { method: "POST" });
      } catch {
        // non-fatal
      }
      if (!cancelled) setSeeded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [active, seeded]);

  async function finalise() {
    setActive(false);
    try {
      await fetch("/api/tour/finish", { method: "POST" });
    } catch {
      // non-fatal — the layout will just not auto-launch again next visit
      // even if the stamp failed, because the client-side setActive(false)
      // hides it for this session.
    }
    // Strip ?tour=start from the URL if it was there.
    if (forceStart) {
      const url = new URL(window.location.href);
      url.searchParams.delete("tour");
      router.replace(url.pathname + url.search);
    } else {
      router.refresh();
    }
  }

  return (
    <TourEngine
      steps={TOUR_SCRIPT}
      active={active}
      onFinish={finalise}
      onSkip={finalise}
    />
  );
}
