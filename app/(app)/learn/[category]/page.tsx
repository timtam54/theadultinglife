import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isCategoryId } from "@/lib/services/records";
import { CATEGORY_LABELS, type CategoryId } from "@/lib/db/types";
import { contentForCategory, guidesForCategory } from "@/content/learning";
import { listQuizzesForCategory } from "@/lib/db/quizzes";
import { videoCountsByArticle } from "@/lib/db/videos";

const CATEGORY_ACCENT: Record<
  CategoryId,
  { bar: string; iconBg: string; pillActive: string; pillIdle: string; sectionIcon: string; sectionIconBg: string; card: string; cardBorder: string; cardHover: string; cardIcon: string; cardIconBg: string; cardIconHover: string }
> = {
  personal: {
    bar: "bg-violet-500",
    iconBg: "bg-white/20",
    pillActive: "bg-white text-violet-700",
    pillIdle: "bg-white/15 text-white hover:bg-white/25",
    sectionIcon: "text-white",
    sectionIconBg: "bg-violet-500",
    card: "hover:bg-violet-50/60",
    cardBorder: "hover:border-violet-200",
    cardHover: "text-violet-700",
    cardIcon: "text-violet-600",
    cardIconBg: "bg-violet-100",
    cardIconHover: "group-hover:bg-violet-500 group-hover:text-white",
  },
  health: {
    bar: "bg-amber-500",
    iconBg: "bg-white/20",
    pillActive: "bg-white text-amber-700",
    pillIdle: "bg-white/15 text-white hover:bg-white/25",
    sectionIcon: "text-white",
    sectionIconBg: "bg-amber-500",
    card: "hover:bg-amber-50/60",
    cardBorder: "hover:border-amber-200",
    cardHover: "text-amber-700",
    cardIcon: "text-amber-600",
    cardIconBg: "bg-amber-100",
    cardIconHover: "group-hover:bg-amber-500 group-hover:text-white",
  },
  education: {
    bar: "bg-sky-500",
    iconBg: "bg-white/20",
    pillActive: "bg-white text-sky-700",
    pillIdle: "bg-white/15 text-white hover:bg-white/25",
    sectionIcon: "text-white",
    sectionIconBg: "bg-sky-500",
    card: "hover:bg-sky-50/60",
    cardBorder: "hover:border-sky-200",
    cardHover: "text-sky-700",
    cardIcon: "text-sky-600",
    cardIconBg: "bg-sky-100",
    cardIconHover: "group-hover:bg-sky-500 group-hover:text-white",
  },
  employment: {
    bar: "bg-rose-500",
    iconBg: "bg-white/20",
    pillActive: "bg-white text-rose-700",
    pillIdle: "bg-white/15 text-white hover:bg-white/25",
    sectionIcon: "text-white",
    sectionIconBg: "bg-rose-500",
    card: "hover:bg-rose-50/60",
    cardBorder: "hover:border-rose-200",
    cardHover: "text-rose-700",
    cardIcon: "text-rose-600",
    cardIconBg: "bg-rose-100",
    cardIconHover: "group-hover:bg-rose-500 group-hover:text-white",
  },
  admin: {
    bar: "bg-emerald-600",
    iconBg: "bg-white/20",
    pillActive: "bg-white text-emerald-700",
    pillIdle: "bg-white/15 text-white hover:bg-white/25",
    sectionIcon: "text-white",
    sectionIconBg: "bg-emerald-600",
    card: "hover:bg-emerald-50/60",
    cardBorder: "hover:border-emerald-200",
    cardHover: "text-emerald-700",
    cardIcon: "text-emerald-600",
    cardIconBg: "bg-emerald-100",
    cardIconHover: "group-hover:bg-emerald-600 group-hover:text-white",
  },
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
  const accent = CATEGORY_ACCENT[category];

  return (
    <div>
      <Link
        href="/learn"
        className="inline-flex items-center gap-1 text-sm text-tal-plum-soft hover:text-tal-plum mb-4"
      >
        ← Learn
      </Link>

      <div className={"rounded-2xl text-white px-6 py-4 mb-6 shadow-md " + accent.bar}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={"inline-flex items-center justify-center w-9 h-9 rounded-xl shrink-0 " + accent.iconBg}>
            <CategoryIcon id={category} />
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-medium tracking-wider uppercase shrink-0">
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
        iconBg={accent.sectionIconBg}
        iconColor={accent.sectionIcon}
        pillBg={accent.cardIconBg}
        pillText={accent.cardIcon}
        icon={<BookIcon />}
        title="Articles"
        count={articles.length}
      >
        {articles.length === 0 ? (
          <EmptyState message="No articles yet." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {articles.map((c) => {
              const vCount = videoCounts.get(c.id) ?? 0;
              return (
                <li key={c.id}>
                  <Link
                    href={`/learn/${category}/article/${c.id}`}
                    className={
                      "group h-full flex flex-col rounded-2xl border-2 border-tal-line bg-white p-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 " +
                      accent.card + " " + accent.cardBorder
                    }
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <span
                        className={
                          "inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-colors " +
                          accent.cardIconBg + " " + accent.cardIcon + " " + accent.cardIconHover
                        }
                      >
                        <BookIcon size={20} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-tal-plum leading-snug">
                          {c.title}
                        </div>
                      </div>
                      {vCount > 0 && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 text-[10px] font-medium px-2 py-0.5 shrink-0"
                          aria-label={`${vCount} video`}
                        >
                          <PlayIcon size={10} />
                          {vCount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-tal-plum-soft flex-1">
                      {c.summary}
                    </p>
                    <div className={"mt-3 text-sm font-medium inline-flex items-center gap-1 " + accent.cardHover}>
                      Read
                      <span className="transition-transform group-hover:translate-x-1">
                        →
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
        iconBg={accent.sectionIconBg}
        iconColor={accent.sectionIcon}
        pillBg={accent.cardIconBg}
        pillText={accent.cardIcon}
        icon={<DocIcon />}
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
                    "group h-full flex flex-col rounded-2xl border-2 border-tal-line bg-white p-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 " +
                    accent.card + " " + accent.cardBorder
                  }
                >
                  <div className="flex items-start gap-3 mb-2">
                    <span
                      className={
                        "inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-colors " +
                        accent.cardIconBg + " " + accent.cardIcon + " " + accent.cardIconHover
                      }
                    >
                      <DocIcon size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-tal-plum leading-snug">
                        {g.title}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-tal-plum-soft flex-1">
                    {g.description}
                  </p>
                  <div className={"mt-3 text-sm font-medium inline-flex items-center gap-1 " + accent.cardHover}>
                    <DownloadIcon size={14} />
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
        iconBg={accent.sectionIconBg}
        iconColor={accent.sectionIcon}
        pillBg={accent.cardIconBg}
        pillText={accent.cardIcon}
        icon={<TargetIcon />}
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
                    "group h-full flex flex-col rounded-2xl border-2 border-tal-line bg-white p-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 " +
                    accent.card + " " + accent.cardBorder
                  }
                >
                  <div className="flex items-start gap-3 mb-2">
                    <span
                      className={
                        "inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-colors " +
                        accent.cardIconBg + " " + accent.cardIcon + " " + accent.cardIconHover
                      }
                    >
                      <TargetIcon size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-tal-plum leading-snug">
                        {q.title}
                      </div>
                    </div>
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
  iconBg,
  iconColor,
  pillBg,
  pillText,
  icon,
  title,
  count,
  last,
  children,
}: {
  open: boolean;
  iconBg: string;
  iconColor: string;
  pillBg: string;
  pillText: string;
  icon: React.ReactNode;
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
          <span
            className={
              "inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0 " +
              iconBg + " " + iconColor
            }
            aria-hidden
          >
            {icon}
          </span>
          <h2 className="font-display text-2xl text-tal-plum">{title}</h2>
          <span
            className={
              "text-xs font-medium px-2 py-0.5 rounded-full " + pillBg + " " + pillText
            }
          >
            {count}
          </span>
        </div>
        <ChevronIcon />
      </summary>
      <div className="px-6 pb-6 pt-1">{children}</div>
    </details>
  );
}

function CategoryIcon({ id }: { id: CategoryId }) {
  switch (id) {
    case "personal":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7" />
          <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "health":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 21s-7-4.5-9-9.5C1.5 7 5 4 8 4c1.7 0 3.1.9 4 2.2C12.9 4.9 14.3 4 16 4c3 0 6.5 3 5 7.5-2 5-9 9.5-9 9.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
      );
    case "education":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M2 9l10-5 10 5-10 5L2 9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "employment":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M3 13h18" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      );
    case "admin":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4V4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
  }
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-tal-line bg-tal-cream-soft/50 p-6 text-center text-tal-plum-soft text-sm">
      {message}
    </div>
  );
}

function BookIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
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

function DocIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path
        d="M8 12h8M8 16h8M8 8h3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TargetIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function DownloadIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 4v12m0 0-4-4m4 4 4-4M4 20h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="text-tal-plum-soft shrink-0 transition-transform group-open/section:rotate-180"
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
