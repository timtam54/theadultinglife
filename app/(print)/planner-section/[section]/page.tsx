import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { loadPlannerDocument } from "@/lib/services/planner-document";
import { plannerSectionBySlug } from "@/lib/templates/peace-of-mind-v2";
import { PlannerSectionBlocks } from "@/components/PlannerDocumentView";
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
import { PlannerPeopleView } from "@/components/PlannerPeopleView";
import { loadPlannerPeople, peopleForEditor } from "@/lib/services/planner-people";

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
          slug={section}
          subcategoryId={meta.organiserSubcategoryId}
          userId={session.user.id}
        />
      ) : (
        <PlannerOnlySectionPrint
          slug={section}
          userId={session.user.id}
          familyGroupId={session.user.familyGroupId}
        />
      )}
    </PlannerPrintChrome>
  );
}

async function OrganiserSectionPrint({
  slug,
  subcategoryId,
  userId,
}: {
  slug: string;
  subcategoryId: string;
  userId: string;
}) {
  const [doc, shared] = await Promise.all([
    loadPlannerDocument({ ownerUserId: userId }),
    loadSharedItemsForSection(userId, subcategoryId),
  ]);
  const own = doc.groups.flatMap((g) => g.sections).find((s) => s.slug === slug);
  return (
    <>
      {!own && shared.length === 0 && <EmptyNote />}
      {own && <PlannerSectionBlocks section={own} />}
      {shared.length > 0 && <SharedItemsView items={shared} />}
    </>
  );
}

async function PlannerOnlySectionPrint({
  slug,
  userId,
  familyGroupId,
}: {
  slug: string;
  userId: string;
  familyGroupId: string;
}) {
  if (slug === "my-personal-information" || slug === "family-members") {
    const meta = plannerSectionBySlug(slug);
    const editor = meta?.plannerEditor;
    if (editor !== "people-self" && editor !== "people-family") return <EmptyNote />;
    const people = peopleForEditor(editor, await loadPlannerPeople(userId, familyGroupId));
    return people.length === 0 ? <EmptyNote /> : <PlannerPeopleView people={people} emptyText="" />;
  }
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
