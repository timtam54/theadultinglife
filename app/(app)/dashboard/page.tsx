import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { loadWizardState } from "@/lib/services/onboarding-wizard";
import { listUserRecords } from "@/lib/services/records";
import { categoryProgressForFamily } from "@/lib/services/folder-completion";
import { listProgress } from "@/lib/db/progress";
import { listSubcategoriesByTemplateGroup } from "@/lib/db/subcategories";
import { countInstancesBySubcategory } from "@/lib/db/responses";
import {
  countHealthyRecordsForFamily,
  filterUpcoming,
  listRemindersForFamily,
  type Reminder,
} from "@/lib/services/reminders";
import {
  listRecentActivityForFamily,
  type ActivityEvent,
} from "@/lib/services/activity";
import { loadOnboardingSummary } from "@/lib/services/onboarding";
import {
  CATEGORY_IDS,
  CATEGORY_LABELS,
  type CategoryId,
} from "@/lib/db/types";
import { CONTENT_ITEMS, type ContentItem } from "@/content/learning";
import { pomSlugFromSubcategoryId } from "@/lib/templates/peace-of-mind";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your Adulting Life overview — what's expiring, what's next, and how you're tracking.",
};

export default async function DashboardPage() {
  const session = await requireSession();
  const wizardState = await loadWizardState(session.user.id);
  if (!wizardState.seenAt && !wizardState.isComplete) {
    redirect("/welcome");
  }

  const first = session.user.firstName ?? session.user.name?.split(" ")[0] ?? "there";

  const [
    records,
    categoryProgress,
    progressRows,
    pomSubs,
    allReminders,
    recentActivity,
    onboarding,
    healthyCount,
  ] = await Promise.all([
    listUserRecords(session.user.id),
    categoryProgressForFamily(session.user.familyGroupId),
    listProgress(session.user.id),
    listSubcategoriesByTemplateGroup("peace_of_mind"),
    listRemindersForFamily(session.user.familyGroupId),
    listRecentActivityForFamily(session.user.familyGroupId, { limit: 5 }),
    loadOnboardingSummary(session.user.id, session.user.familyGroupId),
    countHealthyRecordsForFamily(session.user.familyGroupId),
  ]);
  const upcomingReminders = filterUpcoming(allReminders);

  const pomCounts = await countInstancesBySubcategory(
    session.user.id,
    pomSubs.map((s) => s.id)
  );

  const recent = [...records]
    .sort((a, b) => (a.updated_at > b.updated_at ? -1 : 1))
    .slice(0, 4);

  const articlesRead = progressRows.filter(
    (p) => p.item_type === "content" && p.status === "completed"
  ).length;
  const quizzesTaken = progressRows.filter((p) => p.item_type === "quiz").length;
  const quizzesPassed = progressRows.filter(
    (p) => p.item_type === "quiz" && p.status === "completed"
  ).length;

  const pomSectionsWithEntries = pomSubs.filter(
    (s) => (pomCounts.get(s.id) ?? 0) > 0
  ).length;
  const pomTotal = pomSubs.length;

  const totalCompletedFolders = Array.from(categoryProgress.values()).reduce(
    (a, c) => a + c.completedFolders,
    0
  );
  const totalFolders = Array.from(categoryProgress.values()).reduce(
    (a, c) => a + c.totalFolders,
    0
  );
  const lifeAdminPct =
    totalFolders > 0
      ? Math.round((totalCompletedFolders / totalFolders) * 100)
      : 0;

  const completedArticleIds = new Set(
    progressRows
      .filter((p) => p.item_type === "content" && p.status === "completed")
      .map((p) => p.item_id)
  );
  const nextArticle =
    CONTENT_ITEMS.find((c) => !completedArticleIds.has(c.id)) ?? null;

  const uploadsThisMonth = recentActivity.filter((ev) => {
    if (ev.kind !== "file_uploaded") return false;
    const then = new Date(ev.occurredAt).getTime();
    return then > Date.now() - 30 * 86_400_000;
  }).length;

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2 min-w-0">
        {!wizardState.isComplete && (
          <WizardResumeCard
            doneCount={wizardState.doneCount}
            totalCount={wizardState.totalCount}
          />
        )}
        <WelcomeHero
          firstName={first}
          avatarUrl={session.user.avatarUrl}
          lifeAdminPct={lifeAdminPct}
        />

        <StatCards
          documentsCount={totalCompletedFolders}
          remindersCount={upcomingReminders.length}
          tasksOutstanding={onboarding.outstandingCount}
          healthyCount={healthyCount}
        />

        <LifeAdminOverview progress={categoryProgress} />

        <div className="grid gap-4 md:grid-cols-2">
          <RecentSection
            items={recent.map((r) => ({
              id: r.id,
              title: r.title,
              category_id: r.category_id,
              subcategory_id: r.subcategory_id ?? "",
              updated_at: r.updated_at,
            }))}
          />
          <ContinueLearningCard article={nextArticle} />
        </div>

        <RecentActivitySection items={recentActivity} />

        {uploadsThisMonth > 0 && (
          <CelebrationBanner uploadsThisMonth={uploadsThisMonth} />
        )}
      </div>

      <aside className="lg:col-span-1 space-y-4">
        <RemindersSection
          items={upcomingReminders.slice(0, 5)}
          totalCount={upcomingReminders.length}
        />
        <EmergencyCard />
        <QuickActions />
        <TalAiHelperCard />
        <PomCard
          filled={pomSectionsWithEntries}
          total={pomTotal}
          nextSection={pomSubs.find(
            (s) => (pomCounts.get(s.id) ?? 0) === 0
          )}
        />
        <LearnCard
          articlesRead={articlesRead}
          articlesTotal={CONTENT_ITEMS.length}
          quizzesTaken={quizzesTaken}
          quizzesPassed={quizzesPassed}
        />
      </aside>
    </div>
  );
}

