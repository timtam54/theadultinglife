import type { Metadata } from "next";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getUserSubcategory } from "@/lib/services/subcategories";
import { listUserRecords } from "@/lib/services/records";
import { loadPageFormBySubcategory } from "@/lib/services/pageForm";
import { plannerSectionBySlug } from "@/lib/templates/peace-of-mind-v2";
import { SubcategoryRecordsList } from "@/components/SubcategoryRecordsList";
import { PageForm } from "@/components/PageForm";
import { PlannerLettersEditor } from "@/components/PlannerLettersEditor";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import { ShareButton } from "@/components/ShareButton";
import { SharedItemsView } from "@/components/SharedItemsView";
import {
  loadSharedItemsForSection,
  loadSharedPlannerItems,
  userHasOwnContentInSubcategory,
} from "@/lib/services/shared-items";
import { PlannerApologiesEditor } from "@/components/PlannerApologiesEditor";
import { PlannerSingleTextEditor } from "@/components/PlannerSingleTextEditor";
import { listAllTagsForUser } from "@/lib/db/records";
import { listPlannerLetters } from "@/lib/db/planner-letters";
import { listPlannerApologies } from "@/lib/db/planner-apologies";
import { getPlannerWish, type WishAudience } from "@/lib/db/planner-wishes";
import { getPlannerLastWords } from "@/lib/db/planner-last-words";
import type { RecordField, RecordRow } from "@/lib/db/types";

type Ctx = {
  params: Promise<{ section: string }>;
};

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { section } = await params;
  const meta = plannerSectionBySlug(section);
  if (!meta) return {};
  return { title: `${meta.title} · Peace of Mind Planner` };
}

export default async function PlannerSectionPage({ params }: Ctx) {
  const { section } = await params;
  const meta = plannerSectionBySlug(section);
  if (!meta) notFound();

  const session = await requireSession();

  // -- Organiser-fed section: same underlying data as the Organiser folder.
  //    Detect page-form vs records-mode and render the right editor.
  if (meta.kind === "organiser") {
    if (!meta.organiserSubcategoryId || !meta.organiserCategoryId) notFound();
    const folder = await getUserSubcategory(
      session.user.id,
      meta.organiserSubcategoryId
    );
    if (!folder) notFound();

    // page-form check: does this subcategory have any page_questions?
    const pageForm = await loadPageFormBySubcategory(
      session.user.id,
      meta.organiserSubcategoryId,
      session.user.id,
      folder.repeatable
    );
    const hasForm = pageForm.questions.length > 0;
    const pageGroup = hasForm ? pageForm.questions[0].page_group : null;

    const [sharedItems, hasOwnContent] = await Promise.all([
      loadSharedItemsForSection(session.user.id, meta.organiserSubcategoryId),
      userHasOwnContentInSubcategory(
        session.user.id,
        meta.organiserSubcategoryId
      ),
    ]);

    // A user who has no content of their own in this section but has items
    // shared with them is treated as a grantee-only viewer here — we hide the
    // owner-editable form so they don't see empty "add your own" affordances
    // that don't apply to them.
    const granteeOnly = !hasOwnContent && sharedItems.length > 0;

    return (
      <div>
        <Breadcrumbs sectionTitle={meta.title} />
        <div className="flex items-start justify-between gap-3 mb-1">
          <h1 className="font-display text-3xl text-tal-plum leading-tight">
            {meta.title}
          </h1>
          {!granteeOnly && (
            <ExportExcelButton
              href={`/api/export/planner/${encodeURIComponent(section)}`}
              className="h-9 px-3 rounded-xl border border-tal-line text-tal-plum text-sm hover:bg-tal-cream-soft inline-flex items-center gap-1.5 disabled:opacity-60"
            />
          )}
        </div>
        {meta.hint && (
          <p className="text-sm italic text-tal-plum-soft mb-4">{meta.hint}</p>
        )}
        {!granteeOnly && (
          <p className="text-tal-plum-soft mb-6 max-w-2xl text-sm">
            Same {meta.title.toLowerCase()} as your Organiser. Add, edit or
            delete from either view — both stay in sync.
          </p>
        )}

        {!granteeOnly &&
          (hasForm && pageGroup ? (
            <PageForm
              group={pageGroup}
              questions={pageForm.questions}
              initialAnswers={pageForm.answers}
              initialInstances={pageForm.instances ?? null}
              repeatable={folder.repeatable}
              subcategoryId={folder.id}
              targetUserId={session.user.id}
              isAdmin={session.user.role === "s"}
            />
          ) : (
            <RecordsFallback
              categoryId={meta.organiserCategoryId}
              subcategoryId={meta.organiserSubcategoryId}
              defaultFields={[]}
              userId={session.user.id}
              role={session.user.role}
            />
          ))}

        <SharedItemsView items={sharedItems} />
      </div>
    );
  }

  // -- Planner-only section.
  //    Route to the appropriate editor based on the section's plannerEditor tag.

  // Letters — many entries, each "Dear [recipient] + body".
  if (meta.plannerEditor === "letters") {
    const [letters, shared] = await Promise.all([
      listPlannerLetters(session.user.id),
      loadSharedPlannerItems(session.user.id, "planner_letter"),
    ]);
    const granteeOnly = letters.length === 0 && shared.length > 0;
    return (
      <PlannerShell
        meta={meta}
        exportSlug={granteeOnly ? undefined : section}
        intro={
          granteeOnly
            ? undefined
            : "Write letters to the people who matter to you. Each one starts with \"Dear\" and can be as long or short as you like."
        }
      >
        {!granteeOnly && <PlannerLettersEditor initialLetters={letters} />}
        <SharedItemsView items={shared} />
      </PlannerShell>
    );
  }

  // Apologies — same shape as Letters.
  if (meta.plannerEditor === "apologies") {
    const [apologies, shared] = await Promise.all([
      listPlannerApologies(session.user.id),
      loadSharedPlannerItems(session.user.id, "planner_apology"),
    ]);
    const granteeOnly = apologies.length === 0 && shared.length > 0;
    return (
      <PlannerShell
        meta={meta}
        exportSlug={granteeOnly ? undefined : section}
        intro={
          granteeOnly
            ? undefined
            : "Things you'd want to say to someone, from the heart. Each apology starts with a name."
        }
      >
        {!granteeOnly && (
          <PlannerApologiesEditor initialApologies={apologies} />
        )}
        <SharedItemsView items={shared} />
      </PlannerShell>
    );
  }

  // Last words — single free-text page per user.
  if (meta.plannerEditor === "last-words") {
    const [row, shared] = await Promise.all([
      getPlannerLastWords(session.user.id),
      loadSharedPlannerItems(session.user.id, "planner_last_words"),
    ]);
    const granteeOnly = !row?.body && shared.length > 0;
    return (
      <PlannerShell
        meta={meta}
        exportSlug={granteeOnly ? undefined : section}
        intro={
          granteeOnly
            ? undefined
            : "The last thing you'd want to say to the people you leave behind."
        }
        shareButton={
          !granteeOnly ? (
            <ShareButton
              subcategoryId={null}
              itemKind="planner_last_words"
              itemId={session.user.id}
              itemLabel="My last words"
            />
          ) : undefined
        }
      >
        {!granteeOnly && (
          <PlannerSingleTextEditor
            initialBody={row?.body ?? ""}
            saveEndpoint="/api/planner-last-words"
            placeholder="Take your time. This is yours to say whatever you want."
            rows={24}
          />
        )}
        <SharedItemsView items={shared} />
      </PlannerShell>
    );
  }

  // Wishes — one page per audience (spouse / children / relatives / friends /
  // pets / general / other). The editor slug is wishes-<audience>.
  if (meta.plannerEditor?.startsWith("wishes-")) {
    const audience = meta.plannerEditor.slice("wishes-".length) as WishAudience;
    const [row, shared] = await Promise.all([
      getPlannerWish(session.user.id, audience),
      loadSharedPlannerItems(session.user.id, "planner_wish", audience),
    ]);
    const granteeOnly = !row?.body && shared.length > 0;
    return (
      <PlannerShell
        meta={meta}
        exportSlug={granteeOnly ? undefined : section}
        shareButton={
          !granteeOnly ? (
            <ShareButton
              subcategoryId={null}
              itemKind="planner_wish"
              itemId={audience}
              itemLabel={meta.title}
            />
          ) : undefined
        }
      >
        {!granteeOnly && (
          <PlannerSingleTextEditor
            initialBody={row?.body ?? ""}
            saveEndpoint={`/api/planner-wishes/${audience}`}
            placeholder="Whatever you'd want them to know."
            rows={20}
          />
        )}
        <SharedItemsView items={shared} />
      </PlannerShell>
    );
  }

  return (
    <PlannerShell meta={meta} exportSlug={section}>
      <div className="rounded-2xl border border-dashed border-tal-line bg-white p-6 text-sm text-tal-plum-soft">
        This Planner-only section is coming soon. Editor: {meta.plannerEditor}.
      </div>
    </PlannerShell>
  );
}

