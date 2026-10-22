"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { EmailFileDialog } from "@/components/EmailFileDialog";
import { PdfPagesView } from "@/components/PdfPagesView";
import { fetchAsFile, isTouchDevice, saveFileToDevice } from "@/lib/file-client";

interface FileViewerButtonProps {
  fileId: string;
  filename?: string | null;
  mimeType?: string | null;
  className?: string;
  title?: string;
  children?: ReactNode;
}

/**
 * Cross-platform viewer for uploaded files served via /api/files/[id].
 * - Images render via <img>
 * - PDFs render in the browser's own viewer on computers, and page by page
 *   (PDF.js) on iPads and phones, where embedded PDFs show only the first
 *   page or nothing.
 * - Download and Email sit in the top bar on every device.
 */
export function FileViewerButton({
  fileId,
  filename,
  mimeType,
  className,
  title,
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
        title={title ?? filename ?? undefined}
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
          fileId={fileId}
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
  fileId: string;
  url: string;
  filename: string;
  mimeType: string | null;
  onClose: () => void;
}

type PdfMode = "loading" | "desktop" | "pages" | "error";

function FileViewerModal({
  fileId,
  url,
  filename,
  mimeType,
  onClose,
}: FileViewerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfMode, setPdfMode] = useState<PdfMode>("loading");
  // The viewer only opens after a tap, so the browser is always available.
  const [touch] = useState(() => isTouchDevice());
  const [emailOpen, setEmailOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isImage = mimeType?.startsWith("image/") ?? false;
  const isPdf = mimeType === "application/pdf";

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // PDFs: the browser's own viewer on computers; drawn page by page on
  // iPads and phones, where embedded PDFs show only page 1 or nothing.
  useEffect(() => {
    if (!isPdf) return;
    let cancelled = false;
    let createdBlobUrl: string | null = null;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const typed = new Blob([blob], { type: "application/pdf" });
        setPdfBlob(typed);
        if (isTouchDevice()) {
          setPdfMode("pages");
        } else {
          createdBlobUrl = URL.createObjectURL(typed);
          setPdfBlobUrl(createdBlobUrl);
          setPdfMode("desktop");
        }
      })
      .catch(() => {
        if (!cancelled) setPdfMode("error");
      });
    return () => {
      cancelled = true;
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
    };
  }, [isPdf, url]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !emailOpen) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, emailOpen]);

  // Computers only — on an iPad a new tab leaves the installed app.
  const openExternal = useCallback(() => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, [url]);

  const downloadFile = useCallback(async () => {
    setDownloading(true);
    setActionError(null);
    try {
      await saveFileToDevice(await fetchAsFile(url, filename, mimeType));
    } catch {
      setActionError("Couldn't download the file.");
    } finally {
      setDownloading(false);
    }
  }, [url, filename, mimeType]);

  if (!mounted) return null;

  const barBtn =
    "h-10 px-3 bg-white/10 rounded-lg hover:bg-white/20 inline-flex items-center justify-center gap-1.5 text-sm disabled:opacity-60";

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
        <h2 className="font-medium text-sm truncate min-w-0">{filename}</h2>
        <div className="flex items-center gap-1.5 shrink-0">
          {actionError && <span className="text-xs text-red-300 mr-1">{actionError}</span>}
          <button type="button" onClick={downloadFile} disabled={downloading} className={barBtn} title="Download">
            <DownloadIcon />
            <span className="hidden sm:inline">{downloading ? "Downloading…" : "Download"}</span>
          </button>
          <button type="button" onClick={() => setEmailOpen(true)} className={barBtn} title="Share this document by email">
            <MailIcon />
            <span className="hidden sm:inline">Share</span>
          </button>
          {!touch && (
            <button
              type="button"
              onClick={openExternal}
              className="p-2 min-w-[40px] min-h-[40px] bg-white/10 rounded-lg hover:bg-white/20 flex items-center justify-center"
              aria-label="Open in new tab"
              title="Open in new tab"
            >
              <ExternalIcon />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={barBtn}
            aria-label="Close"
            title="Close"
          >
            <CloseIcon />
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>
      </div>

      <div
        className="flex-1 min-h-0 overflow-auto bg-neutral-900 flex items-center justify-center"
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

        {isPdf && pdfMode === "loading" && (
          <div className="text-white/80 text-sm">Loading PDF…</div>
        )}

        {isPdf && pdfMode === "desktop" && pdfBlobUrl && (
          <iframe
            src={pdfBlobUrl}
            className="w-full h-full border-0 bg-white"
            title={filename}
          />
        )}

        {isPdf && pdfMode === "pages" && pdfBlob && <PdfPagesView data={pdfBlob} />}

        {isPdf && pdfMode === "error" && (
          <div className="bg-white rounded-xl p-5 max-w-sm text-sm text-tal-plum text-center">
            This document couldn&apos;t be shown here. Use Download to open it on your device.
          </div>
        )}

        {!isImage && !isPdf &&
          (touch ? (
            <div className="bg-white rounded-xl p-5 max-w-sm text-sm text-tal-plum text-center">
              This type of file can&apos;t be previewed. Use Download to open it on your device.
            </div>
          ) : (
            <ExternalPrompt onOpen={openExternal} />
          ))}
      </div>
      {emailOpen && (
        <div onClick={(e) => e.stopPropagation()}>
          <EmailFileDialog fileId={fileId} filename={filename} onClose={() => setEmailOpen(false)} />
        </div>
      )}
    </div>
  );

  return createPortal(modal, document.body);
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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
