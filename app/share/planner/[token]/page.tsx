import type { Metadata } from "next";
import { getPlannerShareByToken } from "@/lib/db/planner-shares";
import { loadPlannerDocument } from "@/lib/services/planner-document";
import { PlannerDocumentView } from "@/components/PlannerDocumentView";
import { PrintThisButton } from "./PrintThisButton";
import { PrintStyles } from "@/components/print/PrintChrome";

export const metadata: Metadata = {
  title: "Shared Peace of Mind Planner",
  robots: { index: false, follow: false },
};

export default async function PublicPlannerSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const share = await getPlannerShareByToken(token);

  if (!share) {
    return (
      <main className="min-h-screen bg-tal-cream-soft flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl bg-white border border-tal-line p-8 text-center">
          <h1 className="font-display text-2xl text-tal-plum mb-2">
            Link unavailable
          </h1>
          <p className="text-sm text-tal-plum-soft">
            This share link has expired, been revoked, or the URL is
            incorrect. Please ask the person who shared it for a new link.
          </p>
        </div>
      </main>
    );
  }

  // The whole current Planner, laid out like the physical Planner.
  const doc = await loadPlannerDocument({ ownerUserId: share.user_id });
  const expiresOn = new Date(share.expires_at).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-tal-cream-soft print:bg-white">
      <PrintStyles />
      <div className="max-w-4xl mx-auto p-6 sm:p-8 print:p-0">
        <div className="print:hidden mb-4 rounded-xl bg-white border border-tal-line px-4 py-3 text-xs text-tal-plum-soft flex items-center justify-between gap-3 flex-wrap">
          <span>
            You are viewing a read-only shared copy. Link expires {expiresOn}.
          </span>
          <PrintThisButton />
        </div>
        <div className="rounded-2xl bg-white border border-tal-line p-6 sm:p-8 print:border-0 print:p-0">
          <PlannerDocumentView doc={doc} />
        </div>
      </div>
    </main>
  );
}
