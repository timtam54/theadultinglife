import type { Metadata } from "next";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { requireSession } from "@/lib/auth/session";
import { CATEGORY_IDS, CATEGORY_LABELS, type CategoryId } from "@/lib/db/types";
import {
  contentForCategory,
  guidesForCategory,
  estimateReadMinutes,
  type ContentItem,
} from "@/content/learning";
import { listQuizzesForCategory } from "@/lib/db/quizzes";
import { videoCountsByArticle } from "@/lib/db/videos";
import { listProgress } from "@/lib/db/progress";
import {
  loadLearnPathSummaries,
  loadStreakSummary,
  listUserBadges,
} from "@/lib/services/learnEngagement";
import { getResumePath, type PathProgress } from "@/lib/services/learnPaths";
import { categoryThumbnail, learnThumbnail } from "@/lib/thumbnails";
import { StreakCard, RecentBadgesCard } from "@/components/StreakCard";

export const metadata: Metadata = {
  title: "Learn",
  description: "Guided lessons, quizzes and downloadables — track your progress and become an adulting pro.",
};

const CATEGORY_THEME: Record<
  CategoryId,
  { bg: string; ringDeep: string; text: string; pill: string; bar: string }
> = {
  personal: {
    bg: "bg-violet-100",
    ringDeep: "ring-violet-200",
    text: "text-violet-800",
    pill: "bg-violet-200 text-violet-900",
    bar: "bg-violet-500",
  },
  health: {
    bg: "bg-amber-100",
    ringDeep: "ring-amber-200",
    text: "text-amber-900",
    pill: "bg-amber-200 text-amber-900",
    bar: "bg-amber-500",
  },
  education: {
    bg: "bg-sky-100",
    ringDeep: "ring-sky-200",
    text: "text-sky-900",
    pill: "bg-sky-200 text-sky-900",
    bar: "bg-sky-500",
  },
  employment: {
    bg: "bg-rose-100",
    ringDeep: "ring-rose-200",
    text: "text-rose-900",
    pill: "bg-rose-200 text-rose-900",
    bar: "bg-rose-500",
  },
  admin: {
    bg: "bg-emerald-100",
    ringDeep: "ring-emerald-200",
    text: "text-emerald-900",
    pill: "bg-emerald-200 text-emerald-900",
    bar: "bg-emerald-600",
  },
};

const BROWSE_TYPES: {
  key: string;
  label: string;
  href: string;
  thumbnail: string;
}[] = [
  { key: "articles",  label: "Articles",              href: "/learn/articles",              thumbnail: learnThumbnail("articles") },
  { key: "videos",    label: "Videos",                href: "/learn/videos",                thumbnail: learnThumbnail("videos") },
  { key: "quizzes",   label: "Quizzes",               href: "/learn/quizzes",               thumbnail: learnThumbnail("quizzes") },
  { key: "templates", label: "Peace of Mind Planner", href: "/templates/peace-of-mind-planner", thumbnail: learnThumbnail("peace-of-mind-planner") },
  { key: "downloads", label: "Downloads",             href: "/learn?expand=guides",         thumbnail: learnThumbnail("downloads") },
];

