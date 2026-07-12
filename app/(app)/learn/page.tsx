import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORY_IDS, CATEGORY_LABELS } from "@/lib/db/types";
import { contentForCategory, guidesForCategory } from "@/content/learning";
import { listQuizzesForCategory } from "@/lib/db/quizzes";

export const metadata: Metadata = {
  title: "Learn",
  description: "Bite-sized guides, downloadable forms and quick quizzes across every life-admin area.",
};

export default async function LearnIndex() {
  const quizCounts = await Promise.all(
    CATEGORY_IDS.map((id) => listQuizzesForCategory(id).then((qs) => qs.length))
  );
  return (
    <div>
      <h1 className="font-display text-3xl text-tal-plum mb-2">Learn</h1>
      <p className="text-tal-plum-soft mb-6">
        Bite-sized guides, downloadable forms and quick quizzes for every area.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORY_IDS.map((id, i) => {
          const content = contentForCategory(id).length;
          const guides = guidesForCategory(id).length;
          const quizzes = quizCounts[i];
          return (
            <Link
              key={id}
              href={`/learn/${id}`}
              className="block rounded-2xl border border-tal-line bg-white p-6 hover:shadow-md transition"
            >
              <h2 className="font-display text-xl text-tal-plum mb-2">
                {CATEGORY_LABELS[id]}
              </h2>
              <p className="text-sm text-tal-plum-soft">
                {content} articles · {guides} guides · {quizzes} quizzes
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