function WizardResumeCard({
  doneCount,
  totalCount,
}: {
  doneCount: number;
  totalCount: number;
}) {
  const pct =
    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  return (
    <Link
      href="/welcome"
      className="group flex items-center gap-4 rounded-2xl bg-black text-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
    >
      <span
        className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-white/15 shrink-0"
        aria-hidden
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12h14M13 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-medium leading-snug">
          <span className="text-[10px] uppercase tracking-widest text-white/80 font-medium mr-2">
            Finish setting up
          </span>
          {doneCount === 0
            ? "Take the 3-minute tour"
            : `You're ${doneCount} of ${totalCount} steps in`}
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-white/15 overflow-hidden">
          <div
            className="h-full bg-white transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span
        className="text-white/90 transition-transform group-hover:translate-x-1 shrink-0"
        aria-hidden
      >
        →
      </span>
    </Link>
  );
}

function WelcomeHero({
  firstName,
  avatarUrl,
  lifeAdminPct,
}: {
  firstName: string;
  avatarUrl: string | null;
  lifeAdminPct: number;
}) {
  const initial = firstName.charAt(0).toUpperCase();
  return (
    <section className="rounded-2xl bg-tal-cream-soft p-6 flex items-center gap-6">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={avatarUrl}
            alt=""
            className="w-16 h-16 rounded-full object-cover shrink-0"
          />
        ) : (
          <span className="w-16 h-16 rounded-full bg-tal-plum text-white text-2xl font-semibold flex items-center justify-center shrink-0">
            {initial}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl text-tal-plum leading-tight truncate">
            Welcome back, {firstName}!{" "}
            <span aria-hidden>👋</span>
          </h1>
          <p className="text-tal-plum-soft text-sm mt-1">
            Here&apos;s what&apos;s happening in your life today.
          </p>
        </div>
      </div>
      <div className="rounded-2xl bg-white/70 px-4 py-3 w-[240px] shrink-0">
        <div className="flex items-center gap-2 text-tal-plum mb-0.5">
          <span aria-hidden>✨</span>
          <span className="font-medium text-sm">You&apos;re doing great!</span>
        </div>
        <p className="text-xs text-tal-plum-soft mb-2">
          You&apos;ve completed {lifeAdminPct}% of your Life Admin
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-tal-cream overflow-hidden">
            <div
              className="h-full bg-violet-500 transition-all"
              style={{ width: `${lifeAdminPct}%` }}
            />
          </div>
          <span className="text-xs font-medium text-tal-plum tabular-nums">
            {lifeAdminPct}%
          </span>
        </div>
      </div>
    </section>
  );
}

