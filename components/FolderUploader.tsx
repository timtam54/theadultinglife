"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function FolderUploader({ subcategoryId }: { subcategoryId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handle(file: File) {
    setErr(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("subcategoryId", subcategoryId);
      const res = await fetch("/api/files", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "upload_failed");
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "upload_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="h-9 px-3 rounded-xl border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
      >
        {busy ? "Uploading…" : "Upload document"}
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handle(f);
          e.target.value = "";
        }}
      />
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
