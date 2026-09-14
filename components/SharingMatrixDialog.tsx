"use client";

/*
 * Modal wrapper around <SharingMatrix>. Fetches the matrix payload on open
 * (so it's always fresh) and shows a loading/error state. Any surface that
 * wants to expose the owner's full shares grid — the Settings section
 * embeds the matrix directly, but ShareDialog uses this modal via a
 * "View all shares" button — can drop this in.
 */

import { useEffect, useState } from "react";
import { SharingMatrix } from "@/components/SharingMatrix";
import type { SharingMatrix as MatrixData } from "@/lib/services/sharing-matrix";

interface Props {
  onClose: () => void;
}

type State =
  | { kind: "loading" }
  | { kind: "loaded"; data: MatrixData }
  | { kind: "error" };

export function SharingMatrixDialog({ onClose }: Props) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/sharing-matrix");
        if (!res.ok) throw new Error("load_failed");
        const data = (await res.json()) as MatrixData;
        if (cancelled) return;
        setState({ kind: "loaded", data });
      } catch {
        if (!cancelled) setState({ kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sharing-matrix-dialog-title"
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[85vh] rounded-2xl bg-white shadow-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-tal-line flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              id="sharing-matrix-dialog-title"
              className="font-display text-lg text-tal-plum"
            >
              What you&apos;ve shared
            </h3>
            <p className="text-xs text-tal-plum-soft mt-1">
              Every item you&apos;ve shared and who can see it. Revoke or
              grant access straight from the grid.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 h-8 w-8 rounded-full text-tal-plum-soft hover:bg-tal-cream-soft hover:text-tal-plum flex items-center justify-center"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 overflow-y-auto">
          {state.kind === "loading" && (
            <p className="text-sm text-tal-plum-soft">Loading…</p>
          )}
          {state.kind === "error" && (
            <p className="text-sm text-red-700">
              Couldn&apos;t load your shares. Try again in a moment.
            </p>
          )}
          {state.kind === "loaded" && <SharingMatrix data={state.data} />}
        </div>
      </div>
    </div>
  );
}
