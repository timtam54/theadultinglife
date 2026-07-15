import type { VideoSource } from "@/lib/db/types";

// Classifies a user-supplied URL so the article page can render the right
// player. YouTube and Vimeo get iframe embeds; everything else opens in a
// new tab as a plain link.
export function classifyVideoUrl(url: string): {
  source: Exclude<VideoSource, "upload">;
  embedUrl: string | null;
} {
  const clean = url.trim();

  // youtube.com/watch?v=<id>  |  youtu.be/<id>  |  youtube.com/embed/<id>
  const yt = clean.match(
    /(?:youtube\.com\/(?:watch\?[^#]*v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
  );
  if (yt) {
    return {
      source: "youtube",
      embedUrl: `https://www.youtube.com/embed/${yt[1]}`,
    };
  }

  // vimeo.com/<id>  |  player.vimeo.com/video/<id>
  const vm = clean.match(
    /(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/
  );
  if (vm) {
    return {
      source: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${vm[1]}`,
    };
  }

  return { source: "external", embedUrl: null };
}
