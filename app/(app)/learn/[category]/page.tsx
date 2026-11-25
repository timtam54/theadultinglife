import type { Metadata } from "next";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { notFound } from "next/navigation";
import { isCategoryId } from "@/lib/services/records";
import { CATEGORY_LABELS } from "@/lib/db/types";
import { contentForCategory, guidesForCategory, estimateReadMinutes } from "@/content/learning";
import { listQuizzesForCategory } from "@/lib/db/quizzes";
import { videoCountsByArticle } from "@/lib/db/videos";
import { categoryThumbnail } from "@/lib/thumbnails";
import { subcategoryThumbnailWithFallback } from "@/lib/thumbnails-server";

// One look for every section, like the Organiser: a black header and
// neutral cards, each with its folder's icon.
const ACCENT = {
  bar: "bg-black",
  pillActive: "bg-white text-black",
  pillIdle: "bg-white/10 text-white ring-1 ring-white/30 hover:bg-white/20",
  card: "hover:bg-tal-cream-soft/60",
  cardBorder: "hover:border-tal-plum/30",
  cardHover: "text-tal-plum",
  cardIcon: "text-tal-plum",
  cardIconBg: "bg-tal-cream",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  if (!isCategoryId(category)) return {};
  return { title: `Learn · ${CATEGORY_LABELS[category]}` };
}

