import type { Metadata } from "next";
import { getPlannerShareByToken } from "@/lib/db/planner-shares";
import { findUserById } from "@/lib/db/users";
import { loadPlannerForUser } from "@/lib/services/planner";
import { PlannerReadOnlyView } from "@/components/PlannerReadOnlyView";

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

  const [owner, payload] = await Promise.all([
    findUserById(share.user_id),
    loadPlannerForUser(share.user_id),
  ]);
  const ownerName =
    (owner &&
      ([owner.first_name, owner.last_name].filter(Boolean).join(" ") ||
        owner.name ||
        null)) ||
    null;
  const expiresOn = new Date(share.expires_at).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-tal-cream-soft">
      <div className="max-w-4xl mx-auto p-6 sm:p-8">
        <div className="mb-4 rounded-xl bg-white border border-tal-line px-4 py-3 text-xs text-tal-plum-soft flex items-center justify-between gap-3 flex-wrap">
          <span>
            You are viewing a read-only shared copy. Link expires {expiresOn}.
          </span>
          <span className="uppercase tracking-widest text-[10px]">
            The Adulting Life
          </span>
        </div>
        <PlannerReadOnlyView payload={payload} ownerName={ownerName} />
      </div>
    </main>
  );
}