// Shared shell around every Planner section (breadcrumbs, title, hint, intro).
function PlannerShell({
  meta,
  intro,
  exportSlug,
  shareButton,
  children,
}: {
  meta: { title: string; hint?: string };
  intro?: string;
  exportSlug?: string;
  shareButton?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Breadcrumbs sectionTitle={meta.title} />
      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="font-display text-3xl text-tal-plum leading-tight">
          {meta.title}
        </h1>
        <div className="flex items-center gap-2">
          {shareButton}
          {exportSlug && (
            <ExportExcelButton
              href={`/api/export/planner/${encodeURIComponent(exportSlug)}`}
              className="h-9 px-3 rounded-xl border border-tal-line text-tal-plum text-sm hover:bg-tal-cream-soft inline-flex items-center gap-1.5 disabled:opacity-60"
            />
          )}
        </div>
      </div>
      {meta.hint && (
        <p className="text-sm italic text-tal-plum-soft mb-4">{meta.hint}</p>
      )}
      {intro && (
        <p className="text-tal-plum-soft mb-6 max-w-2xl text-sm">{intro}</p>
      )}
      {children}
    </div>
  );
}

// Records-mode fallback for the shrinking set of folders that still use
// records + default_fields. Wrapping in an async component so we can fetch
// the records list only in the fallback branch.
async function RecordsFallback({
  categoryId,
  subcategoryId,
  defaultFields,
  userId,
  role,
}: {
  categoryId: import("@/lib/db/types").CategoryId;
  subcategoryId: string;
  defaultFields: RecordField[];
  userId: string;
  role: string;
}) {
  const [records, suggestedTags] = await Promise.all([
    listUserRecords(userId, { categoryId, subcategoryId }),
    listAllTagsForUser(userId),
  ]);
  return (
    <SubcategoryRecordsList
      categoryId={categoryId}
      subcategoryId={subcategoryId}
      defaultFields={defaultFields}
      initialRecords={records as RecordRow[]}
      suggestedTags={suggestedTags}
      isAdmin={role === "s"}
    />
  );
}

function Breadcrumbs({ sectionTitle }: { sectionTitle: string }) {
  return (
    <div className="text-sm text-tal-plum-soft mb-2">
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
      · <span className="text-tal-plum">{sectionTitle}</span>
    </div>
  );
}
