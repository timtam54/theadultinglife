import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { isCategoryId, listUserRecords } from "@/lib/services/records";
import { listUserFiles } from "@/lib/services/files";
import { getUserSubcategory } from "@/lib/services/subcategories";
import { loadPageFormBySubcategory } from "@/lib/services/pageForm";
import { CATEGORY_LABELS } from "@/lib/db/types";
import { StatusPill } from "@/components/StatusPill";
import { FolderUploader } from "@/components/FolderUploader";
import { FileDownloadLink } from "@/components/FileDownloadLink";
import { PageForm } from "@/components/PageForm";

export default async function SubcategoryPage({
  params,
}: {
  params: Promise<{ category: string; subcategory: string }>;
}) {
  const { category, subcategory } = await params;
  if (!isCategoryId(category)) notFound();
  const subcategoryId = decodeURIComponent(subcategory);

  const session = await requireSession();
  const [folder, records, files, pageForm] = await Promise.all([
    getUserSubcategory(session.user.id, subcategoryId),
    listUserRecords(session.user.id, { categoryId: category, subcategoryId }),
    listUserFiles(session.user.id, { subcategoryId }),
    loadPageFormBySubcategory(session.user.id, subcategoryId),
  ]);

  if (!folder || folder.category_id !== category) notFound();

  const hasForm = pageForm.questions.length > 0;
  const pageGroup = hasForm ? pageForm.questions[0].page_group : null;

  return (
    <div>
      <div className="text-sm text-tal-plum-soft mb-1">
        <Link href="/records" className="hover:text-tal-plum">
          Life Admin
        </Link>{" "}
        ·{" "}
        <Link href={`/records/${category}`} className="hover:text-tal-plum">
          {CATEGORY_LABELS[category]}
        </Link>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl text-tal-plum leading-tight">
            {folder.name}
          </h1>
          {folder.hint && (
            <div className="text-sm italic text-tal-plum-soft mt-0.5">
              {folder.hint}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <FolderUploader subcategoryId={folder.id} />
          {!hasForm && (
            <Link
              href={`/records/${category}/new?subcategory=${encodeURIComponent(folder.id)}`}
              className="h-9 px-3 rounded-xl bg-tal-plum text-white text-sm font-medium hover:bg-tal-plum-dark"
            >
              + Add record
            </Link>
          )}
        </div>
      </div>

      {hasForm && pageGroup && (
        <section className="mb-10">
          <PageForm
            group={pageGroup}
            questions={pageForm.questions}
            initialAnswers={pageForm.answers}
            showPassportPreview={pageGroup === "passport"}
          />
        </section>
      )}

      {!hasForm && (
        <section className="mb-8">
          <h2 className="font-display text-tal-plum mb-2">Records</h2>
          {records.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-tal-line bg-white p-6 text-sm text-tal-plum-soft">
              No records here yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {records.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/records/${category}/r/${r.id}`}
                    className="flex items-center justify-between rounded-xl border border-tal-line bg-white px-4 py-3 hover:shadow-sm"
                  >
                    <div>
                      <div className="font-medium">{r.title}</div>
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
        </section>
      )}

      <section>
        <h2 className="font-display text-tal-plum mb-2">Documents</h2>
        {files.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-tal-line bg-white p-6 text-sm text-tal-plum-soft">
            No documents uploaded to this folder yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {files.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded-xl border border-tal-line bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{f.filename}</div>
                  <div className="text-xs text-tal-plum-soft">
                    {new Date(f.created_at).toLocaleDateString()}
                  </div>
                </div>
                <FileDownloadLink fileId={f.id}>Download</FileDownloadLink>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
