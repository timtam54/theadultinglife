import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORY_IDS, CATEGORY_LABELS } from "@/lib/db/types";
import { contentForCategory, guidesForCategory } from "@/content/learning";
import { listQuizzesForCategory } from "@/lib/db/quizzes";
import { videoCountsByArticle } from "@/lib/db/videos";

export const metadata: Metadata = {
  title: "Learn",
  description: "Bite-sized guides, downloadable forms and quick quizzes across every life-admin area.",
};

export default async function LearnIndex() {
  const [quizCounts, videoCounts] = await Promise.all([
    Promise.all(
      CATEGORY_IDS.map((id) => listQuizzesForCategory(id).then((qs) => qs.length))
    ),
    videoCountsByArticle(),
  ]);

  const videoCountByCategory = new Map<string, number>();
  let totalVideos = 0;
  for (const id of CATEGORY_IDS) {
    const n = contentForCategory(id).reduce(
      (acc, a) => acc + (videoCounts.get(a.id) ?? 0),
      0
    );
    videoCountByCategory.set(id, n);
    totalVideos += n;
  }

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
          const videos = videoCountByCategory.get(id) ?? 0;
          return (
            <div
              key={id}
              className="group rounded-2xl border border-tal-line bg-white p-6 hover:bg-tal-cream-soft hover:border-tal-cream hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
            >
              <Link href={`/learn/${id}`} className="block">
                <h2 className="font-display text-xl text-tal-plum mb-2">
                  {CATEGORY_LABELS[id]}
                </h2>
              </Link>
              <p className="text-sm text-tal-plum-soft flex flex-wrap gap-x-2 gap-y-1">
                <Link
                  href={`/learn/${id}?expand=articles`}
                  className="hover:text-tal-plum hover:underline"
                >
                  {content} article{content === 1 ? "" : "s"}
                </Link>
                <span aria-hidden>·</span>
                <Link
                  href={`/learn/${id}?expand=guides`}
                  className="hover:text-tal-plum hover:underline"
                >
                  {guides} guide{guides === 1 ? "" : "s"}
                </Link>
                <span aria-hidden>·</span>
                <Link
                  href={`/learn/${id}?expand=quizzes`}
                  className="hover:text-tal-plum hover:underline"
                >
                  {quizzes} quiz{quizzes === 1 ? "" : "zes"}
                </Link>
                {videos > 0 && (
                  <>
                    <span aria-hidden>·</span>
                    <Link
                      href="/learn/videos"
                      className="hover:text-tal-plum hover:underline"
                    >
                      {videos} video{videos === 1 ? "" : "s"}
                    </Link>
                  </>
                )}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <Link
          href="/learn/videos"
          className="block rounded-2xl border border-tal-line bg-gradient-to-br from-tal-plum to-tal-plum-dark text-white p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-600 shrink-0">
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6 text-white ml-0.5"
                fill="currentColor"
                aria-hidden
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-xl mb-1">Videos</h2>
              <p className="text-sm text-white/80">
                {totalVideos === 0
                  ? "Video library — coming soon."
                  : `${totalVideos} video${totalVideos === 1 ? "" : "s"} across all categories.`}
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
