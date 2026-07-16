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
      <Link href="/learn" className="text-sm text-tal-plum-soft hover:text-tal-plum">
        ← Learn
      </Link>
      <h1 className="font-display text-3xl text-tal-plum mt-1 mb-6">
        {CATEGORY_LABELS[category]}
      </h1>

      <details open={openArticles} className="mb-4 rounded-2xl border border-tal-line bg-white">
        <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-tal-plum">Articles</h2>
          <span className="text-tal-plum-soft text-sm">{articles.length}</span>
        </summary>
        <div className="px-5 pb-5">
        {articles.length === 0 ? (
          <p className="text-tal-plum-soft">No articles yet.</p>
        ) : (
          <ul className="space-y-2">
            {articles.map((c) => {
              const vCount = videoCounts.get(c.id) ?? 0;
              return (
                <li key={c.id}>
                  <Link
                    href={`/learn/${category}/article/${c.id}`}
                    className="block rounded-xl border border-tal-line bg-white p-4 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{c.title}</div>
                        <div className="text-sm text-tal-plum-soft">
                          {c.summary}
                        </div>
                      </div>
                      {vCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 text-xs px-2 py-1 shrink-0">
                          <svg
                            viewBox="0 0 24 24"
                            className="w-3 h-3"
                            fill="currentColor"
                            aria-hidden
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                          {vCount} video{vCount === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        </div>
      </details>

      <details open={openGuides} className="mb-4 rounded-2xl border border-tal-line bg-white">
        <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-tal-plum">Guides &amp; forms</h2>
          <span className="text-tal-plum-soft text-sm">{guides.length}</span>
        </summary>
        <div className="px-5 pb-5">
        {guides.length === 0 ? (
          <p className="text-tal-plum-soft">No guides yet.</p>
        ) : (
          <ul className="space-y-2">
            {guides.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between rounded-xl border border-tal-line bg-white p-4"
              >
                <div>
                  <div className="font-medium">{g.title}</div>
                  <div className="text-sm text-tal-plum-soft">
                    {g.description}
                  </div>
                </div>
                <a
                  href={g.href}
                  className="text-sm text-tal-plum hover:underline"
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        )}
        </div>
      </details>

      <details open={openQuizzes} className="rounded-2xl border border-tal-line bg-white">
        <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-tal-plum">Quizzes</h2>
          <span className="text-tal-plum-soft text-sm">{quizzes.length}</span>
        </summary>
        <div className="px-5 pb-5">
        {quizzes.length === 0 ? (
          <p className="text-tal-plum-soft">No quizzes yet.</p>
        ) : (
          <ul className="space-y-2">
            {quizzes.map((q) => (
              <li key={q.id}>
                <Link
                  href={`/learn/${category}/quiz/${q.id}`}
                  className="block rounded-xl border border-tal-line bg-white p-4 hover:shadow-sm"
                >
                  <div className="font-medium">{q.title}</div>
                  <div className="text-sm text-tal-plum-soft">
                    {q.description}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        </div>
      </details>
    </div>
  );
}
