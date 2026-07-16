import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isCategoryId } from "@/lib/services/records";
import { CATEGORY_LABELS } from "@/lib/db/types";
import { contentForCategory, guidesForCategory } from "@/content/learning";
import { listQuizzesForCategory } from "@/lib/db/quizzes";
import { videoCountsByArticle } from "@/lib/db/videos";

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

  return (
    <div>
      <Link
        href="/learn"
        className="inline-flex items-center gap-1 text-sm text-tal-plum-soft hover:text-tal-plum mb-4"
      >
        ← Learn
      </Link>

      <div className="rounded-2xl bg-gradient-to-br from-tal-plum to-tal-plum-dark text-white px-6 py-4 mb-6 shadow-md">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-medium tracking-wider uppercase shrink-0">
            Learn
          </span>
          <h1 className="font-display text-2xl leading-tight">
            {CATEGORY_LABELS[category]}
          </h1>
          <span className="text-white/40 mx-1" aria-hidden>·</span>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-white/80">
            <span>
              {articles.length} article{articles.length === 1 ? "" : "s"}
            </span>
            <span className="text-white/40" aria-hidden>·</span>
            <span>
              {guides.length} guide{guides.length === 1 ? "" : "s"}
            </span>
            <span className="text-white/40" aria-hidden>·</span>
            <span>
              {quizzes.length} quiz{quizzes.length === 1 ? "" : "zes"}
            </span>
          </div>
        </div>
      </div>

      <SectionCard
        open={openArticles}
        color="cream"
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
                    className="group h-full flex flex-col rounded-2xl border-2 border-tal-line bg-white p-4 hover:bg-tal-cream-soft hover:border-tal-cream hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-tal-cream text-tal-plum shrink-0 group-hover:bg-white transition-colors">
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
                    <div className="mt-3 text-sm font-medium text-tal-plum inline-flex items-center gap-1">
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
        color="forest"
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
                  className="group h-full flex flex-col rounded-2xl border-2 border-tal-line bg-white p-4 hover:bg-tal-forest/5 hover:border-tal-forest/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-tal-forest/10 text-tal-forest shrink-0 group-hover:bg-tal-forest group-hover:text-white transition-colors">
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
                  <div className="mt-3 text-sm font-medium text-tal-forest inline-flex items-center gap-1">
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
        color="plum"
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
                  className="group h-full flex flex-col rounded-2xl border-2 border-tal-line bg-white p-4 hover:bg-tal-plum/5 hover:border-tal-plum/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-tal-plum/10 text-tal-plum shrink-0 group-hover:bg-tal-plum group-hover:text-white transition-colors">
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
                  <div className="mt-3 text-sm font-medium text-tal-plum inline-flex items-center gap-1">
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
  color,
  icon,
  title,
  count,
  last,
  children,
}: {
  open: boolean;
  color: "cream" | "forest" | "plum";
  icon: React.ReactNode;
  title: string;
  count: number;
  last?: boolean;
  children: React.ReactNode;
}) {
  const iconCls =
    color === "forest"
      ? "bg-tal-forest text-white"
      : color === "plum"
      ? "bg-tal-plum text-white"
      : "bg-tal-cream text-tal-plum";
  const pillCls =
    color === "forest"
      ? "bg-tal-forest/10 text-tal-forest"
      : color === "plum"
      ? "bg-tal-plum/10 text-tal-plum"
      : "bg-tal-cream text-tal-plum";
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
              iconCls
            }
            aria-hidden
          >
            {icon}
          </span>
          <h2 className="font-display text-2xl text-tal-plum">{title}</h2>
          <span
            className={
              "text-xs font-medium px-2 py-0.5 rounded-full " + pillCls
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
