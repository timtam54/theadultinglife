import type { Metadata } from "next";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getUserSubcategory } from "@/lib/services/subcategories";
import { listUserRecords } from "@/lib/services/records";
import { plannerSectionBySlug } from "@/lib/templates/peace-of-mind-v2";
import { SubcategoryRecordsList } from "@/components/SubcategoryRecordsList";
import { listAllTagsForUser } from "@/lib/db/records";
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

  // -- Organiser-fed section: render the same records as the Organiser
  //    folder via the shared editor. Same rows, two views.
  if (meta.kind === "organiser") {
    if (!meta.organiserSubcategoryId || !meta.organiserCategoryId) notFound();
    const folder = await getUserSubcategory(
      session.user.id,
      meta.organiserSubcategoryId
    );
    if (!folder) notFound();

    const [records, suggestedTags] = await Promise.all([
      listUserRecords(session.user.id, {
        categoryId: meta.organiserCategoryId,
        subcategoryId: meta.organiserSubcategoryId,
      }),
      listAllTagsForUser(session.user.id),
    ]);

    const defaultFields: RecordField[] = Array.isArray(folder.default_fields)
      ? folder.default_fields
      : [];

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

        <SubcategoryRecordsList
          categoryId={meta.organiserCategoryId}
          subcategoryId={meta.organiserSubcategoryId}
          defaultFields={defaultFields}
          initialRecords={records as RecordRow[]}
          suggestedTags={suggestedTags}
          isAdmin={session.user.role === "s"}
        />
      </div>
    );
  }

  // -- Planner-only section: placeholder for now. The dedicated editors
  //    (cover, will-meta, wishes, letters, apologies, last-words) will be
  //    added in follow-up sessions.
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
