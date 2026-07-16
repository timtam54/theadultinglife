import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORY_IDS, CATEGORY_LABELS } from "@/lib/db/types";
import { listQuizzesForCategory } from "@/lib/db/quizzes";

export const metadata: Metadata = {
  title: "Learn · Quizzes",
  description: "Quick quizzes across every life-admin area.",
};

export default async function LearnQuizzesPage() {
  const perCategory = await Promise.all(
    CATEGORY_IDS.map((id) =>
      listQuizzesForCategory(id).then((qs) => ({ id, quizzes: qs }))
    )
  );
  const totalQuizzes = perCategory.reduce((a, c) => a + c.quizzes.length, 0);

  return (
    <div>
      <Link href="/learn" className="text-sm text-tal-plum-soft hover:text-tal-plum">
        ← Learn
      </Link>
      <h1 className="font-display text-3xl text-tal-plum mt-1 mb-2">Quizzes</h1>
      <p className="text-tal-plum-soft mb-6">
        {totalQuizzes === 0
          ? "No quizzes yet."
          : `${totalQuizzes} quiz${totalQuizzes === 1 ? "" : "zes"} across ${
              perCategory.filter((c) => c.quizzes.length > 0).length
            } areas.`}
      </p>

      {perCategory
        .filter((c) => c.quizzes.length > 0)
        .map((c) => (
          <section key={c.id} className="mb-8">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-display text-xl text-tal-plum">
                {CATEGORY_LABELS[c.id]}
              </h2>
              <Link
                href={`/learn/${c.id}?expand=quizzes`}
                className="text-sm text-tal-plum-soft hover:text-tal-plum"
              >
                View all →
              </Link>
            </div>
            <ul className="space-y-2">
              {c.quizzes.map((q) => (
                <li key={q.id}>
                  <Link
                    href={`/learn/${c.id}/quiz/${q.id}`}
                    className="block rounded-xl border border-tal-line bg-white p-4 hover:shadow-sm"
                  >
                    <div className="font-medium">{q.title}</div>
                    {q.description ? (
                      <div className="text-sm text-tal-plum-soft">
                        {q.description}
                      </div>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

      {totalQuizzes === 0 && (
        <div className="rounded-2xl border border-dashed border-tal-line bg-white p-8 text-center">
          <p className="text-tal-plum-soft">Quizzes are coming soon.</p>
        </div>
      )}
    </div>
  );
}
