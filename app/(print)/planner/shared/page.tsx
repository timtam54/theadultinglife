import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { listGrantsByGrantee, listGrantsByOwner } from "@/lib/db/item-access";
import { loadPlannerDocument } from "@/lib/services/planner-document";
import { PlannerDocumentView } from "@/components/PlannerDocumentView";
import { printFilename } from "@/lib/print-filename";
import { PlannerPrintChrome } from "../PlannerPrintChrome";

// What one person has shared with one trusted person, as a single Planner
// document in the physical Planner's order.
//   ?with=<userId>  — the owner printing what that person can see
//   ?from=<userId>  — the trusted person printing what that owner shared
type Props = { searchParams: Promise<{ with?: string; from?: string }> };

async function resolve(props: Props) {
  const session = await requireSession();
  const { with: withId, from: fromId } = await props.searchParams;
  if (withId) {
    const grants = await listGrantsByOwner(session.user.id);
    if (!grants.some((g) => g.grantee_user_id === withId)) return null;
    return { ownerUserId: session.user.id, granteeUserId: withId };
  }
  if (fromId) {
    const grants = await listGrantsByGrantee(session.user.id);
    if (!grants.some((g) => g.owner_user_id === fromId)) return null;
    return { ownerUserId: fromId, granteeUserId: session.user.id };
  }
  return null;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const ids = await resolve(props).catch(() => null);
  if (!ids) return { title: { absolute: "Shared Planner" }, robots: { index: false } };
  const doc = await loadPlannerDocument(ids);
  return {
    title: { absolute: printFilename(`Peace of Mind Planner for ${doc.preparedFor}`, doc.ownerName) },
    robots: { index: false, follow: false },
  };
}

export default async function SharedPlannerPrintPage(props: Props) {
  const ids = await resolve(props);
  if (!ids) notFound();
  const doc = await loadPlannerDocument(ids);
  return (
    <PlannerPrintChrome title="Peace of Mind Planner" header={false}>
      <PlannerDocumentView doc={doc} />
    </PlannerPrintChrome>
  );
}
