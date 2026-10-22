"use client";

import { useState } from "react";
import { downloadFileById } from "@/lib/file-client";

// "Download" for an uploaded document. Saves the file rather than opening
// it in a new tab (which, in the installed app on an iPad, left people
// stranded in Safari). On iPhone/iPad it opens Save to Files / Print.
export function FileDownloadLink({
  fileId,
  filename,
  children,
}: {
  fileId: string;
  filename?: string;
  children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      await downloadFileById(fileId, filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't download the file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-tal-line bg-white text-xs font-medium text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
      >
        {busy ? "Downloading…" : children}
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      )}
    </>
  );
}
