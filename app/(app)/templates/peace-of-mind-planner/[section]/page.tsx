import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { listUserFiles } from "@/lib/services/files";
import { getUserSubcategory } from "@/lib/services/subcategories";
import { loadPageFormBySubcategory } from "@/lib/services/pageForm";
import { listUsersInFamilyGroup } from "@/lib/db/users";
import { FolderUploader } from "@/components/FolderUploader";
import { FileDownloadLink } from "@/components/FileDownloadLink";
import { PageForm } from "@/components/PageForm";
import { UserPicker } from "@/components/UserPicker";
import { pomSubcategoryIdFromSlug } from "@/lib/templates/peace-of-mind";

type Ctx = {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ user?: string }>;
};

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { section } = await params;
  const subcategoryId = pomSubcategoryIdFromSlug(section);
  if (!subcategoryId) return {};
  return { title: `${section.replace(/-/g, " ")} · Peace of Mind Planner` };
}

export default async function PomSectionPage({ params, searchParams }: Ctx) {
  const { section } = await params;
  const subcategoryId = pomSubcategoryIdFromSlug(section);
  if (!subcategoryId) notFound();

  const session = await requireSession();
  const folder = await getUserSubcategory(session.user.id, subcategoryId);
  if (!folder || folder.template_group !== "peace_of_mind") notFound();

  const familyUsers = await listUsersInFamilyGroup(session.user.familyGroupId);
  const { user: userParam } = await searchParams;
  const requestedUserId = userParam?.trim();
  const validRequestedUser =
    requestedUserId && familyUsers.some((u) => u.id === requestedUserId)
      ? requestedUserId
      : null;
  const targetUserId = validRequestedUser ?? session.user.id;

  const [files, pageForm] = await Promise.all([
    listUserFiles(session.user.id, { subcategoryId }),
    loadPageFormBySubcategory(
      session.user.id,
      subcategoryId,
      targetUserId,
      folder.repeatable
    ),
  ]);

  const hasForm = pageForm.questions.length > 0;
  const pageGroup = hasForm ? pageForm.questions[0].page_group : null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <div className="text-sm text-tal-plum-soft">
          <Link href="/templates" className="hover:text-tal-plum">
            Document Templates
          </Link>{" "}
          ·{" "}
          <Link
            href="/templates/peace-of-mind-planner"
            className="hover:text-tal-plum"
          >
            Peace of Mind Planner
          </Link>
        </div>
        {familyUsers.length > 0 && (
          <>
            <span className="text-sm text-tal-plum-soft">·</span>
            <UserPicker
              users={familyUsers.map((u) => ({
                id: u.id,
                first_name: u.first_name,
                last_name: u.last_name,
                email: u.email,
                member_kind: u.member_kind,
                is_primary: u.is_primary,
              }))}
              currentUserId={targetUserId}
            />
          </>
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="font-display text-3xl text-tal-plum leading-tight">
            {folder.name.replace(/^TAL\s*[—-]\s*/, "")}
          </h1>
          {folder.hint && (
            <div className="text-sm italic text-tal-plum-soft mt-0.5">
              {folder.hint}
            </div>
          )}
        </div>
      </div>

      {hasForm && pageGroup && (
        <section className="mb-10">
          <PageForm
            group={pageGroup}
            questions={pageForm.questions}
            initialAnswers={pageForm.answers}
            initialInstances={pageForm.instances ?? null}
            repeatable={folder.repeatable}
            subcategoryId={folder.id}
            targetUserId={targetUserId}
          />
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-tal-plum">Documents</h2>
          <FolderUploader subcategoryId={folder.id} />
        </div>
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
