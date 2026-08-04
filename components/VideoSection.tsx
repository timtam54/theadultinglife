"use client";

import type { VideoRow } from "@/lib/db/types";
import { VideoThumbnail } from "./VideoThumbnail";
import { WatchedLegend } from "./WatchedLegend";

export function VideoSection({
  videos,
  watchedIds = [],
}: {
  videos: VideoRow[];
  watchedIds?: string[];
}) {
  if (videos.length === 0) return null;
  const watchedSet = new Set(watchedIds);
  return (
    <section className="mt-10">
      <h2 className="font-display text-tal-plum mb-3">Videos</h2>
      <WatchedLegend className="mb-4" />
      <ul className="grid gap-6 sm:grid-cols-2">
        {videos.map((v) => (
          <li key={v.id}>
            <VideoThumbnail video={v} initialWatched={watchedSet.has(v.id)} />
            <div className="mt-2 font-medium text-tal-plum">{v.title}</div>
            {v.description && (
              <div className="text-sm text-tal-plum-soft mt-0.5">
                {v.description}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
