import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { getSession } from "@/lib/auth/session";
import { listQuestionsBySubcategory } from "@/lib/db/questions";
import { listSubcategoriesByIds } from "@/lib/db/subcategories";
import { CATEGORY_LABELS, type CategoryId } from "@/lib/db/types";

export const metadata: Metadata = { title: "Folder form" };

export default async function AdminFolderFormDetailPage({
  params,
}: {
  params: Promise<{ subcategoryId: string }>;
}) {
  const session = await getSession();
  if (!session || session.user.role !== "s") notFound();

  const { subcategoryId: raw } = await params;
  const subcategoryId = decodeURIComponent(raw);

  const [questions, subs] = await Promise.all([
    listQuestionsBySubcategory(subcategoryId),
    listSubcategoriesByIds([subcategoryId]),
  ]);
  const sub = subs[0];
  const subName = sub?.name ?? subcategoryId;
  const categoryId = (sub?.category_id ?? "personal") as CategoryId;
  const pageGroup = questions[0]?.page_group ?? "—";

  return (
    <div className="max-w-4xl">
      <div className="mb-4 text-sm text-tal-plum-soft">
        <Link href="/admin/folder-forms" className="hover:underline">
          ← All folder forms
        </Link>
      </div>

      <h1 className="font-display text-3xl text-tal-plum mb-1 break-all">
        {subName}
      </h1>
      <p className="text-tal-plum-soft text-sm mb-6 flex flex-wrap gap-x-3 gap-y-1">
        <span>{CATEGORY_LABELS[categoryId]}</span>
        <span>&middot;</span>
        <span className="font-mono text-xs">{subcategoryId}</span>
        <span>&middot;</span>
        <span>
          group: <span className="font-mono text-xs">{pageGroup}</span>
        </span>
        <span>&middot;</span>
        <span>
          {questions.length} field{questions.length === 1 ? "" : "s"}
        </span>
      </p>

      {questions.length === 0 ? (
        <p className="text-sm text-gray-600">No fields configured.</p>
      ) : (
        <div className="rounded-2xl border border-tal-line bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-tal-cream-soft text-left text-xs uppercase tracking-wider text-tal-plum-soft">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Label</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Required</th>
                  <th className="px-3 py-2">Layout</th>
                  <th className="px-3 py-2">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tal-line">
                {questions.map((q) => (
                  <tr key={q.id} className="align-top">
                    <td className="px-3 py-2 text-tal-plum-soft tabular-nums">
                      {q.row_order}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-tal-plum break-words">
                        {q.label}
                      </div>
                      {q.hint && (
                        <div className="text-xs text-tal-plum-soft italic mt-0.5 break-words">
                          {q.hint}
                        </div>
                      )}
                      {q.placeholder && (
                        <div className="text-xs text-tal-plum-soft mt-0.5">
                          Placeholder:{" "}
                          <span className="font-mono">{q.placeholder}</span>
                        </div>
                      )}
                      {q.options && q.options.length > 0 && (
                        <div className="text-xs text-tal-plum-soft mt-1">
                          Options:{" "}
                          <span className="font-mono">
                            {q.options
                              .map((o) => `${o.value}=${o.label}`)
                              .join(", ")}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-tal-cream-soft px-2 py-0.5 text-xs">
                        {q.question_type}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {q.required ? (
                        <span className="text-xs text-red-700">Required</span>
                      ) : (
                        <span className="text-xs text-tal-plum-soft">
                          Optional
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-tal-plum-soft font-mono">
                      col {q.col_start}&nbsp;·&nbsp;span {q.col_span}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono text-tal-plum-soft break-all">
                      {q.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-tal-plum-soft">
        Read-only. To edit, use the Supabase Studio table editor on{" "}
        <code>page_questions</code>, or write a new migration in{" "}
        <code>supabase/migrations/</code>.
      </p>
    </div>
  );
}
