"use client";

import { useState } from "react";

// Settings → "Download your organiser". Builds the complete download (PDF +
// Excel + documents, zipped) and starts it; the link is also emailed.

type State =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "done"; url: string; documents: number; sizeBytes: number }
  | { kind: "error"; message: string };

function size(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CompleteExportButton() {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function start() {
    setState({ kind: "working" });
    try {
      const res = await fetch("/api/export/complete", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as {
        url?: string;
        documents?: number;
        sizeBytes?: number;
        message?: string;
      };
      if (!res.ok || !body.url) {
        setState({ kind: "error", message: body.message ?? "Something went wrong. Please try again." });
        return;
      }
      setState({ kind: "done", url: body.url, documents: body.documents ?? 0, sizeBytes: body.sizeBytes ?? 0 });
      window.location.href = body.url;
    } catch {
      setState({ kind: "error", message: "Network error. Please try again." });
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={state.kind === "working"}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-black text-white text-sm font-medium disabled:opacity-60"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 4v12m0 0-4-4m4 4 4-4M4 20h16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {state.kind === "working" ? "Preparing your download…" : "Download complete organiser"}
      </button>
      {state.kind === "working" && (
        <p role="status" className="mt-3 text-sm text-tal-plum-soft">
          This can take a minute or two if you have lots of documents. We&apos;ll
          also email you the link, so it&apos;s fine to leave this page.
        </p>
      )}
      {state.kind === "done" && (
        <p role="status" className="mt-3 text-sm text-tal-plum">
          Your download has started ({size(state.sizeBytes)}, {state.documents}{" "}
          {state.documents === 1 ? "document" : "documents"}). If it didn&apos;t,{" "}
          <a href={state.url} className="underline">
            download it here
          </a>
          . We&apos;ve also emailed you the link — it works for 24 hours.
        </p>
      )}
      {state.kind === "error" && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {state.message}
        </p>
      )}
    </div>
  );
}
