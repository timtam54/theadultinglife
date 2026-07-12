import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isCategoryId } from "@/lib/services/records";
import { CATEGORY_LABELS } from "@/lib/db/types";
import { contentForCategory, guidesForCategory } from "@/content/learning";
import { listQuizzesForCategory } from "@/lib/db/quizzes";

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
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!isCategoryId(category)) notFound();

  const articles = contentForCategory(category);
  const guides = guidesForCategory(category);
  const quizzes = await listQuizzesForCategory(category);

  return (
    <div>
      <Link href="/learn" className="text-sm text-tal-plum-soft hover:text-tal-plum">
        ← Learn
      </Link>
      <h1 className="font-display text-3xl text-tal-plum mt-1 mb-6">
        {CATEGORY_LABELS[category]}
      </h1>

      <section className="mb-8">
        <h2 className="font-display text-xl text-tal-plum mb-3">Articles</h2>
        {articles.length === 0 ? (
          <p className="text-tal-plum-soft">No articles yet.</p>
        ) : (
          <ul className="space-y-2">
            {articles.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/learn/${category}/article/${c.id}`}
                  className="block rounded-xl border border-tal-line bg-white p-4 hover:shadow-sm"
                >
                  <div className="font-medium">{c.title}</div>
                  <div className="text-sm text-tal-plum-soft">{c.summary}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="font-display text-xl text-tal-plum mb-3">Guides &amp; forms</h2>
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
      </section>

      <section>
        <h2 className="font-display text-xl text-tal-plum mb-3">Quizzes</h2>
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
      </section>
    </div>
  );
}
