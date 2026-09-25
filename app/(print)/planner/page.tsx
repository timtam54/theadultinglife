import type { Metadata } from "next";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { loadPlannerForUser } from "@/lib/services/planner";
import { PlannerReadOnlyView } from "@/components/PlannerReadOnlyView";
import { PlannerPrintChrome } from "./PlannerPrintChrome";
import { printFilename } from "@/lib/print-filename";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const session = await requireSession();
    const owner =
      [session.user.firstName, session.user.lastName]
        .filter(Boolean)
        .join(" ") ||
      session.user.name ||
      "";
    return {
      title: { absolute: printFilename("Peace of Mind Planner", owner) },
      robots: { index: false, follow: false },
    };
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return {
        title: { absolute: "Peace of Mind Planner" },
        robots: { index: false },
      };
    }
    throw e;
  }
}

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
