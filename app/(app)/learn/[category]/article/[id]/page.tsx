import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isCategoryId } from "@/lib/services/records";
import { CATEGORY_LABELS, type CategoryId } from "@/lib/db/types";
import { contentForCategory, findContent } from "@/content/learning";
import { MarkContentRead } from "@/components/MarkContentRead";
import { listVideosForArticle } from "@/lib/db/videos";
import { listQuizzesForCategory } from "@/lib/db/quizzes";
import { VideoSection } from "@/components/VideoSection";
import { subcategoryThumbnail, categoryThumbnail } from "@/lib/thumbnails";

const CATEGORY_ACCENT: Record<
  CategoryId,
  { bar: string; ring: string; pill: string; iconBg: string; text: string }
> = {
  personal: {
    bar: "bg-violet-500",
    ring: "ring-violet-400/40",
    pill: "bg-violet-100 text-violet-800",
    iconBg: "bg-white/20",
    text: "text-violet-700",
  },
  health: {
    bar: "bg-amber-500",
    ring: "ring-amber-400/40",
    pill: "bg-amber-100 text-amber-800",
    iconBg: "bg-white/20",
    text: "text-amber-700",
  },
  education: {
    bar: "bg-sky-500",
    ring: "ring-sky-400/40",
    pill: "bg-sky-100 text-sky-800",
    iconBg: "bg-white/20",
    text: "text-sky-700",
  },
  employment: {
    bar: "bg-rose-500",
    ring: "ring-rose-400/40",
    pill: "bg-rose-100 text-rose-800",
    iconBg: "bg-white/20",
    text: "text-rose-700",
  },
  admin: {
    bar: "bg-emerald-600",
    ring: "ring-emerald-400/40",
    pill: "bg-emerald-100 text-emerald-800",
    iconBg: "bg-white/20",
    text: "text-emerald-700",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}): Promise<Metadata> {
  const { category, id } = await params;
  if (!isCategoryId(category)) return {};
  const article = findContent(id);
  if (!article || article.categoryId !== category) return {};
  return { title: article.title, description: article.summary };
}

// Article bodies were extracted from PDFs with hard line-wraps at ~80 chars.
// We want soft-wrap behaviour: blank lines mean paragraph breaks; single
// newlines inside a paragraph are just wrap artefacts and should collapse
// to a space.
function renderArticleBody(body: string): React.ReactNode {
  const paragraphs = body
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n+/g, " ").replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0);
  return paragraphs.map((p, i) => <p key={i}>{p}</p>);
}

