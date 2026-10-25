"use client";

import { useState } from "react";
import { FileViewerButton } from "@/components/FileViewerButton";
import { FileDownloadLink } from "@/components/FileDownloadLink";
import { FilePrintButton } from "@/components/FilePrintButton";
import { EmailFileDialog } from "@/components/EmailFileDialog";

// View / Download / Print / Share (by email) buttons for an uploaded document. Visible
// buttons (not hover-only links) so they're obvious on an iPad.

export const fileActionBtn =
  "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-tal-line bg-white text-xs font-medium text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60";

export function FileActions({
  fileId,
  filename,
  mimeType,
  showView = true,
}: {
  fileId: string;
  filename: string;
  mimeType: string | null;
  /** False where the row already has its own View button. */
  showView?: boolean;
}) {
  const [emailOpen, setEmailOpen] = useState(false);
  return (
    <>
      {showView && (
        <FileViewerButton
          fileId={fileId}
          filename={filename}
          mimeType={mimeType}
          title="View the document"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-black text-white text-xs font-medium disabled:opacity-60"
        >
          View
        </FileViewerButton>
      )}
      <FileDownloadLink fileId={fileId} filename={filename}>
        Download
      </FileDownloadLink>
      <FilePrintButton fileId={fileId} filename={filename} />
      <button type="button" onClick={() => setEmailOpen(true)} className={fileActionBtn} title="Share this document by email">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Share
      </button>
      {emailOpen && <EmailFileDialog fileId={fileId} filename={filename} onClose={() => setEmailOpen(false)} />}
    </>
  );
}
