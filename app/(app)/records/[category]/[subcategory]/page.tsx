import type { Metadata } from "next";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { isCategoryId, listUserRecords } from "@/lib/services/records";
import { listUserFiles } from "@/lib/services/files";
import { getUserSubcategory } from "@/lib/services/subcategories";
import { listSubcategoriesForUser } from "@/lib/db/subcategories";
import { loadPageFormBySubcategory } from "@/lib/services/pageForm";
import {
  findUserById,
  listUsersInFamilyGroup,
  listUsersInFamilyGroupIncludingArchived,
} from "@/lib/db/users";
import { CORE_ATTRS_BY_SUBCATEGORY } from "@/lib/core-attrs";
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
import { RoutineScanButton } from "@/components/RoutineImportDialog";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import { PdfActions, folderPdfUrl } from "@/components/PdfActions";
import { LoanCalculator } from "@/components/LoanCalculator";
import { FolderFileList } from "@/components/FolderFileList";
import { PageForm } from "@/components/PageForm";
import { CoreDataPanel } from "@/components/CoreDataPanel";
import { FamilyUsersPanel } from "@/components/FamilyUsersPanel";
import { UserPicker } from "@/components/UserPicker";
import { DailyPlanner } from "@/components/DailyPlanner";
import { MealPlanner } from "@/components/MealPlanner";
import { LifeGoals } from "@/components/LifeGoals";
import { VehicleLogbook } from "@/components/VehicleLogbook";
import { BudgetPlanner } from "@/components/BudgetPlanner";
import { FolderNotes } from "@/components/FolderNotes";
import { getFolderNote } from "@/lib/db/folder-notes";
import { listAllTagsForUser } from "@/lib/db/records";
import { subcategoryThumbnailWithFallback as subcategoryThumbnail } from "@/lib/thumbnails-server";
import { ScanLicenceButton } from "@/components/ScanLicenceButton";
import { SubcategoryRecordsList } from "@/components/SubcategoryRecordsList";
import type { RecordRow } from "@/lib/db/types";
import { learnArticleForSubcategory } from "@/content/learning";

const PLANNER_SUBCATEGORY = "personal.daily_routine_planner";
const MEAL_PLANNER_SUBCATEGORY = "health.meal_planning";
const LIFE_GOALS_SUBCATEGORY = "health.life_goals_plans";
const VEHICLE_LOGBOOK_SUBCATEGORY = "personal.vehicle_logbook";
const BUDGET_SUBCATEGORY = "admin.budgets";

