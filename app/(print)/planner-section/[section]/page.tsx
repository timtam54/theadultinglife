import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { loadPlannerForUser, type PlannerPayload } from "@/lib/services/planner";
import { plannerSectionBySlug } from "@/lib/templates/peace-of-mind-v2";
import { PlannerReadOnlyView } from "@/components/PlannerReadOnlyView";
import { PlannerPrintChrome } from "../../planner/PlannerPrintChrome";
import { printFilename } from "@/lib/print-filename";
import {
  loadSharedItemsForSection,
  loadSharedPlannerItems,
} from "@/lib/services/shared-items";
import { SharedItemsView } from "@/components/SharedItemsView";
import { listPlannerLetters } from "@/lib/db/planner-letters";
import { listPlannerApologies } from "@/lib/db/planner-apologies";
import { getPlannerWish, type WishAudience } from "@/lib/db/planner-wishes";
import { getPlannerLastWords } from "@/lib/db/planner-last-words";

type Ctx = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  try {
    const session = await requireSession();
    const { section } = await params;
    const meta = plannerSectionBySlug(section);
    const owner =
      [session.user.firstName, session.user.lastName]
        .filter(Boolean)
        .join(" ") ||
      session.user.name ||
      "";
    return {
      title: {
        absolute: printFilename(meta?.title ?? "Planner section", owner),
      },
      robots: { index: false, follow: false },
    };
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return { title: { absolute: "Planner section" }, robots: { index: false } };
    }
    throw e;
  }
}

export default async function PlannerSectionPrintPage({ params }: Ctx) {
  const { section } = await params;
  const meta = plannerSectionBySlug(section);
  if (!meta) notFound();

  const session = await requireSession();
  const ownerName =
    [session.user.firstName, session.user.lastName].filter(Boolean).join(" ") ||
    session.user.name ||
    null;

  return (
    <PlannerPrintChrome
      title={meta.title}
      subtitle="Peace of Mind Planner"
      userName={ownerName ?? undefined}
    >
      {meta.kind === "organiser" && meta.organiserSubcategoryId ? (
        <OrganiserSectionPrint
          subcategoryId={meta.organiserSubcategoryId}
          userId={session.user.id}
          ownerName={ownerName}
        />
      ) : (
        <PlannerOnlySectionPrint
          slug={section}
          userId={session.user.id}
        />
      )}
    </PlannerPrintChrome>
  );
}

async function OrganiserSectionPrint({
  subcategoryId,
  userId,
  ownerName,
}: {
  subcategoryId: string;
  userId: string;
  ownerName: string | null;
}) {
  const [full, shared] = await Promise.all([
    loadPlannerForUser(userId),
    loadSharedItemsForSection(userId, subcategoryId),
  ]);
  const only = full.sections.filter((s) => s.subcategoryId === subcategoryId);
  const payload: PlannerPayload = {
    sections: only,
    filledCount: only.filter((s) => s.filled).length,
    totalCount: only.length,
    nextSlug: null,
    nextName: null,
  };
  return (
    <>
      <PlannerReadOnlyView payload={payload} ownerName={ownerName} />
      {shared.length > 0 && <SharedItemsView items={shared} />}
    </>
  );
}

async function PlannerOnlySectionPrint({
  slug,
  userId,
}: {
  slug: string;
  userId: string;
}) {
  if (slug === "letters") {
    const [own, shared] = await Promise.all([
      listPlannerLetters(userId),
      loadSharedPlannerItems(userId, "planner_letter"),
    ]);
    return (
      <>
        {own.length === 0 && shared.length === 0 && <EmptyNote />}
        {own.map((l) => (
          <TextBlock
            key={l.id}
            heading={`Dear ${l.recipient ?? "…"}`}
            body={l.body}
          />
        ))}
        {shared.length > 0 && <SharedItemsView items={shared} />}
      </>
    );
  }
  if (slug === "apologies") {
    const [own, shared] = await Promise.all([
      listPlannerApologies(userId),
      loadSharedPlannerItems(userId, "planner_apology"),
    ]);
    return (
      <>
        {own.length === 0 && shared.length === 0 && <EmptyNote />}
        {own.map((a) => (
          <TextBlock
            key={a.id}
            heading={`To ${a.recipient ?? "…"}`}
            body={a.body}
          />
        ))}
        {shared.length > 0 && <SharedItemsView items={shared} />}
      </>
    );
  }
  if (slug === "last-words") {
    const [row, shared] = await Promise.all([
      getPlannerLastWords(userId),
      loadSharedPlannerItems(userId, "planner_last_words"),
    ]);
    return (
      <>
        {!row?.body && shared.length === 0 && <EmptyNote />}
        {row?.body && <TextBlock body={row.body} />}
        {shared.length > 0 && <SharedItemsView items={shared} />}
      </>
    );
  }
  if (slug.startsWith("wishes-")) {
    const audience = slug.slice("wishes-".length) as WishAudience;
    const [row, shared] = await Promise.all([
      getPlannerWish(userId, audience),
      loadSharedPlannerItems(userId, "planner_wish", audience),
    ]);
    return (
      <>
        {!row?.body && shared.length === 0 && <EmptyNote />}
        {row?.body && <TextBlock body={row.body} />}
        {shared.length > 0 && <SharedItemsView items={shared} />}
      </>
    );
  }
  return <EmptyNote />;
}

function TextBlock({ heading, body }: { heading?: string; body: string }) {
  return (
    <section className="rounded-lg border border-tal-plum-dark/20 p-5 mb-4 print-avoid-break">
      {heading && (
        <h2 className="font-display text-lg text-tal-plum-dark mb-2">
          {heading}
        </h2>
      )}
      <div className="text-sm text-tal-plum-dark whitespace-pre-wrap font-serif">
        {body}
      </div>
    </section>
  );
}

function EmptyNote() {
  return (
    <p className="text-sm text-tal-plum-soft italic text-center py-8">
      Nothing to print yet.
    </p>
  );
}
