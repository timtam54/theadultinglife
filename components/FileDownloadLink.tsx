"use client";

import { useState } from "react";

export function FileDownloadLink({
  fileId,
  children,
}: {
  fileId: string;
  children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);

  async function open() {
    setBusy(true);
    try {
      const res = await fetch(`/api/files/${fileId}`);
      if (!res.ok) return;
      const json = (await res.json()) as { url: string };
      window.open(json.url, "_blank");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      className="text-sm text-tal-plum hover:underline disabled:opacity-60"
    >
      {busy ? "Opening…" : children}
    </button>
  );
}
