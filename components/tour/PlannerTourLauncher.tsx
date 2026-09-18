"use client";

/*
 * Mounts inside the Planner route. Opt-in only — fires when the URL
 * carries `?planner-tour=start`. That flag is pushed by:
 *   • the floating compass FAB (TourFab.tsx) when the user is on a
 *     Planner route
 *   • the "Replay Planner tour" button in Settings
 *
 * We deliberately do NOT auto-launch on first visit. The auto-launch
 * felt intrusive and users have two visible ways to trigger it.
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TourEngine } from "@/components/tour/TourEngine";
import { PLANNER_TOUR_SCRIPT } from "@/lib/tour/planner-script";

interface Props {
  shouldAutoLaunch: boolean;
}

export function PlannerTourLauncher({ shouldAutoLaunch }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceStart = searchParams.get("planner-tour") === "start";
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (shouldAutoLaunch || forceStart) {
      setActive(true);
    }
  }, [shouldAutoLaunch, forceStart]);

  function finalise() {
    setActive(false);
    if (forceStart) {
      const url = new URL(window.location.href);
      url.searchParams.delete("planner-tour");
      router.replace(url.pathname + url.search);
    }
  }

  return (
    <TourEngine
      steps={PLANNER_TOUR_SCRIPT}
      active={active}
      onFinish={finalise}
      onSkip={finalise}
    />
  );
}
