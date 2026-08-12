import type { Metadata } from "next";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { isCategoryId } from "@/lib/services/records";
import { listUserSubcategories } from "@/lib/services/subcategories";
import {
  categoryMatrixForFamily,
  folderProgressForCategory,
} from "@/lib/services/folder-completion";
import { CATEGORY_LABELS } from "@/lib/db/types";
import { truncateForRow } from "@/lib/ui/truncate";
import { FolderListHeader } from "@/components/FolderListHeader";
import { FolderRow, FolderProgressHeader } from "@/components/FolderRow";
import { CategoryMatrix } from "@/components/CategoryMatrix";
import { subcategoryThumbnail } from "@/lib/thumbnails";
import { resolveFolderThumbnails } from "@/lib/services/folder-thumbnails";
import { listSubcategoriesByTemplateGroup } from "@/lib/db/subcategories";
import { countInstancesBySubcategory } from "@/lib/db/responses";
import { pomSlugFromSubcategoryId } from "@/lib/templates/peace-of-mind";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  if (!isCategoryId(category)) return {};
  return { title: CATEGORY_LABELS[category] };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { category } = await params;
  if (!isCategoryId(category)) notFound();

  const { view } = await searchParams;
  const currentView: "list" | "grid" | "matrix" =
    view === "grid" ? "grid" : view === "matrix" ? "matrix" : "list";

  const session = await requireSession();
  const [subcats, progress, matrix, pomSubs] = await Promise.all([
    listUserSubcategories(session.user.id, category),
    folderProgressForCategory(session.user.familyGroupId, category),
    currentView === "matrix"
      ? categoryMatrixForFamily(session.user.familyGroupId, category)
      : Promise.resolve(null),
    category === "health"
      ? listSubcategoriesByTemplateGroup("peace_of_mind")
      : Promise.resolve([]),
  ]);
  const thumbnailUrls = await resolveFolderThumbnails(
    session.user.id,
    subcats.map((s) => ({ id: s.id, category_id: s.category_id }))
  );
  const getThumb = (id: string) =>
    thumbnailUrls.get(id) ?? subcategoryThumbnail(id, category);

  let pomCard: {
    filled: number;
    total: number;
    nextSlug: string | null;
    nextName: string | null;
  } | null = null;
  if (category === "health" && pomSubs.length > 0) {
    const pomCounts = await countInstancesBySubcategory(
      session.user.id,
      pomSubs.map((s) => s.id)
    );
    const filled = pomSubs.filter((s) => (pomCounts.get(s.id) ?? 0) > 0).length;
    const next = pomSubs.find((s) => (pomCounts.get(s.id) ?? 0) === 0) ?? null;
    pomCard = {
      filled,
      total: pomSubs.length,
      nextSlug: next ? pomSlugFromSubcategoryId(next.id) : null,
      nextName: next ? next.name : null,
    };
  }

  return (
    <div>
      <FolderListHeader
        title="Life Admin"
        subtitle={CATEGORY_LABELS[category]}
        category={category}
        view={currentView}
      />

      {pomCard && <PeaceOfMindCard {...pomCard} />}

      {subcats.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-tal-line bg-white p-8 text-center mt-6">
          <p className="text-tal-plum-soft">No folders in this category yet.</p>
        </div>
      ) : currentView === "matrix" && matrix ? (
        <CategoryMatrix category={category} data={matrix} />
      ) : currentView === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {subcats.map((s) => (
            <Link
              key={s.id}
              href={`/records/${category}/${encodeURIComponent(s.id)}`}
              className="group rounded-2xl border border-tal-line bg-white p-5 hover:shadow-md transition"
            >
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getThumb(s.id)}
                  alt=""
                  width={56}
                  height={56}
                  className="shrink-0 w-14 h-14 rounded-xl object-cover ring-1 ring-tal-line bg-white"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-tal-plum break-all" title={s.name}>
                    {truncateForRow(s.name, 40)}
                  </div>
                  {s.hint && (
                    <div className="text-xs italic text-tal-plum-soft mt-0.5 break-words">
                      {s.hint}
                    </div>
                  )}
                  {progress.get(s.id) && (
                    <div className="text-xs text-tal-plum-soft mt-1">
                      {progressLabel(progress.get(s.id)!)}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <>
          <div className="mt-4 flex justify-end pr-10">
            <FolderProgressHeader />
          </div>
          <ul className="mt-1 divide-y divide-tal-line rounded-2xl border border-tal-line bg-white overflow-hidden">
            {subcats.map((s, i) => (
              <FolderRow
                key={s.id}
                index={i + 1}
                href={`/records/${category}/${encodeURIComponent(s.id)}`}
                name={s.name}
                hint={s.hint}
                progress={progress.get(s.id)}
                thumbnailUrl={getThumb(s.id)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function PeaceOfMindCard({
  filled,
  total,
  nextSlug,
  nextName,
}: {
  filled: number;
  total: number;
  nextSlug: string | null;
  nextName: string | null;
}) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  const href = nextSlug
    ? `/templates/peace-of-mind-planner/${nextSlug}`
    : "/templates/peace-of-mind-planner";
  return (
    <Link
      href={href}
      className="mt-6 block rounded-2xl border border-tal-line bg-white p-5 hover:shadow-md transition"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-lg text-tal-plum leading-tight">
            Peace of Mind Planner
          </h2>
          <p className="text-sm text-tal-plum-soft mt-1">
            {filled} of {total} sections filled in.
          </p>
        </div>
        <span className="text-tal-plum-soft text-sm shrink-0" aria-hidden>
          →
        </span>
      </div>
      <div className="h-2 rounded-full bg-tal-cream overflow-hidden mt-3">
        <div
          className="h-full bg-black transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {nextName ? (
        <p className="text-sm text-tal-plum mt-3">
          Next: <span className="font-medium">{nextName}</span>
        </p>
      ) : (
        <p className="text-sm text-green-700 mt-3">All sections filled 🎉</p>
      )}
    </Link>
  );
}

function progressLabel(p: {
  scope: string;
  startedCount: number;
  completedCount: number;
  targetCount: number;
  instanceCount: number;
}): string {
  const total =
    p.scope === "family_list" ||
    p.scope === "user_list" ||
    p.scope === "per_user_list"
      ? p.instanceCount
      : p.targetCount;
  return `${p.startedCount} started · ${p.completedCount} complete · ${total} total`;
}

