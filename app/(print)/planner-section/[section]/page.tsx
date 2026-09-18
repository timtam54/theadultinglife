import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { loadPlannerForUser, type PlannerPayload } from "@/lib/services/planner";
import { plannerSectionBySlug } from "@/lib/templates/peace-of-mind-v2";
import { PlannerReadOnlyView } from "@/components/PlannerReadOnlyView";
import { PrintTrigger } from "@/components/PrintTrigger";
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
  const { section } = await params;
  const meta = plannerSectionBySlug(section);
  return {
    title: `Print · ${meta?.title ?? "Planner section"}`,
    robots: { index: false, follow: false },
  };
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
  const printedOn = new Date().toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-8 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <div className="text-sm text-tal-plum-soft">
          {meta.title} — print preview
        </div>
        <PrintTrigger />
      </div>

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
          ownerName={ownerName}
          title={meta.title}
        />
      )}

      <p className="mt-6 text-xs text-tal-plum-soft">Printed {printedOn}</p>
    </div>
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
  ownerName,
  title,
}: {
  slug: string;
  userId: string;
  ownerName: string | null;
  title: string;
}) {
  // Load the appropriate planner-only data + any shared items for the same
  // kind. Render inline — no PlannerReadOnlyView (which expects organiser
  // sections). Keeps the print output honest to what the user sees on the
  // section page.
  if (slug === "letters") {
    const [own, shared] = await Promise.all([
      listPlannerLetters(userId),
      loadSharedPlannerItems(userId, "planner_letter"),
    ]);
    return (
      <>
        <PrintHeader ownerName={ownerName} title={title} />
        {own.length === 0 && shared.length === 0 && <EmptyNote />}
        {own.map((l) => (
          <TextBlock key={l.id} heading={`Dear ${l.recipient ?? "…"}`} body={l.body} />
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
        <PrintHeader ownerName={ownerName} title={title} />
        {own.length === 0 && shared.length === 0 && <EmptyNote />}
        {own.map((a) => (
          <TextBlock key={a.id} heading={`To ${a.recipient ?? "…"}`} body={a.body} />
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
        <PrintHeader ownerName={ownerName} title={title} />
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
        <PrintHeader ownerName={ownerName} title={title} />
        {!row?.body && shared.length === 0 && <EmptyNote />}
        {row?.body && <TextBlock body={row.body} />}
        {shared.length > 0 && <SharedItemsView items={shared} />}
      </>
    );
  }
  return <EmptyNote />;
}

function PrintHeader({
  ownerName,
  title,
}: {
  ownerName: string | null;
  title: string;
}) {
  return (
    <header className="mb-6">
      <h1 className="font-display text-2xl sm:text-3xl text-tal-plum leading-tight">
        {title}
        {ownerName ? <span className="text-tal-plum-soft"> — {ownerName}</span> : null}
      </h1>
    </header>
  );
}

function TextBlock({ heading, body }: { heading?: string; body: string }) {
  return (
    <section className="rounded-2xl border border-tal-line bg-white p-5 mb-4">
      {heading && (
        <h2 className="font-display text-lg text-tal-plum mb-2">{heading}</h2>
      )}
      <div className="text-sm text-tal-plum whitespace-pre-wrap font-serif">
        {body}
      </div>
    </section>
  );
}

function EmptyNote() {
  return (
    <p className="text-sm text-tal-plum-soft italic">Nothing to print yet.</p>
  );
}
