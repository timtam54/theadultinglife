import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { isCategoryId, listUserRecords } from "@/lib/services/records";
import { listUserFiles } from "@/lib/services/files";
import { getUserSubcategory } from "@/lib/services/subcategories";
import { loadPageFormBySubcategory } from "@/lib/services/pageForm";
import { listUsersInFamilyGroup } from "@/lib/db/users";
import { getFamilyGroup } from "@/lib/db/family-groups";
import { CATEGORY_LABELS } from "@/lib/db/types";
import { pomSlugFromSubcategoryId } from "@/lib/templates/peace-of-mind";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; subcategory: string }>;
}): Promise<Metadata> {
  const { category, subcategory } = await params;
  if (!isCategoryId(category)) return {};
  const label = decodeURIComponent(subcategory).replace(/[_.]/g, " ");
  return { title: `${label} · ${CATEGORY_LABELS[category]}` };
}
import { StatusPill } from "@/components/StatusPill";
import { FolderUploader } from "@/components/FolderUploader";
import { FileDownloadLink } from "@/components/FileDownloadLink";
import { PageForm } from "@/components/PageForm";
import { FamilyUsersPanel } from "@/components/FamilyUsersPanel";
import { UserPicker } from "@/components/UserPicker";
import { DailyPlanner } from "@/components/DailyPlanner";
import { FolderNotes } from "@/components/FolderNotes";
import { getFolderNote } from "@/lib/db/folder-notes";
import { FolderSearchBar } from "@/components/FolderSearchBar";
import { listAllTagsForUser } from "@/lib/db/records";
import { subcategoryThumbnail } from "@/lib/thumbnails";

const PLANNER_SUBCATEGORY = "personal.daily_routine_planner";

