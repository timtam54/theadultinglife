"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem 1rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
          The app crashed
        </h1>
        <p style={{ color: "#666", marginBottom: "1.5rem" }}>
          Something went badly wrong. Try again, or reload the page.
        </p>
        {error.digest && (
          <p style={{ fontSize: "0.75rem", color: "#999", marginBottom: "1.5rem" }}>
            Reference: <code>{error.digest}</code>
          </p>
        )}
        <button
          type="button"
          onClick={unstable_retry}
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: "0.75rem",
            background: "#4c373c",
            color: "white",
            border: "none",
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
