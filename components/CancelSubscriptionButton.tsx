"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelSubscriptionButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const resp = await fetch("/api/square/cancel", { method: "POST" });
      const data = (await resp.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!resp.ok || !data?.ok) {
        setError(data?.error ?? `Failed (${resp.status})`);
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-red-700 underline underline-offset-2 hover:text-red-800"
      >
        Cancel subscription
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm text-red-900">
        Cancel your TAL Premium subscription? You&rsquo;ll keep access until the
        end of your current billing period, then it won&rsquo;t renew.
      </p>
      {error && (
        <p className="mt-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={cancel}
          disabled={submitting}
          className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {submitting ? "Cancelling…" : "Yes, cancel"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={submitting}
          className="rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-white"
        >
          Keep subscription
        </button>
      </div>
    </div>
  );
}
