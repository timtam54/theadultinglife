"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface FileViewerButtonProps {
  fileId: string;
  filename?: string | null;
  mimeType?: string | null;
  className?: string;
  children?: ReactNode;
}

/**
 * Cross-platform viewer for uploaded files served via /api/files/[id].
 * - Images render via <img>
 * - PDFs render inline via iframe on desktop/iOS; Android PWAs get a
 *   prompt to open externally since inline PDF support is unreliable.
 * - Anything else offers a download / open-in-new-tab fallback.
 */
export function FileViewerButton({
  fileId,
  filename,
  mimeType,
  className,
  children,
}: FileViewerButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/files/${fileId}`);
      if (!res.ok) throw new Error("Couldn't load file.");
      const { url } = (await res.json()) as { url: string };
      setSignedUrl(url);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load file.");
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={loading}
        className={
          className ??
          "text-sm text-tal-plum hover:underline disabled:opacity-60"
        }
      >
        {loading ? "Opening…" : (children ?? "View")}
      </button>
      {error && (
        <span className="ml-2 text-xs text-red-700" role="alert">
          {error}
        </span>
      )}
      {open && signedUrl && (
        <FileViewerModal
          url={signedUrl}
          filename={filename ?? "Document"}
          mimeType={mimeType ?? null}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

interface FileViewerModalProps {
  url: string;
  filename: string;
  mimeType: string | null;
  onClose: () => void;
}

type PdfMode = "loading" | "desktop" | "ios-native" | "android-prompt";

function FileViewerModal({
  url,
  filename,
  mimeType,
  onClose,
}: FileViewerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfMode, setPdfMode] = useState<PdfMode>("loading");
  const [pdfError, setPdfError] = useState<string | null>(null);

  const isImage = mimeType?.startsWith("image/") ?? false;
  const isPdf = mimeType === "application/pdf";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (!isPdf) return;
    let cancelled = false;
    let createdBlobUrl: string | null = null;

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(navigator.userAgent);

    if (isAndroid) {
      setPdfMode("android-prompt");
      return;
    }

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const pdfBlob = new Blob([blob], { type: "application/pdf" });
        createdBlobUrl = URL.createObjectURL(pdfBlob);
        setPdfBlobUrl(createdBlobUrl);
        setPdfMode(isIOS ? "ios-native" : "desktop");
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setPdfError(err.message);
        setPdfMode("android-prompt");
      });

    return () => {
      cancelled = true;
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
    };
  }, [isPdf, url]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const openExternal = useCallback(() => {
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    if (isIOS && isStandalone) {
      window.location.href = url;
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, [url]);

  const downloadFile = useCallback(async () => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, [url, filename]);

  if (!mounted) return null;

  const modal = (
    <div
      className="fixed inset-0 bg-black/90 flex flex-col"
      style={{
        zIndex: 99999,
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      onClick={onClose}
    >
      <div
        className="flex-shrink-0 bg-black text-white px-3 py-2 flex items-center justify-between gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-medium text-sm truncate max-w-[50%]">{filename}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={downloadFile}
            className="p-2 min-w-[40px] min-h-[40px] bg-white/10 rounded-lg hover:bg-white/20 flex items-center justify-center"
            aria-label="Download"
            title="Download"
          >
            <DownloadIcon />
          </button>
          <button
            type="button"
            onClick={openExternal}
            className="p-2 min-w-[40px] min-h-[40px] bg-white/10 rounded-lg hover:bg-white/20 flex items-center justify-center"
            aria-label="Open in new tab"
            title="Open in new tab"
          >
            <ExternalIcon />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 min-w-[40px] min-h-[40px] bg-white/10 rounded-lg hover:bg-white/20 flex items-center justify-center"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-auto bg-neutral-900 flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isImage && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={url}
            alt={filename}
            className="max-w-full max-h-full object-contain"
          />
        )}

        {isPdf && pdfMode === "loading" && !pdfError && (
          <div className="text-white/80 text-sm">Loading PDF…</div>
        )}

        {isPdf && pdfError && pdfMode !== "android-prompt" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md text-red-700 text-sm">
            {pdfError}
          </div>
        )}

        {isPdf && pdfMode === "desktop" && pdfBlobUrl && (
          <iframe
            src={pdfBlobUrl}
            className="w-full h-full border-0 bg-white"
            title={filename}
          />
        )}

        {isPdf && pdfMode === "ios-native" && pdfBlobUrl && (
          <object
            data={pdfBlobUrl}
            type="application/pdf"
            className="w-full h-full"
          >
            <ExternalPrompt onOpen={openExternal} />
          </object>
        )}

        {isPdf && pdfMode === "android-prompt" && (
          <ExternalPrompt onOpen={openExternal} />
        )}

        {!isImage && !isPdf && <ExternalPrompt onOpen={openExternal} />}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

function ExternalPrompt({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full">
        <h3 className="text-lg font-semibold text-tal-plum mb-2">
          Preview isn&apos;t available here
        </h3>
        <p className="text-sm text-tal-plum-soft mb-5">
          Tap below to open this document in your browser or a native viewer.
        </p>
        <button
          type="button"
          onClick={onOpen}
          className="w-full py-3 px-4 bg-black text-white rounded-xl font-medium hover:opacity-90 flex items-center justify-center gap-2"
        >
          <ExternalIcon />
          Open Document
        </button>
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 3h7v7M10 14L21 3M21 14v6a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
