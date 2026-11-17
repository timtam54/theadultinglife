"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// View-only accounts (no subscription after launch — see
// lib/subscription/access.ts). Any save the server refuses with
// 402 "subscription_required" opens this popup, wherever in the app it came
// from, so no form needs its own handling. The banner sits at the top of the
// app while the account is view-only.

const EVENT = "tal:subscription-required";

export function SubscriptionRequiredWatcher() {
  const [open, setOpen] = useState(false);
  const lastClosed = useRef(0);

  useEffect(() => {
    const original = window.fetch;
    window.fetch = async (...args) => {
      const res = await original(...args);
      if (res.status === 402) {
        res
          .clone()
          .json()
          .then((body: { error?: string }) => {
            if (body?.error === "subscription_required") window.dispatchEvent(new Event(EVENT));
          })
          .catch(() => {});
      }
      return res;
    };
    // Autosaving screens can trip this repeatedly — don't reopen straight
    // after it's been closed.
    const onBlocked = () => {
      if (Date.now() - lastClosed.current > 60_000) setOpen(true);
    };
    window.addEventListener(EVENT, onBlocked);
    return () => {
      window.fetch = original;
      window.removeEventListener(EVENT, onBlocked);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  function close() {
    lastClosed.current = Date.now();
    setOpen(false);
  }

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-required-title"
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 id="subscription-required-title" className="font-display text-xl text-tal-plum">
          Subscribe to keep adding and editing
        </h2>
        <p className="mt-2 text-sm text-tal-plum-soft">
          Your information is safe and you can still view, download and print everything. To add or change anything, or use
          the AI features, subscribe to TAL Premium.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
            className="h-10 rounded-xl border border-tal-line px-4 text-sm text-tal-plum hover:bg-tal-cream-soft"
          >
            Cancel
          </button>
          <Link
            href="/subscription"
            onClick={close}
            className="inline-flex h-10 items-center rounded-xl bg-black px-5 text-sm font-medium text-white"
          >
            Subscribe
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ViewOnlyBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
      <strong>View-only.</strong> Your information is safe — subscribe to add or change anything.{" "}
      <Link href="/subscription" className="font-medium underline">
        Subscribe
      </Link>
    </div>
  );
}

/** During the grace period after a failed payment. */
export function PaymentFailedBanner({ graceEnds }: { graceEnds: string }) {
  const date = new Date(graceEnds).toLocaleDateString("en-AU", { day: "numeric", month: "long" });
  return (
    <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-sm text-red-900">
      <strong>Your payment didn&rsquo;t go through.</strong> Update your card by {date} to keep adding and editing.{" "}
      <Link href="/subscription" className="font-medium underline">
        Update card
      </Link>
    </div>
  );
}
