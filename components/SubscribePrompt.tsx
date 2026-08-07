"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const BYPASS_KEY = "adultinglife_subscribe_bypass";

interface Props {
  status: string;
}

export function SubscribePrompt({ status }: Props) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (status === "active") return;
    if (sessionStorage.getItem(BYPASS_KEY) === "1") return;
    setDismissed(false);
  }, [status]);

  if (dismissed || status === "active") return null;

  const bypass = () => {
    sessionStorage.setItem(BYPASS_KEY, "1");
    setDismissed(true);
  };

  const subscribe = () => {
    setDismissed(true);
    router.push("/subscription");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscribe-prompt-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2
          id="subscribe-prompt-title"
          className="font-display text-2xl text-tal-plum"
        >
          Subscribe to The Adulting Life
        </h2>
        <p className="mt-3 text-sm text-gray-700">
          TAL Premium is <strong>$9.99 AUD / month</strong>. Cancel anytime.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          You can also skip this for now &mdash; you&rsquo;ll be asked again next
          time you sign in.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={subscribe}
            className="flex-1 rounded bg-black px-4 py-2 text-white"
          >
            Subscribe
          </button>
          <button
            type="button"
            onClick={bypass}
            className="flex-1 rounded border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Bypass for now
          </button>
        </div>
      </div>
    </div>
  );
}
