import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { isCategoryId } from "@/lib/services/records";
import { listUserSubcategories } from "@/lib/services/subcategories";
import {
  categoryMatrixForFamily,
  folderProgressForCategory,
} from "@/lib/services/folder-completion";
import { CATEGORY_LABELS } from "@/lib/db/types";
import { FolderListHeader } from "@/components/FolderListHeader";
import { FolderRow, FolderProgressHeader } from "@/components/FolderRow";
import { CategoryMatrix } from "@/components/CategoryMatrix";

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
  const [subcats, progress, matrix] = await Promise.all([
    listUserSubcategories(session.user.id, category),
    folderProgressForCategory(session.user.familyGroupId, category),
    currentView === "matrix"
      ? categoryMatrixForFamily(session.user.familyGroupId, category)
      : Promise.resolve(null),
  ]);

  return (
    <div>
      <FolderListHeader
        title="Life Admin"
        subtitle={CATEGORY_LABELS[category]}
        category={category}
        view={currentView}
      />

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
                <FolderIcon />
                <div className="min-w-0">
                  <div className="font-medium text-tal-plum truncate">
                    {s.name}
                  </div>
                  {s.hint && (
                    <div className="text-xs italic text-tal-plum-soft mt-0.5">
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
              />
            ))}
          </ul>
        </>
      )}
    </div>
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

function FolderIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0"
      aria-hidden
    >
      <path
        d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2a1.5 1.5 0 0 1 1.05.43l1.32 1.29c.28.27.66.43 1.05.43H19.5A1.5 1.5 0 0 1 21 8.65v9.35a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V6.5Z"
        fill="#e6c48a"
        stroke="#b08a4e"
        strokeWidth="1"
      />
    </svg>
  );
}
