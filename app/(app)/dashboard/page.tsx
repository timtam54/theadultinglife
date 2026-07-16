import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { listUserRecords } from "@/lib/services/records";
import { categoryProgressForFamily } from "@/lib/services/folder-completion";
import { listProgress } from "@/lib/db/progress";
import { listSubcategoriesByTemplateGroup } from "@/lib/db/subcategories";
import { countInstancesBySubcategory } from "@/lib/db/responses";
import { getFamilyGroup } from "@/lib/db/family-groups";
import {
  CATEGORY_IDS,
  CATEGORY_LABELS,
  type CategoryId,
  type RecordStatus,
} from "@/lib/db/types";
import { CONTENT_ITEMS } from "@/content/learning";
import { pomSlugFromSubcategoryId } from "@/lib/templates/peace-of-mind";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your Adulting Life overview — what's expiring, what's next, and how you're tracking.",
};

const ONBOARDING_THRESHOLD = 0.8;

type OnboardingTask = {
  id: string;
  label: string;
  href: string;
  done: boolean;
};

export default async function DashboardPage() {
  const session = await requireSession();
  const first = session.user.firstName ?? session.user.name?.split(" ")[0] ?? "there";

  const [
    records,
    categoryProgress,
    progressRows,
    pomSubs,
    familyGroup,
  ] = await Promise.all([
    listUserRecords(session.user.id),
    categoryProgressForFamily(session.user.familyGroupId),
    listProgress(session.user.id),
    listSubcategoriesByTemplateGroup("peace_of_mind"),
    getFamilyGroup(session.user.familyGroupId),
  ]);

  const pomCounts = await countInstancesBySubcategory(
    session.user.id,
    pomSubs.map((s) => s.id)
  );

  const expiring = records
    .filter((r) => r.status === "expiring_soon" || r.status === "expired")
    .sort((a, b) => {
      const ax = a.expiry_date ?? "";
      const bx = b.expiry_date ?? "";
      return ax < bx ? -1 : ax > bx ? 1 : 0;
    })
    .slice(0, 5);

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

  const familyRosterDone = familyGroup?.all_users_added_at != null;

  const totalStartedFolders = Array.from(categoryProgress.values()).reduce(
    (a, c) => a + c.startedFolders,
    0
  );
  const totalCompletedFolders = Array.from(categoryProgress.values()).reduce(
    (a, c) => a + c.completedFolders,
    0
  );

  const onboarding: OnboardingTask[] = [
    {
      id: "family-roster",
      label: "Add your family members (or confirm it's just you)",
      href: "/records/personal/personal.general_information",
      done: familyRosterDone,
    },
    {
      id: "folder-start",
      label: "Start filling in a Life Admin folder",
      href: "/records",
      done: totalStartedFolders > 0 || totalCompletedFolders > 0,
    },
    {
      id: "folder-complete",
      label: "Finish filling in a Life Admin folder",
      href: "/records",
      done: totalCompletedFolders > 0,
    },
    {
      id: "pom-start",
      label: "Fill in one Peace of Mind section",
      href: "/templates/peace-of-mind-planner",
      done: pomSectionsWithEntries >= 1,
    },
    {
      id: "pom-half",
      label: "Complete 5 Peace of Mind sections",
      href: "/templates/peace-of-mind-planner",
      done: pomSectionsWithEntries >= 5,
    },
    {
      id: "learn-article",
      label: "Read your first Learn article",
      href: "/learn",
      done: articlesRead >= 1,
    },
    {
      id: "quiz-first",
      label: "Take a quiz",
      href: "/learn/quizzes",
      done: quizzesTaken >= 1,
    },
    {
      id: "watch-video",
      label: "Watch a Learn video",
      href: "/learn/videos",
      done: false,
    },
  ];
  const doneCount = onboarding.filter((t) => t.done).length;
  const onboardingComplete = doneCount / onboarding.length >= ONBOARDING_THRESHOLD;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl text-tal-plum mb-1">
          Hi {first}
        </h1>
        <p className="text-tal-plum-soft">
          {onboardingComplete
            ? "Here's what needs your attention."
            : "Let's get you set up. Work through the checklist below."}
        </p>
      </header>

      {!onboardingComplete && (
        <OnboardingSection tasks={onboarding} done={doneCount} />
      )}

      {onboardingComplete && (
        <>
          <ExpiringSection
            items={expiring.map((r) => ({
              id: r.id,
              title: r.title,
              expiryDate: r.expiry_date,
              status: r.status,
              href: r.subcategory_id
                ? `/records/${r.category_id}/${r.subcategory_id}`
                : `/records/${r.category_id}`,
            }))}
          />

          <div className="grid gap-4 md:grid-cols-2">
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
          </div>

          <RecentSection
            items={recent.map((r) => ({
              id: r.id,
              title: r.title,
              category_id: r.category_id,
              subcategory_id: r.subcategory_id ?? "",
              updated_at: r.updated_at,
            }))}
          />
        </>
      )}

      <ProgressSection
        progress={categoryProgress}
      />

      <NavCards />
    </div>
  );
}