function StatCards({
  documentsCount,
  remindersCount,
  tasksOutstanding,
  healthyCount,
}: {
  documentsCount: number;
  remindersCount: number;
  tasksOutstanding: number;
  healthyCount: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        href="/records"
        tone="violet"
        icon={<FolderStatIcon />}
        value={documentsCount}
        label="Records & Documents"
        sub="Stored securely"
      />
      <StatCard
        href="/reminders"
        tone="amber"
        icon={<CalendarIcon />}
        value={remindersCount}
        label="Things expiring soon"
        sub="View reminders"
      />
      <StatCard
        href="/tasks"
        tone="sky"
        icon={<ClipboardIcon />}
        value={tasksOutstanding}
        label="Tasks to complete"
        sub={tasksOutstanding === 0 ? "All done!" : "Keep it up!"}
      />
      <StatCard
        href="/records"
        tone="emerald"
        icon={<ShieldIcon />}
        value={healthyCount}
        label="All good"
        sub="No overdue items"
      />
    </div>
  );
}

function StatCard({
  href,
  tone,
  icon,
  value,
  label,
  sub,
}: {
  href: string;
  tone: "violet" | "amber" | "sky" | "emerald";
  icon: React.ReactNode;
  value: number;
  label: string;
  sub: string;
}) {
  const bg =
    tone === "violet"
      ? "bg-violet-50 ring-violet-100"
      : tone === "amber"
      ? "bg-amber-50 ring-amber-100"
      : tone === "sky"
      ? "bg-sky-50 ring-sky-100"
      : "bg-emerald-50 ring-emerald-100";
  const iconBg =
    tone === "violet"
      ? "bg-violet-100 text-violet-600"
      : tone === "amber"
      ? "bg-amber-100 text-amber-600"
      : tone === "sky"
      ? "bg-sky-100 text-sky-600"
      : "bg-emerald-100 text-emerald-600";
  return (
    <Link
      href={href}
      className={
        "group rounded-2xl ring-1 p-5 hover:shadow-md hover:-translate-y-0.5 transition " +
        bg
      }
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span
          className={
            "inline-flex items-center justify-center w-11 h-11 rounded-xl " +
            iconBg
          }
          aria-hidden
        >
          {icon}
        </span>
        <span className="font-display text-3xl text-tal-plum leading-none tabular-nums">
          {value}
        </span>
      </div>
      <div className="font-medium text-tal-plum">{label}</div>
      <div className="mt-1 flex items-center justify-between text-xs text-tal-plum-soft">
        <span>{sub}</span>
        <span
          className="transition-transform group-hover:translate-x-1"
          aria-hidden
        >
          →
        </span>
      </div>
    </Link>
  );
}

function FolderStatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2c.4 0 .78.16 1.06.44l1.3 1.31c.28.28.66.44 1.06.44H19.5A1.5 1.5 0 0 1 21 8.69v9.31A1.5 1.5 0 0 1 19.5 19.5h-15A1.5 1.5 0 0 1 3 18V6.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="5.5"
        width="17"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M3.5 10h17M8 3.5v4M16 3.5v4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="5"
        y="5"
        width="14"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect
        x="9"
        y="3"
        width="6"
        height="4"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M9 12h6M9 16h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 4 6v6c0 4.5 3 8 8 9 5-1 8-4.5 8-9V6l-8-3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RemindersSection({
  items,
  totalCount,
}: {
  items: Reminder[];
  totalCount: number;
}) {
  if (totalCount === 0) {
    return (
      <section className="rounded-2xl border border-green-100 bg-green-50/60 p-6">
        <h2 className="font-display text-xl text-tal-plum mb-1">
          Nothing upcoming
        </h2>
        <p className="text-sm text-tal-plum-soft">
          You&apos;re all clear for the next 60 days.
        </p>
      </section>
    );
  }
  const anyExpired = items.some((r) => r.status === "expired");
  return (
    <section
      className={
        "rounded-2xl border p-6 " +
        (anyExpired
          ? "border-red-200 bg-red-50/50"
          : "border-amber-200 bg-amber-50/60")
      }
    >
      <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
        <h2 className="font-display text-xl text-tal-plum">
          Upcoming reminders
        </h2>
        <span className="text-sm text-tal-plum-soft">
          {totalCount} in the next 60 days
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((r) => (
          <li key={r.id}>
            <Link
              href={r.href}
              className="flex items-center justify-between gap-3 rounded-xl border border-tal-line bg-white p-3 hover:shadow-sm"
            >
              <div className="min-w-0">
                <div className="font-medium text-tal-plum truncate">
                  {r.title}
                </div>
                <div className="text-xs text-tal-plum-soft">
                  {formatReminderDue(r.dueDate, r.daysUntil, r.status)}
                </div>
              </div>
              <span
                className={
                  "text-xs rounded-full px-2 py-0.5 shrink-0 " +
                  (r.status === "expired"
                    ? "bg-red-100 text-red-800"
                    : "bg-amber-100 text-amber-900")
                }
              >
                {r.status === "expired" ? "Expired" : "Soon"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {totalCount > items.length && (
        <div className="mt-4 text-right">
          <Link
            href="/reminders"
            className="text-sm font-medium text-tal-plum hover:underline"
          >
            Show more →
          </Link>
        </div>
      )}
    </section>
  );
}

function formatReminderDue(
  date: string,
  days: number,
  status: Reminder["status"]
): string {
  const dateStr = new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (status === "expired") {
    const overdue = Math.abs(days);
    return `Expired ${overdue} day${overdue === 1 ? "" : "s"} ago · ${dateStr}`;
  }
  if (days === 0) return `Due today · ${dateStr}`;
  return `Due in ${days} day${days === 1 ? "" : "s"} · ${dateStr}`;
}

function PomCard({
  filled,
  total,
  nextSection,
}: {
  filled: number;
  total: number;
  nextSection?: { id: string; name: string };
}) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  const nextSlug = nextSection ? pomSlugFromSubcategoryId(nextSection.id) : null;
  return (
    <Link
      href={
        nextSlug
          ? `/templates/peace-of-mind-planner/${nextSlug}`
          : "/templates/peace-of-mind-planner"
      }
      className="block rounded-2xl border border-tal-line bg-white p-6 hover:shadow-md transition"
    >
      <h2 className="font-display text-xl text-tal-plum mb-1">
        Peace of Mind Planner
      </h2>
      <p className="text-sm text-tal-plum-soft mb-4">
        {filled} of {total} sections filled in.
      </p>
      <div className="h-2 rounded-full bg-tal-cream overflow-hidden mb-3">
        <div
          className="h-full bg-tal-plum transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {nextSection ? (
        <p className="text-sm text-tal-plum">
          Next: <span className="font-medium">{cleanName(nextSection.name)}</span> →
        </p>
      ) : (
        <p className="text-sm text-green-700">All sections filled 🎉</p>
      )}
    </Link>
  );
}

function LearnCard({
  articlesRead,
  articlesTotal,
  quizzesTaken,
  quizzesPassed,
}: {
  articlesRead: number;
  articlesTotal: number;
  quizzesTaken: number;
  quizzesPassed: number;
}) {
  const pct =
    articlesTotal > 0 ? Math.round((articlesRead / articlesTotal) * 100) : 0;
  return (
    <Link
      href="/learn"
      className="block rounded-2xl border border-tal-line bg-white p-6 hover:shadow-md transition"
    >
      <h2 className="font-display text-xl text-tal-plum mb-1">
        Learn progress
      </h2>
      <p className="text-sm text-tal-plum-soft mb-4">
        {articlesRead} of {articlesTotal} articles read.
      </p>
      <div className="h-2 rounded-full bg-tal-cream overflow-hidden mb-3">
        <div
          className="h-full bg-tal-plum transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sm text-tal-plum">
        {quizzesTaken} quiz{quizzesTaken === 1 ? "" : "zes"} taken
        {quizzesPassed > 0 && ` · ${quizzesPassed} passed`} →
      </p>
    </Link>
  );
}

