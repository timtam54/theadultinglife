"use client";

import { useEffect } from "react";

export function RouteError({
  error,
  retry,
  title = "Something went wrong",
}: {
  error: Error & { digest?: string };
  retry: () => void;
  title?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-lg mx-auto py-12 text-center">
      <h1 className="font-display text-2xl text-tal-plum mb-2">{title}</h1>
      <p className="text-tal-plum-soft mb-6">
        We hit an unexpected error. You can try again, or head back to the
        dashboard.
      </p>
      {error.digest && (
        <p className="text-xs text-tal-plum-soft mb-6">
          Reference: <code className="font-mono">{error.digest}</code>
        </p>
      )}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={retry}
          className="h-10 px-4 rounded-xl bg-tal-plum text-white text-sm font-medium hover:bg-tal-plum-dark"
        >
          Try again
        </button>
        <a
          href="/dashboard"
          className="h-10 px-4 inline-flex items-center rounded-xl border border-tal-line text-sm text-tal-plum hover:bg-tal-cream-soft"
        >
          Go to dashboard
        </a>
      </div>
    </div>
  );
}
