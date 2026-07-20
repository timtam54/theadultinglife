import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { CATEGORY_IDS, CATEGORY_LABELS, type CategoryId } from "@/lib/db/types";
import { contentForCategory, type ContentItem } from "@/content/learning";
import { listProgress } from "@/lib/db/progress";

export const metadata: Metadata = {
  title: "Learn · Articles",
  description: "Every Adulting Life article in one place, grouped by category.",
};

const CATEGORY_TONE: Record<
  CategoryId,
  { chip: string; bar: string }
> = {
  personal: { chip: "bg-violet-100 text-violet-800", bar: "bg-violet-500" },
  health: { chip: "bg-amber-100 text-amber-800", bar: "bg-amber-500" },
  education: { chip: "bg-sky-100 text-sky-800", bar: "bg-sky-500" },
  employment: { chip: "bg-rose-100 text-rose-800", bar: "bg-rose-500" },
  admin: { chip: "bg-emerald-100 text-emerald-800", bar: "bg-emerald-600" },
};

export default async function LearnArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const session = await requireSession();
  const { category: filterParam } = await searchParams;
  const activeCategory: CategoryId | null =
    filterParam && (CATEGORY_IDS as readonly string[]).includes(filterParam)
      ? (filterParam as CategoryId)
      : null;

  const progressRows = await listProgress(session.user.id);
  const readIds = new Set(
    progressRows
      .filter((p) => p.item_type === "content" && p.status === "completed")
      .map((p) => p.item_id)
  );

  const grouped: { category: CategoryId; articles: ContentItem[] }[] = [];
  for (const id of CATEGORY_IDS) {
    if (activeCategory && id !== activeCategory) continue;
    const articles = contentForCategory(id);
    if (articles.length === 0) continue;
    grouped.push({ category: id, articles });
  }

  const totalArticles = grouped.reduce((a, g) => a + g.articles.length, 0);
  const totalRead = grouped.reduce(
    (a, g) => a + g.articles.filter((art) => readIds.has(art.id)).length,
    0
  );

  return (
    <div>
      <div className="flex items-center gap-2 text-sm mb-3 flex-wrap">
        <Link
          href="/learn"
          className="text-tal-plum-soft hover:text-tal-plum transition-colors"
        >
          Learn
        </Link>
        <span className="text-tal-plum-soft/50" aria-hidden>/</span>
        <span className="text-tal-plum-soft">Articles</span>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-tal-plum to-tal-plum-dark text-white px-6 py-4 mb-6 shadow-md">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-medium tracking-wider uppercase shrink-0">
            Articles
          </span>
          <h1 className="font-display text-2xl leading-tight">
            Every Adulting Life article
          </h1>
          <span className="text-white/40 mx-1" aria-hidden>·</span>
          <span className="text-sm text-white/80">
            {totalRead} of {totalArticles} read
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <FilterPill href="/learn/articles" active={!activeCategory}>
          All categories
        </FilterPill>
        {CATEGORY_IDS.map((id) => (
          <FilterPill
            key={id}
            href={`/learn/articles?category=${id}`}
            active={activeCategory === id}
          >
            {CATEGORY_LABELS[id]}
          </FilterPill>
        ))}
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-tal-line bg-white p-8 text-center text-tal-plum-soft">
          No articles yet.
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ category, articles }) => {
            const tone = CATEGORY_TONE[category];
            const readInCat = articles.filter((a) => readIds.has(a.id)).length;
            return (
              <section
                key={category}
                className="rounded-2xl border border-tal-line bg-white overflow-hidden"
              >
                <div className="flex items-center gap-3 px-5 py-3 border-b border-tal-line bg-tal-cream-soft/50">
                  <h2 className="font-display text-lg text-tal-plum">
                    {CATEGORY_LABELS[category]}
                  </h2>
                  <span
                    className={
                      "text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-widest " +
                      tone.chip
                    }
                  >
                    {readInCat}/{articles.length}
                  </span>
                  <Link
                    href={`/learn/${category}`}
                    className="ml-auto text-xs text-tal-plum-soft hover:text-tal-plum hover:underline"
                  >
                    Open path →
                  </Link>
                </div>
                <ul className="divide-y divide-tal-line">
                  {articles.map((a) => {
                    const isRead = readIds.has(a.id);
                    return (
                      <li key={a.id}>
                        <Link
                          href={`/learn/${category}/article/${a.id}`}
                          className="group flex items-start gap-3 p-4 hover:bg-tal-cream-soft/40 transition"
                        >
                          <span
                            className={
                              "inline-flex items-center justify-center w-6 h-6 rounded-full shrink-0 mt-0.5 " +
                              (isRead
                                ? "bg-emerald-600 text-white"
                                : "bg-tal-cream-soft text-tal-plum-soft")
                            }
                            aria-hidden
                          >
                            {isRead ? (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <path
                                  d="M5 12l4 4 10-10"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : (
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="8"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                />
                              </svg>
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div
                              className={
                                "font-medium leading-snug " +
                                (isRead
                                  ? "text-tal-plum-soft"
                                  : "text-tal-plum")
                              }
                            >
                              {a.title}
                            </div>
                            {a.summary && (
                              <div className="text-sm text-tal-plum-soft mt-0.5 line-clamp-2">
                                {a.summary}
                              </div>
                            )}
                          </div>
                          <span
                            aria-hidden
                            className="text-tal-plum-soft shrink-0 self-center transition-transform group-hover:translate-x-1"
                          >
                            →
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "inline-flex items-center h-8 px-3 rounded-full text-xs font-medium border transition " +
        (active
          ? "bg-tal-plum text-white border-tal-plum"
          : "bg-white text-tal-plum-soft border-tal-line hover:border-tal-plum hover:text-tal-plum")
      }
    >
      {children}
    </Link>
  );
}