export default async function SubcategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; subcategory: string }>;
  searchParams: Promise<{ user?: string; q?: string; tag?: string }>;
}) {
  const { category, subcategory } = await params;
  if (!isCategoryId(category)) notFound();
  const subcategoryId = decodeURIComponent(subcategory);

  const session = await requireSession();
  const folder = await getUserSubcategory(session.user.id, subcategoryId);
  if (!folder || folder.category_id !== category) notFound();

  if (folder.template_group === "peace_of_mind") {
    const slug = pomSlugFromSubcategoryId(folder.id);
    if (slug) redirect(`/templates/peace-of-mind-planner/${slug}`);
  }

  const isUserList = folder.scope === "user_list";
  const isPerUser = folder.scope === "per_user";
  const isPerUserList = folder.scope === "per_user_list";
  const isPlanner = folder.id === PLANNER_SUBCATEGORY;
  const needsUserPicker = isUserList || isPerUser || isPerUserList;

  const [familyUsers, familyGroup] = await Promise.all([
    needsUserPicker
      ? listUsersInFamilyGroup(session.user.familyGroupId)
      : Promise.resolve([]),
    isUserList
      ? getFamilyGroup(session.user.familyGroupId)
      : Promise.resolve(null),
  ]);

  const { user: userParam, q: qParam, tag: tagParam } = await searchParams;
  const q = qParam?.trim() ?? "";
  const tag = tagParam?.trim() ?? "";
  const requestedUserId = userParam?.trim();
  const validRequestedUser =
    requestedUserId &&
    familyUsers.some((u) => u.id === requestedUserId)
      ? requestedUserId
      : null;
  const targetUserId =
    isPerUser || isPerUserList
      ? validRequestedUser ?? session.user.id
      : session.user.id;

  const [records, files, pageForm, folderNote] = await Promise.all([
    isUserList
      ? Promise.resolve([])
      : listUserRecords(targetUserId, {
          categoryId: category,
          subcategoryId,
          search: q || undefined,
          tag: tag || undefined,
        }),
    isUserList
      ? Promise.resolve([])
      : listUserFiles(session.user.id, { subcategoryId }),
    isUserList || isPerUserList
      ? Promise.resolve({
          questions: [],
          answers: {} as Record<string, string | null>,
          instances: undefined as
            | Array<{
                instance_id: string;
                answers: Record<string, string | null>;
              }>
            | undefined,
        })
      : loadPageFormBySubcategory(
          session.user.id,
          subcategoryId,
          targetUserId,
          folder.repeatable
        ),
    getFolderNote(session.user.familyGroupId, subcategoryId),
  ]);

  const allTags = !isUserList
    ? await listAllTagsForUser(targetUserId)
    : [];

  const hasForm = pageForm.questions.length > 0;
  const pageGroup = hasForm ? pageForm.questions[0].page_group : null;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-tal-plum-soft mb-3 flex-wrap">
        <Link href="/records" className="hover:text-tal-plum">
          Life Admin
        </Link>
        <span className="text-tal-plum-soft/50" aria-hidden>·</span>
        <Link
          href={`/records/${category}`}
          className="hover:text-tal-plum"
        >
          {CATEGORY_LABELS[category]}
        </Link>
        {(isPerUser || isPerUserList) && familyUsers.length > 0 && (
          <>
            <span className="text-tal-plum-soft/50" aria-hidden>·</span>
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

      <header className="rounded-2xl bg-gradient-to-br from-black to-gray-800 text-white px-5 py-3 mb-6 shadow-md">
        <div className="flex items-center gap-4 flex-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={subcategoryThumbnail(folder.id, category)}
            alt=""
            width={48}
            height={48}
            className="shrink-0 w-12 h-12 rounded-xl object-cover ring-2 ring-white/20 bg-white"
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl sm:text-2xl leading-tight">
              {folder.name}
            </h1>
            {folder.hint && (
              <div className="text-xs text-white/70 mt-0.5 truncate">
                {folder.hint}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {!isUserList && !hasForm && !isPlanner && (
              <>
                <FolderUploader subcategoryId={folder.id} />
                {(!isPerUserList || targetUserId === session.user.id) && (
                  <Link
                    href={`/records/${category}/new?subcategory=${encodeURIComponent(folder.id)}`}
                    className="h-9 px-3 rounded-xl bg-white text-tal-plum text-sm font-medium hover:shadow-sm inline-flex items-center"
                  >
                    + Add record
                  </Link>
                )}
                {records.length > 0 && (
                  <Link
                    href={pdfHrefFor(
                      category,
                      folder.id,
                      isPerUserList ? targetUserId : undefined
                    )}
                    target="_blank"
                    className="h-9 px-3 rounded-xl border border-white/30 text-white text-sm hover:bg-white/10 inline-flex items-center"
                  >
                    Save as PDF
                  </Link>
                )}
              </>
            )}
            {isPlanner && <FolderUploader subcategoryId={folder.id} />}
          </div>
        </div>
      </header>

      {!isUserList && (
        <div className="mb-6">
          <FolderNotes
            subcategoryId={folder.id}
            initialBody={folderNote?.body ?? ""}
            updatedAt={folderNote?.updated_at ?? null}
          />
        </div>
      )}

      {isUserList && (
        <section className="mb-8">
          <FamilyUsersPanel
            initialUsers={familyUsers.map((u) => ({
              id: u.id,
              email: u.email,
              first_name: u.first_name,
              last_name: u.last_name,
              member_kind: u.member_kind,
              is_primary: u.is_primary,
            }))}
            initialAllUsersAddedAt={familyGroup?.all_users_added_at ?? null}
            canConfirm={session.user.isPrimary}
          />
        </section>
      )}

      {isPlanner && (
        <section className="mb-10">
          <DailyPlanner userDisplayName={session.user.name ?? ""} />
        </section>
      )}

      {!isPlanner && !isUserList && hasForm && pageGroup && (
        <section className="mb-10">
          <PageForm
            group={pageGroup}
            questions={pageForm.questions}
            initialAnswers={pageForm.answers}
            initialInstances={pageForm.instances ?? null}
            repeatable={folder.repeatable}
            subcategoryId={folder.id}
            targetUserId={isPerUser ? targetUserId : undefined}
            showPassportPreview={pageGroup === "passport"}
            pdfHref={pdfHrefFor(
              category,
              folder.id,
              isPerUser ? targetUserId : undefined
            )}
          />
        </section>
      )}

      {!isPlanner && !isUserList && !hasForm && (
        <section className="mb-8">
          <h2 className="font-display text-tal-plum mb-2">Records</h2>
          <FolderSearchBar tags={allTags} activeTag={tag} activeSearch={q} />
          {records.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-tal-line bg-white p-6 text-sm text-tal-plum-soft">
              {q || tag
                ? "No records match this filter."
                : "No records here yet."}
            </div>
          ) : (
            <ul className="space-y-2">
              {records.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/records/${category}/r/${r.id}`}
                    className="flex items-center justify-between rounded-xl border border-tal-line bg-white px-4 py-3 hover:shadow-sm gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-medium">{r.title}</div>
                      <div className="text-xs text-tal-plum-soft">
                        {r.expiry_date ? `Expires ${r.expiry_date}` : "No expiry"}
                      </div>
                      {r.tags && r.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {r.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-800"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {r.status && <StatusPill status={r.status} />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!isUserList && (
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
      )}
    </div>
  );
}

// Custom-designed print views. Everything else falls through to the generic
// print route at /records/[category]/[subcategory]/pdf.
const CUSTOM_PDF_ROUTES: Record<string, string> = {
  "personal.passport_travel": "/records/personal/personal.passport_travel/pdf",
  "personal.birth_certificates":
    "/records/personal/personal.birth_certificates/pdf",
};

function pdfHrefFor(
  categoryId: string,
  subcategoryId: string,
  userId?: string
): string {
  const base =
    CUSTOM_PDF_ROUTES[subcategoryId] ??
    `/records/${categoryId}/${encodeURIComponent(subcategoryId)}/pdf`;
  return userId ? `${base}?user=${encodeURIComponent(userId)}` : base;
}
