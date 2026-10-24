"use client";

import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

// The app's one "Are you sure?" box — used instead of the browser's plain
// confirm() pop-up, which looks different on every device and awkward in the
// installed iPhone app. Call it like confirm():
//
//   if (!(await confirmDialog("Delete this letter?"))) return;
//
// Resolves true when the person presses the confirm button.

export interface ConfirmOptions {
  /** Short heading, e.g. "Delete this letter?" — defaults to the message. */
  title?: string;
  /** Button label — defaults to "Delete" for destructive actions. */
  confirmLabel?: string;
  /** Red confirm button (default true). False for neutral confirmations. */
  danger?: boolean;
}

function ConfirmBox({
  message,
  opts,
  onDone,
}: {
  message: string;
  opts: ConfirmOptions;
  onDone: (ok: boolean) => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const danger = opts.danger ?? true;
  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDone]);

  const [first, ...rest] = message.split("\n");
  const title = opts.title ?? first;
  const body = opts.title ? message : rest.join("\n").trim();

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-[100001] bg-black/50 flex items-center justify-center p-4 text-left"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDone(false);
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5 text-tal-plum">
        <h2 id="confirm-dialog-title" className="font-display text-lg leading-snug">
          {title}
        </h2>
        {body && <p className="mt-2 text-sm text-tal-plum-soft whitespace-pre-line">{body}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onDone(false)}
            className="h-10 px-4 rounded-xl border border-tal-line text-sm text-tal-plum hover:bg-tal-cream-soft"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onDone(true)}
            className={
              "h-10 px-4 rounded-xl text-sm font-medium text-white " +
              (danger ? "bg-red-600 hover:bg-red-700" : "bg-black")
            }
          >
            {opts.confirmLabel ?? (danger ? "Delete" : "OK")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function confirmDialog(message: string, opts: ConfirmOptions = {}): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const done = (ok: boolean) => {
      root.unmount();
      host.remove();
      resolve(ok);
    };
    root.render(<ConfirmBox message={message} opts={opts} onDone={done} />);
  });
}
