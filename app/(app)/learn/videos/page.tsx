import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORY_IDS, CATEGORY_LABELS, type CategoryId } from "@/lib/db/types";
import { contentForCategory } from "@/content/learning";
import { listAllVideos } from "@/lib/db/videos";
import { VideoThumbnail } from "@/components/VideoThumbnail";
import type { VideoRow } from "@/lib/db/types";

export const metadata: Metadata = {
  title: "Learn · Videos",
  description: "Watch every video across every Adulting Life topic in one place.",
};

export default async function LearnVideosPage() {
  const videos = await listAllVideos();

  const articleToCategory = new Map<string, CategoryId>();
  const articleToTitle = new Map<string, string>();
  for (const id of CATEGORY_IDS) {
    for (const a of contentForCategory(id)) {
      articleToCategory.set(a.id, id);
      articleToTitle.set(a.id, a.title);
    }
  }

  const grouped = new Map<CategoryId, VideoRow[]>();
  for (const v of videos) {
    const cat = articleToCategory.get(v.article_id);
    if (!cat) continue;
    const arr = grouped.get(cat) ?? [];
    arr.push(v);
    grouped.set(cat, arr);
  }

  return (
    <div>
      <Link href="/learn" className="text-sm text-tal-plum-soft hover:text-tal-plum">
        ← Learn
      </Link>
      <h1 className="font-display text-3xl text-tal-plum mt-1 mb-2">Videos</h1>
      <p className="text-tal-plum-soft mb-6">
        Every video across every category. Click a thumbnail to watch.
      </p>

      {videos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-tal-line bg-white p-8 text-center text-tal-plum-soft">
          No videos yet — check back soon.
        </div>
      ) : (
        <div className="space-y-10">
          {CATEGORY_IDS.map((cat) => {
            const rows = grouped.get(cat);
            if (!rows || rows.length === 0) return null;
            return (
              <section key={cat}>
                <h2 className="font-display text-xl text-tal-plum mb-3">
                  {CATEGORY_LABELS[cat]}
                </h2>
                <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {rows.map((v) => (
                    <li key={v.id}>
                      <VideoThumbnail video={v} />
                      <div className="mt-2 font-medium text-tal-plum">
                        {v.title}
                      </div>
                      {v.description && (
                        <div className="text-sm text-tal-plum-soft mt-0.5">
                          {v.description}
                        </div>
                      )}
                      <Link
                        href={`/learn/${cat}/article/${v.article_id}`}
                        className="mt-1 inline-block text-xs text-tal-plum-soft hover:text-tal-plum underline"
                      >
                        {articleToTitle.get(v.article_id) ?? "Open article"} ↗
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
