"use client";

import { RouteError } from "@/components/RouteError";

export default function RecordsError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <RouteError
      error={error}
      retry={unstable_retry}
      title="We couldn't load your records"
    />
  );
}
