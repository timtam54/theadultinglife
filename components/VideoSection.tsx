"use client";

import type { VideoRow } from "@/lib/db/types";
import { VideoThumbnail } from "./VideoThumbnail";

export function VideoSection({ videos }: { videos: VideoRow[] }) {
  if (videos.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="font-display text-tal-plum mb-4">Videos</h2>
      <ul className="grid gap-6 sm:grid-cols-2">
        {videos.map((v) => (
          <li key={v.id}>
            <VideoThumbnail video={v} />
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
