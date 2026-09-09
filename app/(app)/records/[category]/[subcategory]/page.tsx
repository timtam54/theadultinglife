import type { Metadata } from "next";
import { GuardedLink as Link } from "@/components/GuardedLink";
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
import { subcategoryStatusByUser } from "@/lib/services/folder-completion";

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
import { FolderUploader } from "@/components/FolderUploader";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import { FolderFileList } from "@/components/FolderFileList";
import { PageForm } from "@/components/PageForm";
import { FamilyUsersPanel } from "@/components/FamilyUsersPanel";
import { UserPicker } from "@/components/UserPicker";
import { DailyPlanner } from "@/components/DailyPlanner";
import { FolderNotes } from "@/components/FolderNotes";
import { getFolderNote } from "@/lib/db/folder-notes";
import { listAllTagsForUser } from "@/lib/db/records";
import { subcategoryThumbnailWithFallback as subcategoryThumbnail } from "@/lib/thumbnails-server";
import { ScanLicenceButton } from "@/components/ScanLicenceButton";
import { SubcategoryRecordsList } from "@/components/SubcategoryRecordsList";
import type { RecordRow } from "@/lib/db/types";

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

  const [familyUsers, familyGroup, pickerStatusByUser] = await Promise.all([
    needsUserPicker
      ? listUsersInFamilyGroup(session.user.familyGroupId)
      : Promise.resolve([]),
    isUserList
      ? getFamilyGroup(session.user.familyGroupId)
      : Promise.resolve(null),
    needsUserPicker
      ? subcategoryStatusByUser(session.user.familyGroupId, subcategoryId)
      : Promise.resolve(new Map<string, "complete" | "started" | "empty">()),
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
      : listUserFiles(
          isPerUser || isPerUserList ? targetUserId : session.user.id,
          { subcategoryId }
        ),
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
          mirroredPrefills: {} as Record<string, string | null>,
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
          The Adulting Life Organiser
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
                status: pickerStatusByUser.get(u.id) ?? "empty",
              }))}
              currentUserId={targetUserId}
            />
          </>
        )}
      </div>

      <header className="rounded-2xl bg-black text-white px-3 sm:px-5 py-3 mb-6 shadow-md">
        {/* Mobile: title row + button row stacked; buttons sit on their own
            line so they can never visually overlap a long folder title (Jo
            saw the Scan button covering "Course Storage" on her phone).
            Desktop (sm+): single-row layout with buttons right-aligned. */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
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
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            {!isUserList && !hasForm && !isPlanner && (
              <>
                <FolderUploader
                  subcategoryId={folder.id}
                  targetUserId={
                    isPerUser || isPerUserList ? targetUserId : undefined
                  }
                />
                {records.length > 0 && (
                  <Link
                    href={pdfHrefFor(
                      category,
                      folder.id,
                      isPerUserList ? targetUserId : undefined
                    )}
                    target="_blank"
                    className="h-9 px-2 sm:px-3 rounded-xl border border-white/30 text-white text-sm hover:bg-white/10 inline-flex items-center gap-1.5"
                    title="Save as PDF"
                    aria-label="Save as PDF"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                      <path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                      <text x="8" y="17" fontSize="6" fontWeight="700" fill="currentColor">PDF</text>
                    </svg>
                    <span className="hidden sm:inline">Save as PDF</span>
                  </Link>
                )}
                {records.length > 0 && (
                  <ExportExcelButton
                    href={`/api/export/records-folder/${encodeURIComponent(folder.id)}`}
                  />
                )}
              </>
            )}
            {isPlanner && <FolderUploader subcategoryId={folder.id} />}
            {hasForm && pageGroup && folder.id === "personal.drivers_licence" && (
              <ScanLicenceButton
                subcategoryId={folder.id}
                pageGroup={pageGroup}
                targetUserId={targetUserId}
              />
            )}
            {hasForm && (
              <ExportExcelButton
                href={`/api/export/records-folder/${encodeURIComponent(folder.id)}`}
              />
            )}
          </div>
        </div>
      </header>

      {folder.description && (
        <div className="mb-6 rounded-2xl border border-tal-line bg-tal-cream-soft/60 p-4 flex gap-3">
          <span
            aria-hidden
            className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-tal-plum/10 text-tal-plum"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
              <path d="M12 9v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="12" cy="16.5" r="1" fill="currentColor" />
            </svg>
          </span>
          <div className="text-sm text-tal-plum leading-relaxed">
            {folder.description}
          </div>
        </div>
      )}

      {folder.id === "personal.will_funeral" && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
          <span
            aria-hidden
            className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-200 text-amber-900"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3 2 20h20L12 3Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path d="M12 10v4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              <circle cx="12" cy="17" r="1.1" fill="currentColor" />
            </svg>
          </span>
          <div className="text-sm text-amber-900 leading-relaxed">
            <div className="font-semibold mb-1">Important — not a legal document</div>
            <p>
              Recording your Will details, executors and funeral wishes here
              helps your family find and follow your intentions, but does
              <strong> not</strong> make those wishes legally binding on its
              own. To have a valid Will or make formal legal arrangements,
              please speak with a solicitor or accredited legal professional.
            </p>
          </div>
        </div>
      )}

      {folder.id === "admin.invoices_jul_jun" && (
        <Link
          href="/receipts"
          className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-tal-line bg-tal-cream-soft/60 p-4 hover:bg-tal-cream-soft hover:shadow-sm transition"
        >
          <div className="min-w-0">
            <div className="font-medium text-tal-plum leading-tight">
              Looking for receipts?
            </div>
            <div className="text-sm text-tal-plum-soft mt-0.5">
              Use the dedicated Receipts area to scan, tag and search
              individual receipts.
            </div>
          </div>
          <span className="text-tal-plum shrink-0" aria-hidden>→</span>
        </Link>
      )}

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
              birthday: u.birthday ?? null,
              mobile_phone: u.mobile_phone ?? null,
              home_phone: u.home_phone ?? null,
              home_address: u.home_address ?? null,
              mailing_address: u.mailing_address ?? null,
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
            // Force a fresh mount when the viewed user changes so the form
            // re-seeds from the new user's answers (RepeaterForm intentionally
            // doesn't re-sync via useEffect — see PageForm.tsx line 636).
            key={targetUserId}
            group={pageGroup}
            questions={pageForm.questions}
            initialAnswers={applyPersonaDefaults(
              pageGroup,
              pageForm.answers,
              familyUsers.find((u) => u.id === targetUserId)?.member_kind ?? null
            )}
            initialInstances={pageForm.instances ?? null}
            mirroredPrefills={pageForm.mirroredPrefills ?? {}}
            repeatable={folder.repeatable}
            subcategoryId={folder.id}
            targetUserId={isPerUser ? targetUserId : undefined}
            showPassportPreview={pageGroup === "passport"}
            pdfHref={pdfHrefFor(
              category,
              folder.id,
              isPerUser ? targetUserId : undefined
            )}
            isAdmin={session.user.role === "s"}
          />
        </section>
      )}

      {!isPlanner && !isUserList && !hasForm && (
        <section className="mb-8">
          <h2 className="font-display text-tal-plum mb-2">Records</h2>
          <SubcategoryRecordsList
            categoryId={category}
            subcategoryId={folder.id}
            defaultFields={[]}
            initialRecords={records as unknown as RecordRow[]}
            suggestedTags={allTags}
            isAdmin={session.user.role === "s"}
          />
        </section>
      )}

      {!isUserList && (
        <section>
          <h2 className="font-display text-tal-plum mb-2">Documents</h2>
          <FolderFileList
            files={files}
            categoryId={category}
            subcategoryId={folder.id}
          />
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

// Pre-populate persona-dependent fields based on the selected user's
// member_kind. Right now the only field is the General Information form's
// "Who is this form for?" dropdown — should auto-select Adult / Child /
// Other based on the family member the user picked. Only sets a default
// if the field is blank; never overrides a saved answer.
function applyPersonaDefaults(
  pageGroup: string,
  answers: Record<string, string | null>,
  memberKind: "adult" | "child" | null
): Record<string, string | null> {
  if (pageGroup !== "general_information" || !memberKind) return answers;
  const kindKey = "general_information.kind";
  if (answers[kindKey] && answers[kindKey] !== "") return answers;
  return { ...answers, [kindKey]: memberKind };
}
