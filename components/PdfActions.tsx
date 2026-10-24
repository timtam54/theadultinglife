"use client";

import { useState } from "react";
import { saveFileToDevice } from "@/lib/file-client";
import { filenameFromDisposition } from "@/lib/content-disposition";
import { EmailFileDialog } from "@/components/EmailFileDialog";

// The one [Download PDF] [Share PDF] pair used everywhere in the app (forms,
// each entry, whole lists, the daily planner) so they look and behave the
// same. Download saves the branded PDF (on iPhone / iPad: Save to Files /
// Print). Share emails the same PDF to someone.

const btn =
  "h-9 px-2 sm:px-3 rounded-xl border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft inline-flex items-center gap-1.5 disabled:opacity-60";

export function PdfActions({
  downloadUrl,
  downloadHref,
  shareUrl,
  shareBody,
  shareLabel,
  what = "this",
}: {
  /** Endpoint returning the PDF (fetched and saved). */
  downloadUrl?: string;
  /** Or a printable page to open instead (certificate-style PDFs). */
  downloadHref?: string;
  /** Endpoint that emails the PDF. */
  shareUrl: string;
  shareBody: Record<string, unknown>;
  /** Shown in the share form, e.g. "A PDF of this form". */
  shareLabel: string;
  /** For tooltips, e.g. "this entry". */
  what?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  async function download() {
    if (!downloadUrl) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error();
      const name = filenameFromDisposition(res.headers.get("content-disposition")) ?? "document.pdf";
      await saveFileToDevice(new File([await res.blob()], name, { type: "application/pdf" }));
    } catch {
      setError("Couldn't make the PDF. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const pdfIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <text x="8" y="17" fontSize="6" fontWeight="700" fill="currentColor">PDF</text>
    </svg>
  );

  return (
    <>
      {downloadHref ? (
        <a href={downloadHref} target="_blank" rel="noreferrer" className={btn} title={`Download ${what} as a PDF`}>
          {pdfIcon}
          <span className="hidden sm:inline">Download PDF</span>
        </a>
      ) : (
        <button type="button" onClick={download} disabled={busy} className={btn} title={`Download ${what} as a PDF`}>
          {pdfIcon}
          <span className="hidden sm:inline">{busy ? "Preparing…" : "Download PDF"}</span>
        </button>
      )}
      <button type="button" onClick={() => setShareOpen(true)} className={btn} title={`Email ${what} as a PDF`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="hidden sm:inline">Share PDF</span>
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      )}
      {shareOpen && (
        <EmailFileDialog filename={shareLabel} sendUrl={shareUrl} sendBody={shareBody} onClose={() => setShareOpen(false)} />
      )}
    </>
  );
}

/** Query string for a folder form's branded PDF. */
export function folderPdfUrl(subcategoryId: string, targetUserId?: string, instanceId?: string): string {
  const qs = new URLSearchParams({ subcategoryId });
  if (targetUserId) qs.set("targetUserId", targetUserId);
  if (instanceId) qs.set("instanceId", instanceId);
  return `/api/export/folder-pdf?${qs}`;
}
