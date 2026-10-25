"use client";

import { useState } from "react";

// "Email this document" form: recipient + optional message. The server
// attaches the file (or sends a 7-day private link when it's too large).
export function EmailFileDialog({
  fileId,
  filename,
  onClose,
  sendUrl,
  sendBody,
  documentsOption = false,
}: {
  /** An uploaded document to send. */
  fileId?: string;
  filename: string;
  onClose: () => void;
  /** Or a different endpoint (e.g. a form's app-made PDF) plus its body. */
  sendUrl?: string;
  sendBody?: Record<string, unknown>;
  /** Offer "Also attach the uploaded documents" (a form's PDF + its scans). */
  documentsOption?: boolean;
}) {
  const [toEmail, setToEmail] = useState("");
  const [message, setMessage] = useState("");
  const [withDocs, setWithDocs] = useState(true);
  const [state, setState] = useState<
    { kind: "idle" } | { kind: "sending" } | { kind: "sent"; asLink: boolean } | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: "sending" });
    try {
      const res = await fetch(sendUrl ?? `/api/files/${encodeURIComponent(fileId ?? "")}/email`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...sendBody, toEmail, message, ...(documentsOption ? { includeDocuments: withDocs } : {}) }),
      });
      const body = (await res.json().catch(() => ({}))) as { sentAs?: string; message?: string };
      if (!res.ok) {
        setState({ kind: "error", message: body.message ?? "Couldn't send the email. Please try again." });
        return;
      }
      setState({ kind: "sent", asLink: body.sentAs === "link" });
    } catch {
      setState({ kind: "error", message: "Network error. Please try again." });
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-file-title"
      className="fixed inset-0 z-[100000] bg-black/50 flex items-center justify-center p-4 text-left"
      onClick={(e) => {
        if (e.target === e.currentTarget && state.kind !== "sending") onClose();
      }}
    >
      <form onSubmit={send} className="w-full max-w-md rounded-2xl bg-white shadow-xl p-5">
        <h2 id="email-file-title" className="font-display text-lg text-tal-plum">
          Share by email
        </h2>
        <p className="text-xs text-tal-plum-soft mt-1 truncate">{filename}</p>

        {state.kind === "sent" ? (
          <>
            <p role="status" className="mt-4 text-sm text-tal-plum">
              Sent to <span className="font-medium">{toEmail}</span>.
              {state.asLink
                ? " The file was too large to attach, so they've been sent a private link that works for 7 days."
                : documentsOption && withDocs
                  ? " The PDF and the uploaded documents are attached (any too large to attach are sent as private links)."
                  : " The document is attached."}
            </p>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={onClose} className="h-10 px-4 rounded-xl bg-black text-white text-sm font-medium">
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <label htmlFor="email-file-to" className="block text-sm text-tal-plum mt-4 mb-1">
              Recipient&apos;s email
            </label>
            <input
              id="email-file-to"
              type="email"
              required
              autoFocus
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full h-11 rounded-xl border border-tal-line px-3 text-sm focus:outline-none focus:ring-2 focus:ring-tal-plum/30"
            />
            <label htmlFor="email-file-msg" className="block text-sm text-tal-plum mt-3 mb-1">
              Message <span className="text-tal-plum-soft">(optional)</span>
            </label>
            <textarea
              id="email-file-msg"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl border border-tal-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tal-plum/30"
            />
            {documentsOption && (
              <label className="mt-3 flex items-center gap-2 text-sm text-tal-plum">
                <input
                  type="checkbox"
                  checked={withDocs}
                  onChange={(e) => setWithDocs(e.target.checked)}
                  className="h-4 w-4 accent-black"
                />
                Also attach the uploaded documents (e.g. the scanned letter)
              </label>
            )}
            <p className="mt-2 text-xs text-tal-plum-soft">
              Sent from The Adulting Life with your name on it. Replies come to your email address.
            </p>
            {state.kind === "error" && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {state.message}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={state.kind === "sending"}
                className="h-10 px-4 rounded-xl border border-tal-line text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={state.kind === "sending"}
                className="h-10 px-4 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-60"
              >
                {state.kind === "sending" ? "Sending…" : "Send"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
