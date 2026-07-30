"use client";

import { useEffect, useRef, useState } from "react";

interface ActiveShare {
  token: string;
  expiresAt: string;
}

// Small "Share securely" flow for the Peace of Mind Planner:
//   • Loads the current active share (if any) when the dialog opens
//   • "Create secure link" (or "Rotate link") upserts a new 7-day token
//   • "Copy" writes the full URL to the clipboard
//   • "Revoke" invalidates the link immediately
export function PlannerShareButton() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [share, setShare] = useState<ActiveShare | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || loaded) return;
    (async () => {
      setError(null);
      try {
        const res = await fetch("/api/planner-share", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { share: ActiveShare | null };
        setShare(body.share);
      } catch {
        setError("Couldn't load your share status. Try again.");
      } finally {
        setLoaded(true);
      }
    })();
  }, [open, loaded]);

  const shareUrl = share
    ? typeof window !== "undefined"
      ? `${window.location.origin}/share/planner/${share.token}`
      : `/share/planner/${share.token}`
    : null;

  async function createShare() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/planner-share", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { share: ActiveShare };
      setShare(body.share);
    } catch {
      setError("Couldn't create the link. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeShare() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/planner-share", { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setShare(null);
    } catch {
      setError("Couldn't revoke the link. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copyUrl() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input text for the user to copy manually.
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Share securely"
        aria-label="Share securely"
        className="h-9 w-9 rounded-lg border border-tal-line bg-white text-tal-plum hover:shadow-sm inline-flex items-center justify-center"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3 4 6v6c0 4.5 3 8 8 9 5-1 8-4.5 8-9V6l-8-3Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M9 11a3 3 0 1 1 6 0v1H9v-1Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <rect x="8" y="12" width="8" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Share Peace of Mind Planner"
          className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-tal-line bg-white shadow-lg p-4 z-30"
        >
          <div className="font-display text-tal-plum mb-1">
            Share securely
          </div>
          <p className="text-xs text-tal-plum-soft mb-3">
            Anyone with the link can view a read-only copy of your planner.
            Links expire after 7 days and can be revoked anytime.
          </p>

          {!loaded ? (
            <div className="text-xs text-tal-plum-soft py-2">Loading…</div>
          ) : share && shareUrl ? (
            <>
              <label className="block text-xs text-tal-plum-soft mb-1">
                Share link
              </label>
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full h-9 px-2 rounded-lg border border-tal-line text-xs bg-tal-cream-soft"
              />
              <div className="text-xs text-tal-plum-soft mt-1">
                Expires{" "}
                {new Date(share.expiresAt).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                .
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyUrl}
                  className="h-8 px-3 rounded-lg bg-black text-white text-xs font-medium"
                >
                  {copied ? "Copied ✓" : "Copy link"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={createShare}
                  className="h-8 px-3 rounded-lg border border-tal-line text-xs text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
                >
                  {busy ? "…" : "New link"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={revokeShare}
                  className="h-8 px-3 rounded-lg text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  Revoke
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={createShare}
              className="w-full h-9 rounded-lg bg-black text-white text-sm font-medium disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create secure link (7 days)"}
            </button>
          )}

          {error && (
            <div className="mt-2 text-xs text-red-700">{error}</div>
          )}
        </div>
      )}
    </div>
  );
}
