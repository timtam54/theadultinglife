"use client";

import { useEffect, useState } from "react";

interface Props {
  fileId: string;
  mime: string | null;
  filename: string | null;
}

export function ScanSourcePreview({ fileId, mime, filename }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/files/${fileId}`);
        if (!res.ok) throw new Error("fetch_failed");
        const { url } = (await res.json()) as { url: string };
        if (!cancelled) setUrl(url);
      } catch {
        if (!cancelled) setError("Couldn't load preview.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fileId]);

  const isPdf = mime === "application/pdf";
  const isImage = !!mime && mime.startsWith("image/");

  return (
    <div className="rounded-2xl border border-tal-line bg-white overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-tal-line bg-tal-cream-soft">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-tal-plum-soft">
            Source document
          </div>
          <div className="text-sm text-tal-plum truncate">
            {filename ?? "Uploaded document"}
          </div>
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-tal-plum-soft hover:text-tal-plum shrink-0"
          >
            Open ↗
          </a>
        )}
      </div>
      <div className="bg-tal-cream-soft/50 min-h-[280px] flex items-center justify-center">
        {error ? (
          <div className="text-sm text-red-700 p-4">{error}</div>
        ) : !url ? (
          <div className="text-sm text-tal-plum-soft p-4">Loading preview…</div>
        ) : isImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={url}
            alt={filename ?? "Source document"}
            className="max-h-[640px] w-full object-contain"
          />
        ) : isPdf ? (
          <iframe
            src={url}
            title={filename ?? "Source PDF"}
            className="w-full h-[640px] border-0"
          />
        ) : (
          <div className="text-sm text-tal-plum-soft p-4">
            Preview isn&apos;t available for this file type.
          </div>
        )}
      </div>
    </div>
  );
}
