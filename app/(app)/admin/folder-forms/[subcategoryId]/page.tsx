import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { getSession } from "@/lib/auth/session";
import {
  countAnswersForForm,
  listQuestionsBySubcategory,
} from "@/lib/db/questions";
import { listSubcategoriesByIds } from "@/lib/db/subcategories";
import { CATEGORY_LABELS, type CategoryId } from "@/lib/db/types";
import { FolderFormEditor } from "@/components/FolderFormEditor";

export const metadata: Metadata = { title: "Folder form" };

export default async function AdminFolderFormDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ subcategoryId: string }>;
  searchParams: Promise<{ group?: string }>;
}) {
  const session = await getSession();
  if (!session || session.user.role !== "s") notFound();

  const { subcategoryId: raw } = await params;
  const { group: groupParam } = await searchParams;
  const subcategoryId = decodeURIComponent(raw);

  const [questions, subs] = await Promise.all([
    listQuestionsBySubcategory(subcategoryId),
    listSubcategoriesByIds([subcategoryId]),
  ]);
  const sub = subs[0];
  if (!sub) notFound();
  const subName = sub.name;
  const categoryId = sub.category_id as CategoryId;

  const isNewForm = questions.length === 0;
  const pageGroup = isNewForm
    ? (groupParam?.trim() || slugify(subName))
    : questions[0].page_group;
  const answerCount = isNewForm
    ? 0
    : await countAnswersForForm(subcategoryId, pageGroup);
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

      <FolderFormEditor
        subcategoryId={subcategoryId}
        subcategoryName={subName}
        pageGroup={pageGroup}
        initialFields={questions}
        answerCount={answerCount}
        isNewForm={isNewForm}
      />
    </div>
  );
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "form"
  );
}
