"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VideoRow } from "@/lib/db/types";
import { classifyVideoUrl } from "@/lib/videos/urlSource";

type Props = {
  video: VideoRow;
  className?: string;
};

export function VideoThumbnail({ video, className }: Props) {
  const [open, setOpen] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { source } = video;
  const external = source === "youtube" || source === "vimeo" || source === "external";
  const externalInfo = external ? classifyVideoUrl(video.url ?? "") : null;

  useEffect(() => {
    if (source !== "upload") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/videos/${video.id}/stream`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { url: string };
        if (!cancelled) setStreamUrl(body.url);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "load_failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, video.id]);

  useEffect(() => {
    if (source !== "upload" || !streamUrl) return;
    let cancelled = false;
    const v = document.createElement("video");
    v.crossOrigin = "anonymous";
    v.preload = "metadata";
    v.muted = true;
    v.playsInline = true;
    v.src = streamUrl;

    const cleanup = () => {
      v.removeAttribute("src");
      v.load();
    };

    v.addEventListener("loadedmetadata", () => {
      if (cancelled) return cleanup();
      try {
        v.currentTime = Math.min(1, (v.duration || 2) * 0.1);
      } catch {
        cleanup();
      }
    });
    v.addEventListener("seeked", () => {
      if (cancelled) return cleanup();
      try {
        const canvas = document.createElement("canvas");
        canvas.width = v.videoWidth || 640;
        canvas.height = v.videoHeight || 360;
        const ctx = canvas.getContext("2d");
        if (!ctx) return cleanup();
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL("image/jpeg", 0.75);
        setPosterUrl(data);
      } catch {
        // canvas may throw on tainted frame — fall back to no poster
      } finally {
        cleanup();
      }
    });
    v.addEventListener("error", cleanup);

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [source, streamUrl]);

  const openLightbox = useCallback(() => setOpen(true), []);

  const isAudio = video.content_type?.startsWith("audio/");
  const canPlayInLightbox =
    (source === "upload" && !!streamUrl) || (external && !!externalInfo?.embedUrl);

  return (
    <>
      <button
        type="button"
        onClick={canPlayInLightbox ? openLightbox : undefined}
        disabled={!canPlayInLightbox}
        className={
          "group relative block w-full aspect-video overflow-hidden rounded-xl border border-tal-line bg-black " +
          (canPlayInLightbox ? "cursor-pointer" : "cursor-default opacity-80 ") +
          (className ?? "")
        }
        aria-label={`Play ${video.title}`}
      >
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : source === "youtube" && externalInfo?.embedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={youtubeThumbUrl(video.url ?? "")}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-tal-plum to-black">
            <span className="text-white/50 text-xs uppercase tracking-widest">
              {isAudio ? "Audio" : "Video"}
            </span>
          </div>
        )}

        {canPlayInLightbox && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-600/90 shadow-lg transition-transform group-hover:scale-110">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 text-white ml-0.5"
                fill="currentColor"
                aria-hidden
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {loadError && (
          <div className="absolute bottom-2 left-2 right-2 rounded-md bg-red-600/90 text-white text-xs px-2 py-1">
            Couldn&apos;t load ({loadError})
          </div>
        )}
      </button>

      {open && canPlayInLightbox && (
        <Lightbox
          onClose={() => setOpen(false)}
          title={video.title}
        >
          {source === "upload" && streamUrl ? (
            isAudio ? (
              <audio autoPlay controls src={streamUrl} className="w-full" />
            ) : (
              <video
                autoPlay
                controls
                src={streamUrl}
                className="w-full h-full max-h-[85vh] bg-black"
              />
            )
          ) : externalInfo?.embedUrl ? (
            <iframe
              src={`${externalInfo.embedUrl}${externalInfo.embedUrl.includes("?") ? "&" : "?"}autoplay=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full aspect-video bg-black"
            />
          ) : null}
        </Lightbox>
      )}
    </>
  );
}

function youtubeThumbUrl(url: string): string {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?[^#]*v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
  );
  return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : "";
}

function Lightbox({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 sm:p-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-6xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/80 hover:text-white text-sm flex items-center gap-2"
          aria-label="Close"
        >
          Close <span aria-hidden>✕</span>
        </button>
        <div className="rounded-xl overflow-hidden shadow-2xl bg-black">
          {children}
        </div>
        <div className="mt-3 text-white/90 text-sm">{title}</div>
      </div>
    </div>
  );
}
