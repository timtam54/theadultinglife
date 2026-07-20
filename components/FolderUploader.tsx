"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function FolderUploader({ subcategoryId }: { subcategoryId: string }) {
  const router = useRouter();
  const uploadRef = useRef<HTMLInputElement>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "scan" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handle(file: File, mode: "upload" | "scan") {
    setErr(null);
    setBusy(mode);
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
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => scanRef.current?.click()}
        disabled={busy !== null}
        className="h-9 px-3 rounded-xl border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft flex items-center gap-1.5 disabled:opacity-60"
        title="Take a photo of the document with your camera."
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 8h3l2-3h6l2 3h3v11H4V8Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        {busy === "scan" ? "Scanning…" : "Scan"}
      </button>
      <input
        ref={scanRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handle(f, "scan");
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => uploadRef.current?.click()}
        disabled={busy !== null}
        className="h-9 px-3 rounded-xl border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
      >
        {busy === "upload" ? "Uploading…" : "Upload document"}
      </button>
      <input
        ref={uploadRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handle(f, "upload");
          e.target.value = "";
        }}
      />
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
