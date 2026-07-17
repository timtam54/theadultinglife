import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { CATEGORY_IDS, CATEGORY_LABELS, type CategoryId } from "@/lib/db/types";
import {
  contentForCategory,
  guidesForCategory,
  type ContentItem,
} from "@/content/learning";
import { listQuizzesForCategory } from "@/lib/db/quizzes";
import { videoCountsByArticle } from "@/lib/db/videos";
import { listProgress } from "@/lib/db/progress";

export const metadata: Metadata = {
  title: "Learn",
  description: "Bite-sized guides, downloadable forms and quick quizzes across every life-admin area.",
};

const CATEGORY_THEME: Record<
  CategoryId,
  { bg: string; ring: string; icon: string; iconBg: string; text: string; pill: string }
> = {
  personal: {
    bg: "bg-violet-500",
    ring: "ring-violet-400/40",
    icon: "text-white",
    iconBg: "bg-white/20",
    text: "text-white",
    pill: "bg-white/15 text-white hover:bg-white/25",
  },
  health: {
    bg: "bg-amber-500",
    ring: "ring-amber-400/40",
    icon: "text-white",
    iconBg: "bg-white/20",
    text: "text-white",
    pill: "bg-white/15 text-white hover:bg-white/25",
  },
  education: {
    bg: "bg-sky-500",
    ring: "ring-sky-400/40",
    icon: "text-white",
    iconBg: "bg-white/20",
    text: "text-white",
    pill: "bg-white/15 text-white hover:bg-white/25",
  },
  employment: {
    bg: "bg-rose-500",
    ring: "ring-rose-400/40",
    icon: "text-white",
    iconBg: "bg-white/20",
    text: "text-white",
    pill: "bg-white/15 text-white hover:bg-white/25",
  },
  admin: {
    bg: "bg-emerald-600",
    ring: "ring-emerald-400/40",
    icon: "text-white",
    iconBg: "bg-white/20",
    text: "text-white",
    pill: "bg-white/15 text-white hover:bg-white/25",
  },
};

