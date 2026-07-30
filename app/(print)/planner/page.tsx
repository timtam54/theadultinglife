import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { loadPlannerForUser } from "@/lib/services/planner";
import { PlannerReadOnlyView } from "@/components/PlannerReadOnlyView";
import { PrintTrigger } from "@/components/PrintTrigger";

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
  const printedOn = new Date().toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-8 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <div className="text-sm text-tal-plum-soft">
          Peace of Mind Planner — print preview
        </div>
        <PrintTrigger />
      </div>
      <PlannerReadOnlyView payload={payload} ownerName={ownerName} />
      <p className="mt-6 text-xs text-tal-plum-soft">Printed {printedOn}</p>
    </div>
  );
}
