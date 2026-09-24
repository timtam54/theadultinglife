import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { loadPlannerForUser } from "@/lib/services/planner";
import { PlannerReadOnlyView } from "@/components/PlannerReadOnlyView";
import { PlannerPrintChrome } from "./PlannerPrintChrome";

export const metadata: Metadata = {
  title: "Print · Peace of Mind Planner",
  robots: { index: false, follow: false },
};

export default async function PlannerPrintPage() {
  const session = await requireSession();
  const payload = await loadPlannerForUser(session.user.id);
  const ownerName =
    [session.user.firstName, session.user.lastName].filter(Boolean).join(" ") ||
    session.user.name ||
    null;

  return (
    <PlannerPrintChrome
      title="Peace of Mind Planner"
      subtitle="The Adulting Life"
      userName={ownerName ?? undefined}
    >
      <PlannerReadOnlyView payload={payload} ownerName={ownerName} />
    </PlannerPrintChrome>
  );
}