export default async function LearnIndex() {
  const session = await requireSession();
  const [quizzesByCategory, videoCounts, progressRows] = await Promise.all([
    Promise.all(CATEGORY_IDS.map((id) => listQuizzesForCategory(id))),
    videoCountsByArticle(),
    listProgress(session.user.id),
  ]);
  const quizCounts = quizzesByCategory.map((qs) => qs.length);

  const readArticleIds = new Set(
    progressRows
      .filter((p) => p.item_type === "content" && p.status === "completed")
      .map((p) => p.item_id)
  );
  const passedQuizIds = new Set(
    progressRows
      .filter((p) => p.item_type === "quiz" && p.status === "completed")
      .map((p) => p.item_id)
  );

  const videoCountByCategory = new Map<string, number>();
  let totalVideos = 0;
  let totalArticles = 0;
  let totalGuides = 0;
  let totalQuizzes = 0;
  let totalArticlesRead = 0;
  let totalQuizzesPassed = 0;

  const perCategoryProgress = CATEGORY_IDS.map((id, i) => {
    const articles = contentForCategory(id);
    const quizzes = quizzesByCategory[i];
    const articlesRead = articles.filter((a) => readArticleIds.has(a.id)).length;
    const quizzesPassed = quizzes.filter((q) => passedQuizIds.has(q.id)).length;
    const total = articles.length + quizzes.length;
    const done = articlesRead + quizzesPassed;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return {
      id,
      articles: articles.length,
      articlesRead,
      quizzes: quizzes.length,
      quizzesPassed,
      total,
      done,
      pct,
    };
  });

  for (let i = 0; i < CATEGORY_IDS.length; i++) {
    const id = CATEGORY_IDS[i];
    const n = contentForCategory(id).reduce(
      (acc, a) => acc + (videoCounts.get(a.id) ?? 0),
      0
    );
    videoCountByCategory.set(id, n);
    totalVideos += n;
    totalArticles += contentForCategory(id).length;
    totalGuides += guidesForCategory(id).length;
    totalQuizzes += quizCounts[i];
    totalArticlesRead += perCategoryProgress[i].articlesRead;
    totalQuizzesPassed += perCategoryProgress[i].quizzesPassed;
  }

  const overallTotal = totalArticles + totalQuizzes;
  const overallDone = totalArticlesRead + totalQuizzesPassed;
  const overallPct =
    overallTotal > 0 ? Math.round((overallDone / overallTotal) * 100) : 0;

  const nextArticle: (ContentItem & { categoryId: CategoryId }) | null =
    (() => {
      for (const id of CATEGORY_IDS) {
        const a = contentForCategory(id).find((c) => !readArticleIds.has(c.id));
        if (a) return { ...a, categoryId: id };
      }
      return null;
    })();

  return (
    <div>
      <div className="rounded-2xl bg-black text-white px-6 py-4 mb-4 shadow-md">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-medium tracking-wider uppercase shrink-0">
            Learn
          </span>
          <h1 className="font-display text-2xl leading-tight">
            The Adulting Life Unlocked
          </h1>
          <span className="text-white/40 mx-1" aria-hidden>·</span>
          <span className="text-sm text-white/80 flex items-center gap-3 flex-wrap">
            <span>{totalArticles} articles</span>
            <span className="text-white/30" aria-hidden>·</span>
            <span>{totalGuides} guides</span>
            <span className="text-white/30" aria-hidden>·</span>
            <span>{totalQuizzes} quizzes</span>
            <span className="text-white/30" aria-hidden>·</span>
            <span>{totalVideos} video{totalVideos === 1 ? "" : "s"}</span>
          </span>
        </div>
      </div>

      <section className="rounded-2xl bg-white border border-tal-line p-6 mb-6 shadow-sm">
        <div className="flex items-start gap-4 flex-wrap mb-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-widest text-violet-700 font-medium">
                Your progress
              </span>
              {overallPct === 100 && (
                <span aria-hidden>🎉</span>
              )}
            </div>
            <h2 className="font-display text-2xl text-tal-plum leading-tight">
              {overallPct === 0
                ? "Ready to get started?"
                : overallPct === 100
                ? "You've completed everything — amazing work!"
                : `You're ${overallPct}% through The Adulting Life Unlocked`}
            </h2>
            <p className="text-sm text-tal-plum-soft mt-1">
              {totalArticlesRead} of {totalArticles} articles read
              {" · "}
              {totalQuizzesPassed} of {totalQuizzes} quizzes passed
            </p>
          </div>
          <div className="text-right">
            <div className="font-display text-4xl text-tal-plum leading-none tabular-nums">
              {overallPct}%
            </div>
            <div className="text-xs text-tal-plum-soft mt-1">complete</div>
          </div>
        </div>

        <div className="h-3 rounded-full bg-tal-cream overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-tal-plum transition-all"
            style={{ width: `${overallPct}%` }}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {perCategoryProgress.map((cp) => {
            const theme = CATEGORY_THEME[cp.id];
            return (
              <Link
                key={cp.id}
                href={`/learn/${cp.id}`}
                className="group block rounded-xl border border-tal-line p-3 hover:shadow-md hover:-translate-y-0.5 transition"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={
                      "inline-flex items-center justify-center w-7 h-7 rounded-lg text-white shrink-0 " +
                      theme.bg
                    }
                    aria-hidden
                  >
                    <CategoryIcon id={cp.id} size={16} />
                  </span>
                  <span className="text-sm font-medium text-tal-plum truncate">
                    {CATEGORY_LABELS[cp.id]}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-tal-cream overflow-hidden mb-2">
                  <div
                    className={"h-full transition-all " + theme.bg}
                    style={{ width: `${cp.pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-tal-plum-soft">
                  <span>
                    {cp.done}/{cp.total}
                  </span>
                  <span className="tabular-nums font-medium text-tal-plum">
                    {cp.pct}%
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {nextArticle && (
          <div className="mt-6 pt-5 border-t border-tal-line flex items-center gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-widest text-violet-700 font-medium mb-1">
                {overallPct === 0 ? "Start here" : "Next up"}
              </div>
              <div className="font-medium text-tal-plum leading-snug">
                {nextArticle.title}
              </div>
              <div className="text-xs text-tal-plum-soft mt-0.5">
                {CATEGORY_LABELS[nextArticle.categoryId]}
              </div>
            </div>
            <Link
              href={`/learn/${nextArticle.categoryId}/article/${nextArticle.id}`}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-tal-plum text-white text-sm font-medium hover:bg-tal-plum-dark transition-colors"
            >
              {overallPct === 0 ? "Start reading" : "Continue"}
              <span aria-hidden>→</span>
            </Link>
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORY_IDS.map((id, i) => {
          const content = contentForCategory(id).length;
          const guides = guidesForCategory(id).length;
          const quizzes = quizCounts[i];
          const videos = videoCountByCategory.get(id) ?? 0;
          const theme = CATEGORY_THEME[id];
          return (
            <div
              key={id}
              className={
                "group rounded-2xl ring-1 p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 " +
                theme.bg +
                " " +
                theme.ring
              }
            >
              <Link href={`/learn/${id}`} className="flex items-center gap-3 mb-4">
                <span
                  className={
                    "inline-flex items-center justify-center w-11 h-11 rounded-xl shrink-0 " +
                    theme.iconBg +
                    " " +
                    theme.icon
                  }
                  aria-hidden
                >
                  <CategoryIcon id={id} />
                </span>
                <h2 className={"font-display text-xl " + theme.text}>
                  {CATEGORY_LABELS[id]}
                </h2>
              </Link>
              <div className="flex flex-wrap gap-2 text-xs">
                <Link
                  href={`/learn/${id}?expand=articles`}
                  className={
                    "rounded-full px-3 py-1 font-medium transition " + theme.pill
                  }
                >
                  {content} article{content === 1 ? "" : "s"}
                </Link>
                <Link
                  href={`/learn/${id}?expand=guides`}
                  className={
                    "rounded-full px-3 py-1 font-medium transition " + theme.pill
                  }
                >
                  {guides} guide{guides === 1 ? "" : "s"}
                </Link>
                <Link
                  href={`/learn/${id}?expand=quizzes`}
                  className={
                    "rounded-full px-3 py-1 font-medium transition " + theme.pill
                  }
                >
                  {quizzes} quiz{quizzes === 1 ? "" : "zes"}
                </Link>
                {videos > 0 && (
                  <Link
                    href="/learn/videos"
                    className={
                      "rounded-full px-3 py-1 font-medium transition inline-flex items-center gap-1 " +
                      theme.pill
                    }
                  >
                    <span aria-hidden>▶</span>
                    {videos} video{videos === 1 ? "" : "s"}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <Link
          href="/learn/videos"
          className="block rounded-2xl bg-black text-white px-6 py-4 shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-red-600 shrink-0">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 text-white ml-0.5"
                fill="currentColor"
                aria-hidden
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <h2 className="font-display text-xl leading-tight">Videos</h2>
            <span className="text-white/40 mx-1" aria-hidden>·</span>
            <span className="text-sm text-white/80">
              {totalVideos} video{totalVideos === 1 ? "" : "s"} across all categories
            </span>
            <span className="ml-auto text-sm text-white/70" aria-hidden>→</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

function CategoryIcon({ id, size = 22 }: { id: CategoryId; size?: number }) {
  const s = size;
  switch (id) {
    case "personal":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      );
    case "health":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 21s-7-4.5-9-9.5C1.5 7 5 4 8 4c1.7 0 3.1.9 4 2.2C12.9 4.9 14.3 4 16 4c3 0 6.5 3 5 7.5-2 5-9 9.5-9 9.5Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "education":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M2 9l10-5 10 5-10 5L2 9Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      );
    case "employment":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect
            x="3"
            y="7"
            width="18"
            height="13"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path d="M3 13h18" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      );
    case "admin":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4V4Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M8 12h8M8 16h5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}
