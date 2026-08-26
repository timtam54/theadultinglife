import type { Metadata } from "next";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getUserSubcategory } from "@/lib/services/subcategories";
import { listUserRecords } from "@/lib/services/records";
import { plannerSectionBySlug } from "@/lib/templates/peace-of-mind-v2";
import { truncateForRow } from "@/lib/ui/truncate";
import { StatusPill } from "@/components/StatusPill";

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
  //    folder. Same rows, two views.
  if (meta.kind === "organiser") {
    if (!meta.organiserSubcategoryId || !meta.organiserCategoryId) notFound();
    const folder = await getUserSubcategory(
      session.user.id,
      meta.organiserSubcategoryId
    );
    if (!folder) notFound();

    const records = await listUserRecords(session.user.id, {
      categoryId: meta.organiserCategoryId,
      subcategoryId: meta.organiserSubcategoryId,
    });

    const organiserHref = `/records/${meta.organiserCategoryId}/${encodeURIComponent(meta.organiserSubcategoryId)}`;
    const newRecordHref = `/records/${meta.organiserCategoryId}/new?subcategory=${encodeURIComponent(meta.organiserSubcategoryId)}`;

    return (
      <div>
        <Breadcrumbs sectionTitle={meta.title} />
        <div className="flex items-baseline justify-between flex-wrap gap-3 mb-1">
          <h1 className="font-display text-3xl text-tal-plum leading-tight">
            {meta.title}
          </h1>
          <Link
            href={organiserHref}
            className="text-sm text-tal-plum hover:underline"
          >
            Open in Organiser →
          </Link>
        </div>
        {meta.hint && (
          <p className="text-sm italic text-tal-plum-soft mb-4">{meta.hint}</p>
        )}
        <p className="text-tal-plum-soft mb-6 max-w-2xl">
          These are the same {meta.title.toLowerCase()} you&apos;ve added to
          your Organiser. Add, edit or delete from either view — both stay in
          sync.
        </p>

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-tal-plum">
            {records.length} {records.length === 1 ? "entry" : "entries"}
          </h2>
          <Link
            href={newRecordHref}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-black text-white text-sm font-medium hover:bg-black/85"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Add
          </Link>
        </div>

        {records.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-tal-line bg-white p-6 text-sm text-tal-plum-soft">
            Nothing here yet. Add one from this page or from the Organiser —
            they&apos;ll show up in both.
          </div>
        ) : (
          <ul className="space-y-2">
            {records.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/records/${meta.organiserCategoryId}/r/${r.id}`}
                  className="flex items-center justify-between rounded-xl border border-tal-line bg-white px-4 py-3 hover:shadow-sm gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium break-all" title={r.title}>
                      {truncateForRow(r.title, 40)}
                    </div>
                    <div className="text-xs text-tal-plum-soft">
                      {r.expiry_date ? `Expires ${r.expiry_date}` : "No expiry"}
                    </div>
                  </div>
                  {r.status && <StatusPill status={r.status} />}
                </Link>
              </li>
            ))}
          </ul>
        )}
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
