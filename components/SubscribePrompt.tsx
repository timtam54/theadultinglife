"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  status: string;
  dismissed: boolean;
}

export function SubscribePrompt({ status, dismissed }: Props) {
  const router = useRouter();
  const [hidden, setHidden] = useState(dismissed || status === "active");
  const [submitting, setSubmitting] = useState(false);

  if (hidden) return null;

  const bypass = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/subscribe-prompt/dismiss", { method: "POST" });
    } catch {
      // swallow — hiding locally is the important part
    }
    setHidden(true);
  };

  const subscribe = () => {
    setHidden(true);
    router.push("/subscription");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscribe-prompt-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
    >
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-tal-cream to-tal-cream-soft px-8 pt-8 pb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-tal-plum text-white">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 3l2.35 5.26 5.65.51-4.3 3.94 1.3 5.79L12 15.77l-5 3.03 1.3-5.79-4.3-3.94 5.65-.51L12 3z"
                fill="currentColor"
              />
            </svg>
          </div>
          <h2
            id="subscribe-prompt-title"
            className="mt-4 font-display text-2xl text-tal-plum"
          >
            Unlock TAL Premium
          </h2>
          <p className="mt-2 text-sm text-tal-plum-soft">
            Your life, organised — with everything The Adulting Life has to offer.
          </p>
        </div>

        <div className="px-8 py-6">
          <div className="rounded-2xl bg-tal-cream-soft px-5 py-4 text-center">
            <p className="text-3xl font-semibold text-tal-plum">
              $9.99
              <span className="text-base font-normal text-tal-plum-soft">
                {" "}
                AUD / month
              </span>
            </p>
            <p className="mt-1 text-xs text-tal-plum-soft">Cancel anytime.</p>
          </div>

          <ul className="mt-5 space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <Check /> Full access to Learn, Records &amp; Planner
            </li>
            <li className="flex items-start gap-2">
              <Check /> Secure document storage
            </li>
            <li className="flex items-start gap-2">
              <Check /> Ask TAL AI, unlimited
            </li>
          </ul>

          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={subscribe}
              className="w-full rounded-full bg-tal-plum px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Subscribe now
            </button>
            <button
              type="button"
              onClick={bypass}
              disabled={submitting}
              className="w-full rounded-full px-4 py-3 text-sm text-tal-plum-soft hover:text-tal-plum transition-colors disabled:opacity-50"
            >
              {submitting ? "One moment…" : "Maybe later"}
            </button>
          </div>
          <p className="mt-3 text-center text-[11px] text-tal-plum-soft">
            We&rsquo;ll ask again in 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
}

function Check() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className="mt-0.5 flex-shrink-0 text-tal-plum"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.12" />
      <path
        d="M8 12.5l2.5 2.5 5.5-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
