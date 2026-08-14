import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { getSession } from "@/lib/auth/session";
import { listConfiguredFormSummaries } from "@/lib/db/questions";
import { listSubcategoriesByIds } from "@/lib/db/subcategories";
import { CATEGORY_LABELS, type CategoryId } from "@/lib/db/types";

export const metadata: Metadata = { title: "Folder forms" };

interface FormEntry {
  subcategoryId: string;
  pageGroup: string;
  fieldCount: number;
  subcategoryName: string;
  categoryId: CategoryId;
  href: string;
}

export default async function AdminFolderFormsPage() {
  const session = await getSession();
  if (!session || session.user.role !== "s") notFound();

  const summaries = await listConfiguredFormSummaries();
  const subs = await listSubcategoriesByIds(summaries.map((s) => s.subcategoryId));
  const subMap = new Map(subs.map((s) => [s.id, s]));

  const entries: FormEntry[] = summaries
    .map((s) => {
      const sub = subMap.get(s.subcategoryId);
      return {
        subcategoryId: s.subcategoryId,
        pageGroup: s.pageGroup,
        fieldCount: s.fieldCount,
        subcategoryName: sub?.name ?? s.subcategoryId,
        categoryId: (sub?.category_id ?? "personal") as CategoryId,
        href: `/admin/folder-forms/${encodeURIComponent(s.subcategoryId)}`,
      };
    })
    .sort(
      (a, b) =>
        a.categoryId.localeCompare(b.categoryId) ||
        a.subcategoryName.localeCompare(b.subcategoryName)
    );

  const byCategory = new Map<CategoryId, FormEntry[]>();
  for (const e of entries) {
    const arr = byCategory.get(e.categoryId) ?? [];
    arr.push(e);
    byCategory.set(e.categoryId, arr);
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
        <h1 className="font-display text-3xl text-tal-plum">Folder forms</h1>
        <Link
          href="/admin/folder-forms/new"
          className="h-9 px-3 rounded-lg bg-black text-white text-sm font-medium inline-flex items-center"
        >
          + New form
        </Link>
      </div>
      <p className="text-tal-plum-soft mb-6 text-sm">
        Fields that appear on each folder&rsquo;s page form. Click a folder to
        edit its fields.
      </p>

      {entries.length === 0 ? (
        <p className="text-sm text-gray-600">
          No folders have configured fields yet.
        </p>
      ) : (
        <div className="space-y-6">
          {Array.from(byCategory.entries()).map(([categoryId, items]) => (
            <section key={categoryId}>
              <h2 className="text-xs uppercase tracking-widest text-tal-plum-soft mb-2">
                {CATEGORY_LABELS[categoryId]}
              </h2>
              <ul className="rounded-2xl border border-tal-line bg-white divide-y divide-tal-line overflow-hidden">
                {items.map((e) => (
                  <li key={`${e.subcategoryId}:${e.pageGroup}`}>
                    <Link
                      href={e.href}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-tal-cream-soft transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-tal-plum break-all">
                          {e.subcategoryName}
                        </div>
                        <div className="text-xs text-tal-plum-soft mt-0.5 font-mono break-all">
                          {e.subcategoryId} &middot; group{" "}
                          <span className="text-tal-plum">{e.pageGroup}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs rounded-full bg-tal-cream-soft px-2 py-0.5 text-tal-plum-soft">
                          {e.fieldCount} field
                          {e.fieldCount === 1 ? "" : "s"}
                        </span>
                        <span className="text-tal-plum-soft" aria-hidden>
                          ›
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
