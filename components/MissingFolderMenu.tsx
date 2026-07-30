"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function MissingFolderMenu({
  subcategoryId,
}: {
  subcategoryId: string;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

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

  async function dismiss(snoozeDays?: number) {
    setBusy(true);
    try {
      const res = await fetch("/api/folder-dismissals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subcategoryId, snoozeDays }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOpen(false);
      router.refresh();
    } catch {
      // Silent fail — the menu just stays open. A future toast could surface this.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="More options"
        aria-expanded={open}
        aria-haspopup="menu"
        className="w-8 h-8 rounded-full text-tal-plum-soft hover:bg-tal-cream inline-flex items-center justify-center"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
          <circle cx="5" cy="12" r="1.6" fill="currentColor" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          <circle cx="19" cy="12" r="1.6" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 min-w-44 rounded-xl border border-tal-line bg-white shadow-lg py-1 z-30"
        >
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dismiss(30);
            }}
            className="w-full text-left px-3 py-2 text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
          >
            Snooze 30 days
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dismiss();
            }}
            className="w-full text-left px-3 py-2 text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
          >
            Not applicable
          </button>
        </div>
      )}
    </div>
  );
}
