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
import { listAllTagsForUser } from "@/lib/db/records";
import { listPlannerLetters } from "@/lib/db/planner-letters";
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

    return (
      <div>
        <Breadcrumbs sectionTitle={meta.title} />
        <h1 className="font-display text-3xl text-tal-plum leading-tight mb-1">
          {meta.title}
        </h1>
        {meta.hint && (
          <p className="text-sm italic text-tal-plum-soft mb-4">{meta.hint}</p>
        )}
        <p className="text-tal-plum-soft mb-6 max-w-2xl text-sm">
          Same {meta.title.toLowerCase()} as your Organiser. Add, edit or delete
          from either view — both stay in sync.
        </p>

        {hasForm && pageGroup ? (
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
        )}
      </div>
    );
  }

  // -- Planner-only section.
  //    Letters is built. Other Planner-only editors (wishes, apologies,
  //    last-words, will-meta) are coming later.
  if (meta.plannerEditor === "letters") {
    const letters = await listPlannerLetters(session.user.id);
    return (
      <div>
        <Breadcrumbs sectionTitle={meta.title} />
        <h1 className="font-display text-3xl text-tal-plum leading-tight mb-1">
          {meta.title}
        </h1>
        {meta.hint && (
          <p className="text-sm italic text-tal-plum-soft mb-4">{meta.hint}</p>
        )}
        <p className="text-tal-plum-soft mb-6 max-w-2xl text-sm">
          Write letters to the people who matter to you. Each one starts with
          &quot;Dear&quot; and can be as long or short as you like.
        </p>
        <PlannerLettersEditor initialLetters={letters} />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs sectionTitle={meta.title} />
      <h1 className="font-display text-3xl text-tal-plum leading-tight mb-1">
        {meta.title}
      </h1>
      {meta.hint && (
        <p className="text-sm italic text-tal-plum-soft mb-4">{meta.hint}</p>
      )}
      <div className="rounded-2xl border border-dashed border-tal-line bg-white p-6 text-sm text-tal-plum-soft">
        This Planner-only section is coming soon. Editor: {meta.plannerEditor}.
      </div>
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