export default async function LearnIndex() {
  const session = await requireSession();
  const [
    quizzesByCategory,
    videoCounts,
    progressRows,
    streak,
    userBadges,
    pathSummaries,
    resumePath,
  ] = await Promise.all([
    Promise.all(CATEGORY_IDS.map((id) => listQuizzesForCategory(id))),
    videoCountsByArticle(),
    listProgress(session.user.id),
    loadStreakSummary(session.user.id),
    listUserBadges(session.user.id),
    loadLearnPathSummaries(session.user.id),
    getResumePath(session.user.id),
  ]);

  const readArticleIds = new Set(
    progressRows
      .filter((p) => p.item_type === "content" && p.status === "completed")
      .map((p) => p.item_id)
  );

  let totalArticles = 0;
  let totalVideos = 0;
  let totalGuides = 0;
  let totalQuizzes = 0;
  let totalArticlesRead = 0;
  for (let i = 0; i < CATEGORY_IDS.length; i++) {
    const cat = CATEGORY_IDS[i];
    const arts = contentForCategory(cat);
    totalArticles += arts.length;
    totalGuides += guidesForCategory(cat).length;
    totalQuizzes += quizzesByCategory[i].length;
    totalArticlesRead += arts.filter((a) => readArticleIds.has(a.id)).length;
    for (const a of arts) totalVideos += videoCounts.get(a.id) ?? 0;
  }

  const overallPct =
    totalArticles > 0
      ? Math.round((totalArticlesRead / totalArticles) * 100)
      : 0;

  const nextArticle: (ContentItem & { categoryId: CategoryId }) | null =
    (() => {
      for (const id of CATEGORY_IDS) {
        const a = contentForCategory(id).find((c) => !readArticleIds.has(c.id));
        if (a) return { ...a, categoryId: id };
      }
      return null;
    })();

  const recommended: (ContentItem & { categoryId: CategoryId })[] = [];
  outer: for (const id of CATEGORY_IDS) {
    for (const a of contentForCategory(id)) {
      if (readArticleIds.has(a.id)) continue;
      if (nextArticle && a.id === nextArticle.id) continue;
      recommended.push({ ...a, categoryId: id });
      if (recommended.length >= 3) break outer;
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-10">
      <div className="lg:col-span-7 space-y-6 min-w-0">
        <header className="rounded-2xl bg-tal-cream-soft border border-tal-line px-5 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={learnThumbnail("adulting-hub")}
              alt=""
              width={40}
              height={40}
              className="shrink-0 w-10 h-10 rounded-xl object-cover ring-1 ring-white bg-white"
            />
            <h1 className="font-display text-2xl text-tal-plum leading-tight">
              The Adulting Life Unlocked
            </h1>
            <span className="text-tal-plum-soft/50" aria-hidden>·</span>
            <p className="text-tal-plum-soft text-sm">
              Practical lessons to help you navigate life with confidence.
            </p>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {resumePath ? (
            <ResumePathCard progress={resumePath} />
          ) : (
            <ResumeLessonCard next={nextArticle} pct={overallPct} />
          )}
          <AdultingProCard
            pct={overallPct}
            articlesRead={totalArticlesRead}
            totalArticles={totalArticles}
            href={
              nextArticle
                ? `/learn/${nextArticle.categoryId}/article/${nextArticle.id}`
                : "/learn/personal"
            }
          />
        </div>

        <section>
          <div className="flex items-baseline justify-between mb-3 flex-wrap gap-3">
            <h2 className="font-display text-xl text-tal-plum">
              Your Learning Paths
            </h2>
            <span className="text-xs text-tal-plum-soft">
              {totalArticlesRead} of {totalArticles} lessons complete
            </span>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {pathSummaries.map((cp) => {
              const theme = CATEGORY_THEME[cp.id];
              const done = cp.totalArticles > 0 && cp.articlesRead >= cp.totalArticles;
              return (
                <Link
                  key={cp.id}
                  href={done ? `/learn/certificate/${cp.id}` : `/learn/${cp.id}`}
                  className={
                    "group flex flex-col rounded-2xl ring-1 p-4 hover:shadow-md hover:-translate-y-0.5 transition " +
                    theme.bg +
                    " " +
                    theme.ringDeep
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={categoryThumbnail(cp.id)}
                    alt=""
                    width={48}
                    height={48}
                    className="shrink-0 w-12 h-12 rounded-xl object-cover ring-1 ring-white bg-white mb-2"
                  />
                  <div className={"text-sm font-medium leading-tight " + theme.text}>
                    {CATEGORY_LABELS[cp.id]}
                  </div>
                  <div className="text-[11px] text-tal-plum-soft mt-0.5">
                    {cp.totalArticles} lesson{cp.totalArticles === 1 ? "" : "s"}
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-white/70 overflow-hidden">
                    <div
                      className={"h-full transition-all " + theme.bar}
                      style={{ width: `${cp.pct}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-[10px] tabular-nums text-tal-plum-soft flex items-center justify-between">
                    <span>{cp.articlesRead}/{cp.totalArticles}</span>
                    <span className="font-medium">{cp.pct}%</span>
                  </div>
                  {done && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/80 text-[10px] font-medium text-tal-plum px-2 py-0.5 self-start">
                      🏆 Certificate ready
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-tal-line bg-white p-5">
          <div className="flex items-baseline justify-between mb-3 flex-wrap gap-3">
            <h2 className="font-display text-xl text-tal-plum">
              Browse by content type
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {BROWSE_TYPES.map((t) => (
              <Link
                key={t.key}
                href={t.href}
                className="group flex flex-col items-center text-center gap-2 rounded-xl p-4 border border-tal-line hover:shadow-md hover:-translate-y-0.5 transition bg-tal-cream-soft/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={t.thumbnail}
                  alt=""
                  width={48}
                  height={48}
                  className="shrink-0 w-12 h-12 rounded-xl object-cover ring-1 ring-white bg-white"
                />
                <span className="text-sm font-medium text-tal-plum">
                  {t.label}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-tal-plum-soft">
                  {counterFor(t.key, {
                    totalArticles,
                    totalVideos,
                    totalQuizzes,
                    totalGuides,
                  })}
                </span>
              </Link>
            ))}
          </div>
        </section>

      </div>

        <aside className="lg:col-span-3 space-y-4">
          <StreakCard
            currentStreak={streak.currentStreak}
            longestStreak={streak.longestStreak}
          />

          <RecentBadgesCard earned={userBadges} />

          <section className="rounded-2xl border border-tal-line bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg text-tal-plum">
                Up next
              </h2>
              <Link
                href="/learn/personal"
                className="text-xs text-tal-plum-soft hover:text-tal-plum hover:underline"
              >
                View all →
              </Link>
            </div>
            {recommended.length === 0 ? (
              <p className="text-sm text-tal-plum-soft">
                You&apos;ve read every article. Check back for new lessons soon.
              </p>
            ) : (
              <ul className="space-y-2">
                {recommended.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/learn/${a.categoryId}/article/${a.id}`}
                      className="group flex items-center gap-3 rounded-xl p-2 -mx-2 hover:bg-tal-cream-soft transition"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={categoryThumbnail(a.categoryId)}
                        alt=""
                        width={40}
                        height={40}
                        className="shrink-0 w-10 h-10 rounded-lg object-cover ring-1 ring-white bg-white"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-tal-plum leading-snug line-clamp-2">
                          {a.title}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-tal-plum-soft mt-0.5">
                          {CATEGORY_LABELS[a.categoryId]}
                        </div>
                      </div>
                      <span
                        className="text-tal-plum-soft group-hover:text-tal-plum group-hover:translate-x-1 transition"
                        aria-hidden
                      >
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Link
            href="/tal-ai"
            className="block rounded-2xl border border-tal-line bg-tal-cream-soft p-5 hover:shadow-md transition"
          >
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={learnThumbnail("tal-ai")}
                alt=""
                width={44}
                height={44}
                className="shrink-0 w-11 h-11 rounded-xl object-cover ring-1 ring-white bg-white"
              />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-tal-plum-soft mb-1">
                  Ask TAL AI
                </div>
                <div className="font-medium text-tal-plum leading-snug">
                  Stuck on something?
                </div>
                <p className="text-xs text-tal-plum-soft mt-1">
                  Ask about anything you&apos;ve just read — TAL AI can explain,
                  summarise or dig deeper.
                </p>
              </div>
            </div>
          </Link>
        </aside>
    </div>
  );
}

function counterFor(
  key: string,
  totals: {
    totalArticles: number;
    totalVideos: number;
    totalQuizzes: number;
    totalGuides: number;
  }
): string {
  if (key === "articles") return `${totals.totalArticles} available`;
  if (key === "videos") return `${totals.totalVideos} available`;
  if (key === "quizzes") return `${totals.totalQuizzes} available`;
  if (key === "downloads") return `${totals.totalGuides} available`;
  return "Explore";
}

function ResumeLessonCard({
  next,
  pct,
}: {
  next: (ContentItem & { categoryId: CategoryId }) | null;
  pct: number;
}) {
  if (!next) {
    return (
      <div className="rounded-2xl bg-emerald-100 ring-1 ring-emerald-200 p-5">
        <div className="text-[10px] uppercase tracking-widest text-emerald-800 mb-1 font-medium">
          You&apos;re a graduate
        </div>
        <div className="font-display text-xl text-emerald-900 leading-tight">
          You&apos;ve read every lesson — amazing work!
        </div>
        <div className="mt-4 text-sm text-emerald-800">
          Revisit past articles or try a quiz to keep sharp.
        </div>
      </div>
    );
  }
  const theme = CATEGORY_THEME[next.categoryId];
  return (
    <Link
      href={`/learn/${next.categoryId}/article/${next.id}`}
      className={
        "block rounded-2xl ring-1 p-5 hover:shadow-md hover:-translate-y-0.5 transition " +
        theme.bg +
        " " +
        theme.ringDeep
      }
    >
      <div
        className={
          "text-[10px] uppercase tracking-widest mb-1 font-medium " + theme.text
        }
      >
        {pct === 0 ? "Start here" : "Resume lesson"}
      </div>
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={categoryThumbnail(next.categoryId)}
          alt=""
          width={48}
          height={48}
          className="shrink-0 w-12 h-12 rounded-xl object-cover ring-1 ring-white bg-white"
        />
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg text-tal-plum leading-tight line-clamp-2">
            {next.title}
          </div>
          <div className="text-xs text-tal-plum-soft mt-1">
            {CATEGORY_LABELS[next.categoryId]} · {estimateReadMinutes(next.body)} min read
          </div>
        </div>
      </div>
      <div className="mt-4 inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-black text-white text-sm font-medium">
        {pct === 0 ? "Start lesson" : "Resume lesson"} →
      </div>
    </Link>
  );
}

function ResumePathCard({ progress }: { progress: PathProgress }) {
  const theme = CATEGORY_THEME[progress.path.categoryId];
  const current = progress.currentArticle;
  const next = progress.nextArticle;
  if (!current) return null;
  return (
    <Link
      href={`/learn/${progress.path.categoryId}/article/${current.id}`}
      className={
        "block rounded-2xl ring-1 p-5 hover:shadow-md hover:-translate-y-0.5 transition " +
        theme.bg +
        " " +
        theme.ringDeep
      }
    >
      <div
        className={
          "text-[10px] uppercase tracking-widest mb-1 font-medium " + theme.text
        }
      >
        Continue where you left off
      </div>
      <div className="text-xs text-tal-plum-soft mb-2">
        {progress.path.title} · {CATEGORY_LABELS[progress.path.categoryId]}
      </div>
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={categoryThumbnail(progress.path.categoryId)}
          alt=""
          width={48}
          height={48}
          className="shrink-0 w-12 h-12 rounded-xl object-cover ring-1 ring-white bg-white"
        />
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg text-tal-plum leading-tight line-clamp-2">
            {current.title}
          </div>
          <div className="text-xs text-tal-plum-soft mt-1">
            {estimateReadMinutes(current.body)} min read
          </div>
          {next && (
            <div className="text-xs text-tal-plum-soft mt-1 truncate">
              Next up: {next.title}
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white/70 overflow-hidden">
        <div
          className={"h-full transition-all " + theme.bar}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <div className="mt-1.5 text-[11px] tabular-nums text-tal-plum-soft flex items-center justify-between">
        <span>
          {progress.completed} of {progress.total} lessons complete
        </span>
        <span className="font-medium">{progress.percent}%</span>
      </div>
      <div className="mt-3 inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-black text-white text-sm font-medium">
        Resume lesson →
      </div>
    </Link>
  );
}

function AdultingProCard({
  pct,
  articlesRead,
  totalArticles,
  href,
}: {
  pct: number;
  articlesRead: number;
  totalArticles: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl bg-tal-cream ring-1 ring-tal-cream p-5 relative overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition"
    >
      <div className="absolute top-4 right-4 text-2xl" aria-hidden>
        🏆
      </div>
      <div className="text-[10px] uppercase tracking-widest text-tal-plum mb-1 font-medium">
        Keep going
      </div>
      <div className="font-display text-xl text-tal-plum leading-tight">
        You&apos;re becoming an Adulting Pro!
      </div>
      <div className="flex items-baseline gap-2 mt-4">
        <div className="font-display text-2xl text-tal-plum leading-none tabular-nums">
          {pct}%
        </div>
        <div className="text-sm text-tal-plum-soft">complete</div>
      </div>
      <div className="mt-2 h-2 rounded-full bg-white overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-tal-plum transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-2 gap-2">
        <div className="text-xs text-tal-plum-soft">
          {articlesRead} of {totalArticles} lessons read
        </div>
        <span className="text-xs font-medium text-tal-plum inline-flex items-center gap-1 shrink-0 group-hover:underline">
          Next lesson
          <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
        </span>
      </div>
    </Link>
  );
}