export default async function SubcategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; subcategory: string }>;
  searchParams: Promise<{
    user?: string;
    q?: string;
    tag?: string;
    from?: string;
  }>;
}) {
  const { category, subcategory } = await params;
  if (!isCategoryId(category)) notFound();
  const subcategoryId = decodeURIComponent(subcategory);
  const search = await searchParams;

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
  // The meal planner grid replaces this folder's form and document list.
  const isMealPlanner = folder.id === MEAL_PLANNER_SUBCATEGORY;
  // Likewise the Life Goals & Plans screen replaces that folder's form.
  const isLifeGoals = folder.id === LIFE_GOALS_SUBCATEGORY;
  // The vehicle logbook has no form at all — its screen is the whole folder.
  const isVehicleLogbook = folder.id === VEHICLE_LOGBOOK_SUBCATEGORY;
  // Budgets: the Money & Me planner replaces the form; uploads stay available.
  const isBudget = folder.id === BUDGET_SUBCATEGORY;
  const hasCustomScreen = isMealPlanner || isLifeGoals || isVehicleLogbook || isBudget;
  // Custom screens that still keep the folder's upload button and Documents.
  const keepsDocuments = isMealPlanner || isBudget;
  const needsUserPicker = isUserList || isPerUser || isPerUserList;

  const isFamilyMembersFolder = folder.id === "personal.family_members";
  const [familyUsers, allFamilyUsers, familyGroup, pickerStatusByUser] =
    await Promise.all([
      needsUserPicker
        ? listUsersInFamilyGroup(session.user.familyGroupId)
        : Promise.resolve([]),
      isFamilyMembersFolder
        ? listUsersInFamilyGroupIncludingArchived(session.user.familyGroupId)
        : Promise.resolve([]),
      isUserList
        ? getFamilyGroup(session.user.familyGroupId)
        : Promise.resolve(null),
      needsUserPicker
        ? subcategoryStatusByUser(session.user.familyGroupId, subcategoryId)
        : Promise.resolve(new Map<string, "complete" | "started" | "empty">()),
    ]);

  const { user: userParam, q: qParam, tag: tagParam } = search;
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
    // user_list folders (the Family Members roster) never carry a form.
    // per_user_list folders DO have structured forms (Investment Type,
    // Bank BSB, etc.) — they were previously excluded here which meant
    // Migration 025's questions rendered as an empty Record Editor.
    isUserList
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
  // Folders whose form has its own document / photo field (Birth
  // Certificates, Passport, Will…): the Documents section lists EVERY
  // document in the folder (Donna: the original should also be in
  // Documents), marking the ones attached to the form as "On the form
  // above" so they don't look like stray copies. Other folders keep the
  // old behaviour — entry attachments show next to their entry instead.
  const hasDocumentField = pageForm.questions.some(
    (q) => q.question_type === "file" || q.question_type === "image"
  );
  const formFileIds = new Set<string>();
  if (hasDocumentField) {
    const fileQuestionIds = pageForm.questions
      .filter((q) => q.question_type === "file" || q.question_type === "image")
      .map((q) => q.id);
    const answerSets = [pageForm.answers ?? {}, ...(pageForm.instances ?? []).map((i) => i.answers)];
    for (const a of answerSets) {
      for (const qid of fileQuestionIds) {
        const v = a[qid];
        if (v) formFileIds.add(v);
      }
    }
  }
  const folderFiles = hasDocumentField ? files : files.filter((f) => !f.instance_id);
  const onFormIds = folderFiles.filter((f) => formFileIds.has(f.id)).map((f) => f.id);

  // Core (profile) values this folder shows read-only instead of storing.
  const coreAttrs = CORE_ATTRS_BY_SUBCATEGORY[subcategoryId] ?? [];
  const coreUser =
    coreAttrs.length > 0
      ? familyUsers.find((u) => u.id === targetUserId) ??
        (await findUserById(targetUserId))
      : null;
  const pageGroup = hasForm ? pageForm.questions[0].page_group : null;

  // Prev / Next folder navigation — walks the same folder list the user sees
  // at /records/<category>, in sort_order. Always shown — including when the
  // person came from the Setup Guide, whose banner only offers "Next form"
  // within its own section (so the last folder of a section, e.g. List of
  // Personal Accounts, had no way forward).
  let prevFolder: { id: string; name: string } | null = null;
  let nextFolder: { id: string; name: string } | null = null;
  {
    const siblings = await listSubcategoriesForUser(session.user.id, category);
    const idx = siblings.findIndex((s) => s.id === subcategoryId);
    if (idx > 0) {
      const p = siblings[idx - 1];
      prevFolder = { id: p.id, name: p.name };
    }
    if (idx >= 0 && idx < siblings.length - 1) {
      const n = siblings[idx + 1];
      nextFolder = { id: n.id, name: n.name };
    }
  }

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
            {!isUserList && !hasForm && !isPlanner && !hasCustomScreen && (
              <>
                <FolderUploader
                  subcategoryId={folder.id}
                  targetUserId={
                    isPerUser || isPerUserList ? targetUserId : undefined
                  }
                />
                {records.length > 0 && (
                  <PdfActions
                    downloadUrl={folderPdfUrl(folder.id, isPerUserList ? targetUserId : undefined)}
                    shareUrl="/api/export/folder-pdf/email"
                    shareBody={{
                      subcategoryId: folder.id,
                      targetUserId: isPerUserList ? targetUserId : undefined,
                    }}
                    shareLabel={`A PDF of ${folder.name}, made by The Adulting Life`}
                    what="this folder"
                  />
                )}
                {records.length > 0 && (
                  <ExportExcelButton
                    href={`/api/export/records-folder/${encodeURIComponent(folder.id)}`}
                  />
                )}
              </>
            )}
            {/* Daily Routine Planner: "Scan into calendar" reads a routine into
                calendar events; "Upload Document" just keeps a file. */}
            {isPlanner && <RoutineScanButton subcategoryId={folder.id} />}
            {isPlanner && <FolderUploader subcategoryId={folder.id} uploadOnly />}
            {keepsDocuments && (
              <FolderUploader subcategoryId={folder.id} targetUserId={targetUserId} />
            )}
            {hasForm && pageGroup && folder.id === "personal.drivers_licence" && (
              <ScanLicenceButton
                subcategoryId={folder.id}
                pageGroup={pageGroup}
                targetUserId={targetUserId}
              />
            )}
            {hasForm && !hasCustomScreen && (
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

      {(() => {
        const article = learnArticleForSubcategory(folder.id);
        if (!article) return null;
        return (
          <div className="mb-6 -mt-3 text-xs">
            <Link
              href={`/learn/${article.categoryId}/article/${encodeURIComponent(article.id)}`}
              className="inline-flex items-center gap-1.5 text-tal-plum-soft hover:text-tal-plum hover:underline"
              title={article.title}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.9.5-1 1.1-1 1.7v.5" />
                <circle cx="12" cy="16.5" r="0.6" fill="currentColor" />
              </svg>
              Why keep this? Learn more →
            </Link>
          </div>
        );
      })()}

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

      {(folder.id === "admin.loans" || folder.id === "admin.loan_statements") && <LoanCalculator />}

      {folder.id === "admin.invoices_jul_jun" && (
        <Link
          href="/receipts"
          className="tal-hover-card mb-6 flex items-center justify-between gap-3 rounded-2xl border border-tal-line bg-tal-cream-soft/60 p-4 hover:bg-tal-cream-soft transition"
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
        <div data-tour="folder-notes" className="mb-6">
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
            initialUsers={(isFamilyMembersFolder
              ? allFamilyUsers
              : familyUsers
            ).map((u) => ({
              id: u.id,
              email: u.email,
              first_name: u.first_name,
              last_name: u.last_name,
              member_kind: u.member_kind,
              is_primary: u.is_primary,
              archived_at: u.archived_at ?? null,
              birthday: u.birthday ?? null,
              mobile_phone: u.mobile_phone ?? null,
              home_phone: u.home_phone ?? null,
              home_address: u.home_address ?? null,
              mailing_address: u.mailing_address ?? null,
              bank_bsb: u.bank_bsb ?? null,
              bank_account_number: u.bank_account_number ?? null,
              super_fund: u.super_fund ?? null,
              super_member_number: u.super_member_number ?? null,
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

      {isMealPlanner && (
        <section className="mb-10">
          <MealPlanner key={targetUserId} userId={targetUserId} />
        </section>
      )}

      {isBudget && (
        <section className="mb-10">
          <BudgetPlanner key={targetUserId} userId={targetUserId} />
        </section>
      )}

      {isVehicleLogbook && (
        <section className="mb-10">
          <VehicleLogbook key={targetUserId} userId={targetUserId} />
        </section>
      )}

      {isLifeGoals && (
        <section className="mb-10">
          <LifeGoals key={targetUserId} userId={targetUserId} />
        </section>
      )}

      {!isPlanner && !hasCustomScreen && !isUserList && hasForm && pageGroup && (
        <section id="folder-form" data-tour="folder-form" className="mb-10 scroll-mt-24">
          {coreUser && <CoreDataPanel attrs={coreAttrs} user={coreUser} />}
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
            targetUserId={
              isPerUser || isPerUserList ? targetUserId : undefined
            }
            showPassportPreview={pageGroup === "passport"}
            pdfHref={pdfHrefFor(
              category,
              folder.id,
              isPerUser || isPerUserList ? targetUserId : undefined
            )}
            isAdmin={session.user.role === "s"}
          />
        </section>
      )}

      {!isPlanner && !hasCustomScreen && !isUserList && !hasForm && (
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

      {!isUserList && (!hasCustomScreen || keepsDocuments) && hasDocumentField && (
        <section data-tour="folder-documents">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
            <div>
              <h2 className="font-display text-tal-plum">Documents</h2>
              <p className="text-xs text-tal-plum-soft mt-0.5">
                Everything in this folder. Add anything else that goes with it —
                e.g. visas, travel insurance or itineraries alongside a passport.
              </p>
            </div>
            <FolderUploader
              subcategoryId={folder.id}
              targetUserId={isPerUser || isPerUserList ? targetUserId : undefined}
            />
          </div>
          {folderFiles.length > 0 && (
            <FolderFileList
              files={folderFiles}
              categoryId={category}
              subcategoryId={folder.id}
              onFormIds={onFormIds}
              hasForm={hasForm && !isPlanner && !hasCustomScreen}
            />
          )}
        </section>
      )}

      {!isUserList && (!hasCustomScreen || keepsDocuments) && !hasDocumentField && (
        <section data-tour="folder-documents">
          <h2 className="font-display text-tal-plum mb-2">Documents</h2>
          <FolderFileList
            files={folderFiles}
            categoryId={category}
            subcategoryId={folder.id}
            hasForm={hasForm && !isPlanner && !hasCustomScreen}
          />
        </section>
      )}

      {(prevFolder || nextFolder) && (
        <nav
          aria-label="Folder navigation"
          className="mt-10 mb-20 pt-6 border-t border-tal-line flex items-center justify-between gap-3 flex-wrap"
        >
          <div>
            {prevFolder && (
              <Link
                href={`/records/${category}/${encodeURIComponent(prevFolder.id)}`}
                className="btn group inline-flex items-center gap-2 h-11 pl-2 pr-4 rounded-xl border border-tal-line bg-white text-tal-plum text-sm font-medium hover:bg-tal-cream-soft"
              >
                <span
                  aria-hidden
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-tal-cream text-tal-plum transition-colors group-hover:bg-tal-plum group-hover:text-white"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 6l-6 6 6 6" />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-widest text-tal-plum-soft leading-none">
                    Previous
                  </span>
                  <span className="block truncate max-w-[14rem]">
                    {prevFolder.name}
                  </span>
                </span>
              </Link>
            )}
          </div>
          <div>
            {nextFolder && (
              <Link
                href={`/records/${category}/${encodeURIComponent(nextFolder.id)}`}
                className="btn group inline-flex items-center gap-2 h-11 pl-4 pr-2 rounded-xl border border-tal-line bg-white text-tal-plum text-sm font-medium hover:bg-tal-cream-soft"
              >
                <span className="min-w-0 text-right">
                  <span className="block text-[10px] uppercase tracking-widest text-tal-plum-soft leading-none">
                    Next
                  </span>
                  <span className="block truncate max-w-[14rem]">
                    {nextFolder.name}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-tal-cream text-tal-plum transition-colors group-hover:bg-tal-plum group-hover:text-white"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
            )}
          </div>
        </nav>
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