function OnboardingSection({
  tasks,
  done,
}: {
  tasks: OnboardingTask[];
  done: number;
}) {
  const pct = Math.round((done / tasks.length) * 100);
  return (
    <section className="rounded-2xl border border-tal-line bg-white p-6">
      <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
        <h2 className="font-display text-xl text-tal-plum">Get started</h2>
        <span className="text-sm text-tal-plum-soft">
          {done} of {tasks.length} done · {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-tal-cream overflow-hidden mb-4">
        <div
          className="h-full bg-tal-plum transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="space-y-2">
        {tasks.map((t) => (
          <li key={t.id}>
            <Link
              href={t.href}
              className={
                "flex items-center gap-3 rounded-xl border p-3 transition " +
                (t.done
                  ? "border-green-100 bg-green-50/50 text-tal-plum-soft"
                  : "border-amber-200 bg-amber-50/60 text-tal-plum hover:shadow-sm")
              }
            >
              <span
                className={
                  "inline-flex h-6 w-6 items-center justify-center rounded-full shrink-0 " +
                  (t.done
                    ? "bg-green-600 text-white"
                    : "bg-amber-100 text-amber-900")
                }
              >
                {t.done ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M5 12l4 4 10-10"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M12 8v5"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <circle cx="12" cy="16.5" r="1.25" fill="currentColor" />
                  </svg>
                )}
              </span>
              <span
                className={
                  "flex-1 text-sm " + (t.done ? "line-through" : "font-medium")
                }
              >
                {t.label}
              </span>
              {!t.done && <span className="text-tal-plum-soft text-sm">→</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExpiringSection({
  items,
}: {
  items: {
    id: string;
    title: string;
    expiryDate: string | null;
    status: RecordStatus | null;
    href: string;
  }[];
}) {
  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-green-100 bg-green-50/60 p-6">
        <h2 className="font-display text-xl text-tal-plum mb-1">
          Nothing expiring soon
        </h2>
        <p className="text-sm text-tal-plum-soft">
          You&apos;re all clear for the next 30 days.
        </p>
      </section>
    );
  }
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6">
      <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
        <h2 className="font-display text-xl text-tal-plum">
          Needs attention
        </h2>
        <span className="text-sm text-tal-plum-soft">
          {items.length} record{items.length === 1 ? "" : "s"}
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
                  {formatExpiry(r.expiryDate, r.status)}
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
    </section>
  );
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

function ProgressSection({
  progress,
}: {
  progress: Map<CategoryId, { totalFolders: number; completedFolders: number; startedFolders: number }>;
}) {
  return (
    <section>
      <h2 className="font-display text-xl text-tal-plum mb-3">Life Admin progress</h2>
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
          return (
            <Link
              key={id}
              href={`/records/${id}`}
              className="block rounded-xl border border-tal-line bg-white p-4 hover:shadow-sm"
            >
              <div className="text-sm font-medium text-tal-plum mb-2">
                {CATEGORY_LABELS[id]}
              </div>
              <div className="h-2 rounded-full bg-tal-cream overflow-hidden mb-2">
                <div
                  className="h-full bg-tal-plum transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-xs text-tal-plum-soft">
                {p.completedFolders}/{p.totalFolders} folders · {pct}%
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function NavCards() {
  return (
    <section>
      <h2 className="font-display text-xl text-tal-plum mb-3">Jump to</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <NavCard
          href="/records"
          title="Life Administration"
          body="Records, expiries, per-folder documents."
        />
        <NavCard
          href="/templates"
          title="Document Templates"
          body="Peace of Mind Planner and fillable forms."
        />
        <NavCard
          href="/learn"
          title="Learn"
          body="Articles, guides, quizzes, videos."
        />
      </div>
    </section>
  );
}

function NavCard({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-tal-line bg-tal-cream-soft p-4 hover:shadow-sm"
    >
      <div className="font-medium text-tal-plum">{title}</div>
      <div className="text-xs text-tal-plum-soft mt-1">{body}</div>
    </Link>
  );
}

function cleanName(name: string): string {
  return name.replace(/^TAL\s*[—-]\s*/, "");
}

function formatExpiry(date: string | null, status: RecordStatus | null): string {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const dateStr = d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (status === "expired") {
    const overdue = Math.abs(days);
    return `Expired ${overdue} day${overdue === 1 ? "" : "s"} ago · ${dateStr}`;
  }
  return `Expires in ${days} day${days === 1 ? "" : "s"} · ${dateStr}`;
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