function estimateReadTime(body: string): number {
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}) {
  const { category, id } = await params;
  if (!isCategoryId(category)) notFound();
  const article = findContent(id);
  if (!article || article.categoryId !== category) notFound();

  const [videos, categoryQuizzes] = await Promise.all([
    listVideosForArticle(article.id),
    listQuizzesForCategory(category),
  ]);

  const allArticles = contentForCategory(category);
  const currentIndex = allArticles.findIndex((a) => a.id === article.id);
  const prevArticle = currentIndex > 0 ? allArticles[currentIndex - 1] : null;
  const nextArticle =
    currentIndex >= 0 && currentIndex < allArticles.length - 1
      ? allArticles[currentIndex + 1]
      : null;
  // Quizzes for this article: every quiz explicitly linked to it, in the
  // order they were created. Falls back to subcategory match if none exist.
  const articleQuizzes = categoryQuizzes.filter(
    (q) => q.source_article_id === article.id
  );
  const relatedQuizzes =
    articleQuizzes.length > 0
      ? articleQuizzes
      : article.subcategoryId
        ? categoryQuizzes.filter(
            (q) => q.subcategory_id === article.subcategoryId
          )
        : [];
  const readMinutes = estimateReadTime(article.body);
  const accent = CATEGORY_ACCENT[category];

  return (
    <article>
      <div className="flex items-center gap-2 text-sm mb-3 flex-wrap">
        <Link
          href="/learn"
          className="text-tal-plum-soft hover:text-tal-plum transition-colors"
        >
          Learn
        </Link>
        <span className="text-tal-plum-soft/50" aria-hidden>/</span>
        <Link
          href={`/learn/${category}`}
          className="text-tal-plum-soft hover:text-tal-plum transition-colors"
        >
          {CATEGORY_LABELS[category]}
        </Link>
      </div>

      <div className="rounded-2xl bg-black text-white px-6 py-4 mb-6 shadow-md">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              article.subcategoryId
                ? subcategoryThumbnail(article.subcategoryId, category)
                : categoryThumbnail(category)
            }
            alt=""
            width={72}
            height={72}
            className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover ring-2 ring-white/20 bg-white"
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl leading-tight truncate">
              {article.title}
            </h1>
            <p className="text-white/70 text-sm mt-1 truncate">
              {article.summary}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 min-w-0 space-y-6">
          {videos.length > 0 && (
            <section className="rounded-2xl border border-tal-line bg-white p-4">
              <VideoSection videos={videos} />
            </section>
          )}

          <section className="rounded-2xl border border-tal-line bg-white p-6 sm:p-8 shadow-sm">
            <div className="prose prose-neutral max-w-none prose-headings:font-display prose-headings:text-tal-plum prose-p:text-tal-plum prose-p:leading-relaxed prose-a:text-tal-plum prose-a:underline-offset-4 prose-strong:text-tal-plum">
              {renderArticleBody(article.body)}
            </div>
          </section>

          <section className="rounded-2xl border border-tal-line bg-gradient-to-br from-white to-tal-cream-soft p-6">
            <div className="flex items-start gap-4 flex-wrap">
              <span
                className={
                  "inline-flex items-center justify-center w-12 h-12 rounded-xl shrink-0 " +
                  accent.pill
                }
                aria-hidden
              >
                <TickIcon />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-lg text-tal-plum">
                  Nice one — you&apos;ve finished this article.
                </div>
                <p className="text-sm text-tal-plum-soft mt-0.5">
                  {relatedQuizzes.length > 0
                    ? "Test your knowledge with a quick quiz, or move on to the next article."
                    : "Ready for the next one?"}
                </p>
              </div>
            </div>
            {relatedQuizzes.length > 0 && (
              <ul className="mt-4 grid gap-2 sm:grid-cols-3">
                {relatedQuizzes.slice(0, 3).map((q, i) => (
                  <li key={q.id}>
                    <Link
                      href={`/learn/${category}/quiz/${q.id}`}
                      className="group flex flex-col h-full rounded-xl border border-tal-line bg-white p-3 hover:shadow-md hover:-translate-y-0.5 transition"
                    >
                      <div className="text-[10px] uppercase tracking-widest text-tal-plum-soft mb-1">
                        Quiz {i + 1}
                      </div>
                      <div className="font-medium text-tal-plum text-sm leading-snug line-clamp-2 flex-1">
                        {q.title}
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-tal-plum">
                        Take it{" "}
                        <span
                          aria-hidden
                          className="transition-transform group-hover:translate-x-1"
                        >
                          →
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <nav className="grid gap-3 sm:grid-cols-2">
            {prevArticle ? (
              <Link
                href={`/learn/${category}/article/${prevArticle.id}`}
                className="group rounded-2xl border border-tal-line bg-white p-4 hover:shadow-md hover:-translate-y-0.5 transition"
              >
                <div className="text-[10px] uppercase tracking-widest text-tal-plum-soft mb-1">
                  ← Previous
                </div>
                <div className="font-medium text-tal-plum leading-snug">
                  {prevArticle.title}
                </div>
              </Link>
            ) : (
              <div />
            )}
            {nextArticle ? (
              <Link
                href={`/learn/${category}/article/${nextArticle.id}`}
                className="group rounded-2xl border border-tal-line bg-white p-4 hover:shadow-md hover:-translate-y-0.5 transition text-right"
              >
                <div className="text-[10px] uppercase tracking-widest text-tal-plum-soft mb-1">
                  Next →
                </div>
                <div className="font-medium text-tal-plum leading-snug">
                  {nextArticle.title}
                </div>
              </Link>
            ) : (
              <Link
                href={`/learn/${category}`}
                className="group rounded-2xl border border-tal-line bg-white p-4 hover:shadow-md hover:-translate-y-0.5 transition text-right"
              >
                <div className="text-[10px] uppercase tracking-widest text-tal-plum-soft mb-1">
                  Back to
                </div>
                <div className="font-medium text-tal-plum leading-snug">
                  All {CATEGORY_LABELS[category]} articles
                </div>
              </Link>
            )}
          </nav>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl bg-black text-white p-5 shadow-md sticky top-4">
            <div className="text-[10px] uppercase tracking-widest text-white/60 mb-2">
              More in {CATEGORY_LABELS[category]}
            </div>
            <ul className="space-y-2">
              {allArticles.slice(0, 6).map((a) => {
                const isCurrent = a.id === article.id;
                return (
                  <li key={a.id}>
                    <Link
                      href={`/learn/${category}/article/${a.id}`}
                      className={
                        "block rounded-lg px-3 py-2 text-sm transition " +
                        (isCurrent
                          ? "bg-white/10 text-white font-medium"
                          : "text-white/80 hover:bg-white/10 hover:text-white")
                      }
                    >
                      {a.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link
              href={`/learn/${category}`}
              className="inline-flex items-center gap-1 mt-3 text-xs text-white/70 hover:text-white transition-colors"
            >
              View all →
            </Link>
          </section>
        </aside>
      </div>

      <MarkContentRead itemId={article.id} />
    </article>
  );
}

function CategoryIcon({ id }: { id: CategoryId }) {
  switch (id) {
    case "personal":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function PlayIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function TickIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
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
