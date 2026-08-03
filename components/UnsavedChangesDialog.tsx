"use client";

import { useEffect } from "react";
import { useNavigationBlocker } from "@/contexts/navigation-blocker";

export function UnsavedChangesDialog() {
  const { pendingConfirm, closeConfirm } = useNavigationBlocker();
  const open = pendingConfirm.open;

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeConfirm(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, closeConfirm]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-changes-title"
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={() => closeConfirm(false)}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="unsaved-changes-title"
          className="font-display text-lg text-tal-plum mb-2"
        >
          Unsaved changes
        </h3>
        <p className="text-sm text-tal-plum-soft mb-5">
          You&apos;ve made changes that haven&apos;t been saved. Leave anyway
          and discard them?
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => closeConfirm(false)}
            className="h-9 px-3 rounded-xl text-sm text-tal-plum hover:bg-tal-cream-soft"
            autoFocus
          >
            Stay
          </button>
          <button
            type="button"
            onClick={() => closeConfirm(true)}
            className="h-9 px-4 rounded-xl bg-black text-white text-sm font-medium"
          >
            Discard changes
          </button>
        </div>
      </div>
    </div>
  );
}
