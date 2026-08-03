import type { Metadata } from "next";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { requireSession } from "@/lib/auth/session";
import { loadPlannerForUser } from "@/lib/services/planner";
import { PlannerReadOnlyView } from "@/components/PlannerReadOnlyView";

export const metadata: Metadata = {
  title: "Preview · Peace of Mind Planner",
};

export default async function PlannerPreviewPage() {
  const session = await requireSession();
  const payload = await loadPlannerForUser(session.user.id);
  const ownerName = session.user.firstName ?? session.user.name ?? null;

  return (
    <div>
      <div className="text-sm text-tal-plum-soft mb-1">
        <Link href="/dashboard" className="hover:text-tal-plum">
          Dashboard
        </Link>{" "}
        ·{" "}
        <Link
          href="/templates/peace-of-mind-planner"
          className="hover:text-tal-plum"
        >
          Peace of Mind Planner
        </Link>{" "}
        · Preview
      </div>

      <div className="flex items-center justify-end gap-2 mb-4">
        <Link
          href="/planner"
          title="Print"
          aria-label="Print"
          className="h-9 w-9 rounded-lg border border-tal-line bg-white text-tal-plum hover:shadow-sm inline-flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M7 9V4h10v5M7 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <rect x="7" y="14" width="10" height="6" rx="1" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </Link>
        <Link
          href="/templates/peace-of-mind-planner"
          className="h-9 px-3 rounded-lg bg-black text-white text-sm font-medium inline-flex items-center"
        >
          Edit
        </Link>
      </div>

      <PlannerReadOnlyView payload={payload} ownerName={ownerName} />
    </div>
  );
}