export default async function LearnCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ expand?: string }>;
}) {
  const { category } = await params;
  if (!isCategoryId(category)) notFound();
  const { expand } = await searchParams;

  const articles = contentForCategory(category);
  const guides = guidesForCategory(category);
  const [quizzes, videoCounts] = await Promise.all([
    listQuizzesForCategory(category),
    videoCountsByArticle(),
  ]);

  const openArticles = expand == null || expand === "articles" || expand === "article";
  const openGuides = expand === "guides" || expand === "guide";
  const openQuizzes = expand === "quizzes" || expand === "quiz";
  const accent = ACCENT;
  // The folder's own icon where the article or quiz belongs to one.
  const iconFor = (subcategoryId?: string | null) =>
    subcategoryId
      ? subcategoryThumbnailWithFallback(subcategoryId, category)
      : categoryThumbnail(category);

  return (
    <div>
      <Link
        href="/learn"
        className="inline-flex items-center gap-1 text-sm text-tal-plum-soft hover:text-tal-plum mb-4"
      >
        ← Learn
      </Link>

      <div className={"rounded-2xl text-white px-6 py-5 mb-6 shadow-md " + accent.bar}>
        <div className="flex items-center gap-3 flex-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={categoryThumbnail(category)}
            alt=""
            width={48}
            height={48}
            className="shrink-0 w-12 h-12 rounded-xl object-cover ring-2 ring-white/20 bg-white"
          />

          <span className="px-2.5 py-0.5 rounded-full border border-white/30 text-white/90 text-[10px] font-semibold tracking-wider uppercase shrink-0">
            Learn
          </span>
          <h1 className="font-display text-2xl leading-tight">
            {CATEGORY_LABELS[category]}
          </h1>
          <span className="text-white/40 mx-1" aria-hidden>·</span>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link
              href={`/learn/${category}${
                openArticles ? "?expand=none" : "?expand=articles"
              }`}
              scroll={false}
              className={
                "rounded-full px-3 py-1 font-medium transition " +
                (openArticles ? accent.pillActive : accent.pillIdle)
              }
            >
              {articles.length} article{articles.length === 1 ? "" : "s"}
            </Link>
            <Link
              href={`/learn/${category}${
                openGuides ? "?expand=none" : "?expand=guides"
              }`}
              scroll={false}
              className={
                "rounded-full px-3 py-1 font-medium transition " +
                (openGuides ? accent.pillActive : accent.pillIdle)
              }
            >
              {guides.length} guide{guides.length === 1 ? "" : "s"}
            </Link>
            <Link
              href={`/learn/${category}${
                openQuizzes ? "?expand=none" : "?expand=quizzes"
              }`}
              scroll={false}
              className={
                "rounded-full px-3 py-1 font-medium transition " +
                (openQuizzes ? accent.pillActive : accent.pillIdle)
              }
            >
              {quizzes.length} quiz{quizzes.length === 1 ? "" : "zes"}
            </Link>
          </div>
        </div>
      </div>

      <SectionCard
        open={openArticles}
        pillBg={accent.cardIconBg}
        pillText={accent.cardIcon}
        title="Articles"
        count={articles.length}
      >
        {articles.length === 0 ? (
          <EmptyState message="No articles yet." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {articles.map((c) => {
              const vCount = videoCounts.get(c.id) ?? 0;
              const minutes = estimateReadMinutes(c.body);
              return (
                <li key={c.id}>
                  <Link
                    href={`/learn/${category}/article/${c.id}`}
                    className={
                      "tal-hover-card group h-full flex flex-col rounded-2xl border-2 border-tal-line bg-white p-4 transition-all duration-200 " +
                      accent.card + " " + accent.cardBorder
                    }
                  >
                    <div className="flex items-start gap-3 mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={iconFor(c.subcategoryId)}
                        alt=""
                        width={48}
                        height={48}
                        loading="lazy"
                        className="shrink-0 w-12 h-12 rounded-xl object-cover ring-1 ring-tal-line bg-white"
                      />
                      <div className="min-w-0 flex-1 self-center">
                        <div className="font-medium text-tal-plum leading-snug">
                          {c.title}
                        </div>
                      </div>
                      {vCount > 0 && (
                        <span
                          className="inline-flex items-center rounded-full bg-red-50 text-red-700 text-[10px] font-medium px-2 py-0.5 shrink-0"
                          aria-label={`${vCount} video`}
                        >
                          {vCount} video{vCount === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-tal-plum-soft flex-1">
                      {c.summary}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-medium text-tal-plum-soft">
                        {minutes} min read
                      </span>
                      <span className={"text-sm font-medium inline-flex items-center gap-1 " + accent.cardHover}>
                        Read
                        <span className="transition-transform group-hover:translate-x-1">
                          →
                        </span>
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        open={openGuides}
        pillBg={accent.cardIconBg}
        pillText={accent.cardIcon}
        title="Guides & forms"
        count={guides.length}
      >
        {guides.length === 0 ? (
          <EmptyState message="No guides yet." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {guides.map((g) => (
              <li key={g.id}>
                <a
                  href={g.href}
                  className={
                    "tal-hover-card group h-full flex flex-col rounded-2xl border-2 border-tal-line bg-white p-4 transition-all duration-200 " +
                    accent.card + " " + accent.cardBorder
                  }
                >
                  <div className="flex items-center gap-3 mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={categoryThumbnail(category)}
                        alt=""
                        width={48}
                        height={48}
                        loading="lazy"
                        className="shrink-0 w-12 h-12 rounded-xl object-cover ring-1 ring-tal-line bg-white"
                      />
                      <div className="font-medium text-tal-plum leading-snug">{g.title}</div>
                  </div>
                  <p className="text-sm text-tal-plum-soft flex-1">
                    {g.description}
                  </p>
                  <div className={"mt-3 text-sm font-medium " + accent.cardHover}>
                    Download
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        open={openQuizzes}
        pillBg={accent.cardIconBg}
        pillText={accent.cardIcon}
        title="Quizzes"
        count={quizzes.length}
        last
      >
        {quizzes.length === 0 ? (
          <EmptyState message="No quizzes yet." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {quizzes.map((q) => (
              <li key={q.id}>
                <Link
                  href={`/learn/${category}/quiz/${q.id}`}
                  className={
                    "tal-hover-card group h-full flex flex-col rounded-2xl border-2 border-tal-line bg-white p-4 transition-all duration-200 " +
                    accent.card + " " + accent.cardBorder
                  }
                >
                  <div className="flex items-center gap-3 mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={iconFor(q.subcategory_id)}
                        alt=""
                        width={48}
                        height={48}
                        loading="lazy"
                        className="shrink-0 w-12 h-12 rounded-xl object-cover ring-1 ring-tal-line bg-white"
                      />
                      <div className="font-medium text-tal-plum leading-snug">{q.title}</div>
                  </div>
                  <p className="text-sm text-tal-plum-soft flex-1">
                    {q.description}
                  </p>
                  <div className={"mt-3 text-sm font-medium inline-flex items-center gap-1 " + accent.cardHover}>
                    Start quiz
                    <span className="transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function SectionCard({
  open,
  pillBg,
  pillText,
  title,
  count,
  last,
  children,
}: {
  open: boolean;
  pillBg: string;
  pillText: string;
  title: string;
  count: number;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={open}
      className={
        (last ? "" : "mb-4 ") +
        "group/section rounded-3xl border border-tal-line bg-white overflow-hidden"
      }
    >
      <summary className="cursor-pointer list-none px-6 py-5 flex items-center justify-between gap-3 hover:bg-tal-cream-soft/50 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="font-display text-2xl text-tal-plum">{title}</h2>
          <span
            className={
              "text-xs font-medium px-2 py-0.5 rounded-full " + pillBg + " " + pillText
            }
          >
            {count}
          </span>
        </div>
        <span
          aria-hidden
          className="text-tal-plum-soft text-sm transition-transform group-open/section:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="px-6 pb-6 pt-1">{children}</div>
    </details>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-tal-line bg-tal-cream-soft/50 p-6 text-center text-tal-plum-soft text-sm">
      {message}
    </div>
  );
}
