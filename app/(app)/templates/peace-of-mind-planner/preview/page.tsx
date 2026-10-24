import type { Metadata } from "next";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { requireSession } from "@/lib/auth/session";
import { loadPlannerDocument } from "@/lib/services/planner-document";
import { PlannerDocumentView } from "@/components/PlannerDocumentView";
import { PdfActions } from "@/components/PdfActions";

export const metadata: Metadata = {
  title: "Preview · Peace of Mind Planner",
};

export default async function PlannerPreviewPage() {
  const session = await requireSession();
  const doc = await loadPlannerDocument({ ownerUserId: session.user.id });

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
        <PdfActions
          downloadUrl="/api/export/doc?kind=planner"
          shareUrl="/api/export/doc/email"
          shareBody={{ kind: "planner" }}
          shareLabel="Your Peace of Mind Planner (PDF), made by The Adulting Life"
          what="the whole Planner"
        />
        <Link
          href="/templates/peace-of-mind-planner"
          className="h-9 px-3 rounded-lg bg-black text-white text-sm font-medium inline-flex items-center"
        >
          Edit
        </Link>
      </div>

      <div className="rounded-2xl border border-tal-line bg-white p-6 sm:p-8">
        <PlannerDocumentView doc={doc} />
      </div>
    </div>
  );
}