function RecentSection({
  items,
}: {
  items: {
    id: string;
    title: string;
    category_id: CategoryId;
    subcategory_id: string;
    updated_at: string;
  }[];
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="font-display text-xl text-tal-plum mb-3">
        Pick up where you left off
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((r) => (
          <li key={r.id}>
            <Link
              href={
                r.subcategory_id
                  ? `/records/${r.category_id}/${r.subcategory_id}`
                  : `/records/${r.category_id}`
              }
              className="block rounded-xl border border-tal-line bg-white p-3 hover:shadow-sm"
            >
              <div className="font-medium text-tal-plum truncate">
                {r.title}
              </div>
              <div className="text-xs text-tal-plum-soft mt-0.5">
                {CATEGORY_LABELS[r.category_id]} · {formatRelative(r.updated_at)}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const CATEGORY_THEME: Record<
  CategoryId,
  { bg: string; ring: string; folder: string; bar: string }
> = {
  personal: {
    bg: "bg-violet-50",
    ring: "ring-violet-100",
    folder: "text-violet-500",
    bar: "bg-violet-500",
  },
  health: {
    bg: "bg-amber-50",
    ring: "ring-amber-100",
    folder: "text-amber-500",
    bar: "bg-amber-500",
  },
  education: {
    bg: "bg-sky-50",
    ring: "ring-sky-100",
    folder: "text-sky-500",
    bar: "bg-sky-500",
  },
  employment: {
    bg: "bg-rose-50",
    ring: "ring-rose-100",
    folder: "text-rose-500",
    bar: "bg-rose-500",
  },
  admin: {
    bg: "bg-emerald-50",
    ring: "ring-emerald-100",
    folder: "text-emerald-500",
    bar: "bg-emerald-500",
  },
};

function LifeAdminOverview({
  progress,
}: {
  progress: Map<
    CategoryId,
    { totalFolders: number; completedFolders: number; startedFolders: number }
  >;
}) {
  return (
    <section className="rounded-2xl border border-tal-line bg-white p-6">
      <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
        <h2 className="font-display text-xl text-tal-plum">
          Life Admin Overview
        </h2>
        <Link
          href="/records"
          className="text-sm text-tal-plum-soft hover:text-tal-plum hover:underline"
        >
          View all sections →
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {CATEGORY_IDS.map((id) => {
          const p = progress.get(id) ?? {
            totalFolders: 0,
            completedFolders: 0,
            startedFolders: 0,
          };
          const pct =
            p.totalFolders > 0
              ? Math.round((p.completedFolders / p.totalFolders) * 100)
              : 0;
          const missing = Math.max(p.totalFolders - p.completedFolders, 0);
          const theme = CATEGORY_THEME[id];
          return (
            <Link
              key={id}
              href={`/records/${id}`}
              className={
                "group flex flex-col rounded-2xl ring-1 p-4 hover:shadow-md hover:-translate-y-0.5 transition " +
                theme.bg +
                " " +
                theme.ring
              }
            >
              <span
                className={"mx-auto mb-2 " + theme.folder}
                aria-hidden
              >
                <FolderGlyph />
              </span>
              <div className="text-center text-sm font-medium text-tal-plum leading-tight mb-2">
                {CATEGORY_LABELS[id]}
              </div>
              <div className="text-center font-display text-3xl text-tal-plum leading-none">
                {p.completedFolders}
              </div>
              <div className="text-center text-xs text-tal-plum-soft mb-3">
                Records
              </div>
              <div className="h-1.5 rounded-full bg-white overflow-hidden mb-3">
                <div
                  className={"h-full transition-all " + theme.bar}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div
                className={
                  "flex items-center justify-center gap-1 text-xs " +
                  (missing === 0
                    ? "text-emerald-700"
                    : "text-tal-plum-soft")
                }
              >
                {missing === 0 ? (
                  <>
                    <TickBadge />
                    All up to date
                  </>
                ) : (
                  <>
                    <WarnBadge />
                    {missing} missing item{missing === 1 ? "" : "s"}
                  </>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function FolderGlyph() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2c.4 0 .78.16 1.06.44l1.3 1.31c.28.28.66.44 1.06.44H19.5A1.5 1.5 0 0 1 21 8.69v9.31A1.5 1.5 0 0 1 19.5 19.5h-15A1.5 1.5 0 0 1 3 18V6.5Z" />
    </svg>
  );
}

function TickBadge() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="m8 12 3 3 5-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarnBadge() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 2 20h20L12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 10v4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

function EmergencyCard() {
  return (
    <Link
      href="/emergency"
      className="block rounded-2xl bg-red-600 text-white p-5 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition"
    >
      <div className="flex items-start gap-3">
        <span
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 shrink-0"
          aria-hidden
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2 3 20h18L12 2Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <path d="M12 9v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="17" r="1.1" fill="currentColor" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest text-white/80 font-medium mb-0.5">
            In case of emergency
          </div>
          <div className="font-medium leading-snug">
            Your emergency information
          </div>
          <p className="text-xs text-white/85 mt-1">
            Contacts, medications, insurance, will — one page, ready when it&apos;s needed.
          </p>
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium">
            View & print →
          </div>
        </div>
      </div>
    </Link>
  );
}

function QuickActions() {
  const actions = [
    {
      href: "/records/personal/new",
      label: "Add Record",
      tone: "violet",
      icon: <PlusIcon />,
    },
    {
      href: "/records",
      label: "Upload Document",
      tone: "emerald",
      icon: <UploadIcon />,
    },
    {
      href: "/records",
      label: "Scan Document",
      tone: "amber",
      icon: <CameraIcon />,
    },
    {
      href: "/reminders",
      label: "Add Reminder",
      tone: "rose",
      icon: <BellPlusIcon />,
    },
  ] as const;
  return (
    <section className="rounded-2xl border border-tal-line bg-white p-5">
      <h2 className="font-display text-lg text-tal-plum mb-3">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className={
              "group flex flex-col items-center justify-center gap-2 rounded-xl p-4 text-center transition hover:-translate-y-0.5 hover:shadow-md " +
              quickActionBg(a.tone)
            }
          >
            <span
              className={
                "inline-flex items-center justify-center w-10 h-10 rounded-full " +
                quickActionIconBg(a.tone)
              }
              aria-hidden
            >
              {a.icon}
            </span>
            <span className="text-sm font-medium text-tal-plum">
              {a.label}
            </span>
          </Link>
        ))}
      </div>
      
    </section>
  );
}

type QuickActionTone = "violet" | "emerald" | "amber" | "rose";

function quickActionBg(tone: QuickActionTone): string {
  switch (tone) {
    case "violet":
      return "bg-violet-50 hover:bg-violet-100";
    case "emerald":
      return "bg-emerald-50 hover:bg-emerald-100";
    case "amber":
      return "bg-amber-50 hover:bg-amber-100";
    case "rose":
      return "bg-rose-50 hover:bg-rose-100";
  }
}

function quickActionIconBg(tone: QuickActionTone): string {
  switch (tone) {
    case "violet":
      return "bg-violet-100 text-violet-600";
    case "emerald":
      return "bg-emerald-100 text-emerald-600";
    case "amber":
      return "bg-amber-100 text-amber-600";
    case "rose":
      return "bg-rose-100 text-rose-600";
  }
}

function TalAiHelperCard() {
  return (
    <section className="rounded-2xl border border-tal-line bg-white p-5">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg text-tal-plum mb-1">
            Need help with something?
          </h2>
          <p className="text-xs text-tal-plum-soft mb-3">
            Ask TAL AI your questions and get instant answers.
          </p>
          <Link
            href="/tal-ai"
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-black text-white text-sm font-medium hover:bg-tal-plum-dark"
          >
            Ask a question
          </Link>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-tal-cream-soft flex items-center justify-center shrink-0 text-tal-plum">
          <RobotIcon />
        </div>
      </div>
    </section>
  );
}

function ContinueLearningCard({ article }: { article: ContentItem | null }) {
  return (
    <section className="rounded-2xl border border-tal-line bg-white p-5">
      <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
        <h2 className="font-display text-xl text-tal-plum">Continue Learning</h2>
        <Link
          href="/learn"
          className="text-sm text-tal-plum-soft hover:text-tal-plum hover:underline"
        >
          View all →
        </Link>
      </div>
      {article ? (
        <Link
          href={`/learn/${article.categoryId}/article/${article.id}`}
          className="group flex items-center gap-4 rounded-xl p-3 -mx-3 hover:bg-tal-cream-soft transition-colors"
        >
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-100 to-tal-cream-soft flex items-center justify-center shrink-0 text-violet-600">
            <BookIcon />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-violet-700 mb-1">
              Recommended for you
            </div>
            <div className="font-medium text-tal-plum leading-snug line-clamp-2">
              {article.title}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-tal-plum-soft">
              <span>Start reading</span>
              <span aria-hidden className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </div>
          </div>
        </Link>
      ) : (
        <p className="text-sm text-tal-plum-soft">
          You&apos;ve read every article — nice work!
        </p>
      )}
    </section>
  );
}

function CelebrationBanner({ uploadsThisMonth }: { uploadsThisMonth: number }) {
  return (
    <div className="rounded-2xl bg-tal-cream border border-tal-line p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"
          aria-hidden
        >
          <StarIcon />
        </span>
        <div className="min-w-0">
          <div className="font-medium text-tal-plum">
            Great job! You&apos;ve uploaded {uploadsThisMonth} new document
            {uploadsThisMonth === 1 ? "" : "s"} this month.
          </div>
          <div className="text-xs text-tal-plum-soft">
            You&apos;re building a better future for you!
          </div>
        </div>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15V5m0 0-4 4m4-4 4 4M4 19h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8h3l2-3h6l2 3h3v11H4V8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function BellPlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9a6 6 0 0 1 12 0v5l1.5 2.5H4.5L6 14V9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10 19a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RobotIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4"
        y="7"
        width="16"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M9 12h.01M15 12h.01"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M12 4v3M8 19v2M16 19v2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 4.5A1.5 1.5 0 0 1 5.5 3H12v18H5.5A1.5 1.5 0 0 1 4 19.5v-15Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M20 4.5A1.5 1.5 0 0 0 18.5 3H12v18h6.5a1.5 1.5 0 0 0 1.5-1.5v-15Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="m12 2.5 2.9 6 6.6.8-4.9 4.5 1.3 6.6L12 17l-5.9 3.4 1.3-6.6L2.5 9.3l6.6-.8L12 2.5Z" />
    </svg>
  );
}

function RecentActivitySection({ items }: { items: ActivityEvent[] }) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-2xl border border-tal-line bg-white p-6">
      <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
        <h2 className="font-display text-xl text-tal-plum">Recent activity</h2>
        <Link
          href="/activity"
          className="text-sm text-tal-plum-soft hover:text-tal-plum hover:underline"
        >
          View all →
        </Link>
      </div>
      <ul className="space-y-3">
        {items.map((ev) => (
          <li key={ev.id}>
            <Link
              href={ev.href}
              className="flex items-center gap-3 hover:bg-tal-cream-soft rounded-xl -mx-2 px-2 py-2 transition-colors"
            >
              <span
                className={
                  "inline-flex items-center justify-center w-9 h-9 rounded-xl shrink-0 " +
                  activityTone(ev.kind)
                }
                aria-hidden
              >
                <ActivityIcon kind={ev.kind} />
              </span>
              <span className="flex-1 min-w-0 text-sm text-tal-plum truncate">
                {ev.title}
              </span>
              <span className="text-xs text-tal-plum-soft shrink-0 tabular-nums">
                {formatActivityTime(ev.occurredAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function activityTone(kind: ActivityEvent["kind"]): string {
  switch (kind) {
    case "file_uploaded":
      return "bg-violet-100 text-violet-700";
    case "record_added":
    case "record_updated":
      return "bg-sky-100 text-sky-700";
    case "answer_updated":
      return "bg-amber-100 text-amber-800";
    case "lesson_completed":
    case "quiz_completed":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-tal-cream-soft text-tal-plum";
  }
}

function ActivityIcon({ kind }: { kind: ActivityEvent["kind"] }) {
  if (kind === "file_uploaded") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M7 3h8l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  if (kind === "answer_updated") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4V4Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M9 13l2 2 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "lesson_completed" || kind === "quiz_completed") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="m8 12 3 3 5-6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "lesson_started") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M8 5v14l11-7z" fill="currentColor" />
      </svg>
    );
  }
  // records
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2c.4 0 .78.16 1.06.44l1.3 1.31c.28.28.66.44 1.06.44H19.5A1.5 1.5 0 0 1 21 8.69v9.31A1.5 1.5 0 0 1 19.5 19.5h-15A1.5 1.5 0 0 1 3 18V6.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatActivityTime(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const time = then.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (then >= startOfToday) return `Today, ${time}`;
  if (then >= startOfYesterday) return `Yesterday, ${time}`;
  if (diffHr < 24 * 7) {
    const days = Math.floor(diffHr / 24);
    return `${days}d ago`;
  }
  return then.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function cleanName(name: string): string {
  return name.replace(/^TAL\s*[—-]\s*/, "");
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}
