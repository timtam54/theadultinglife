"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function FolderUploader({
  subcategoryId,
  targetUserId,
}: {
  subcategoryId: string;
  targetUserId?: string;
}) {
  const router = useRouter();
  const uploadRef = useRef<HTMLInputElement>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "scan" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{
    file: File;
    mode: "upload" | "scan";
    existingName: string;
  } | null>(null);

  async function send(file: File, mode: "upload" | "scan", allowDuplicate: boolean) {
    setErr(null);
    setBusy(mode);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("subcategoryId", subcategoryId);
      if (allowDuplicate) form.append("allowDuplicate", "1");
      if (targetUserId) form.append("targetUserId", targetUserId);
      const res = await fetch("/api/files", { method: "POST", body: form });
      if (res.status === 409) {
        const body = (await res.json().catch(() => ({}))) as {
          duplicateOf?: { filename?: string };
        };
        setDuplicate({
          file,
          mode,
          existingName: body.duplicateOf?.filename ?? file.name,
        });
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(friendlyError(body?.error));
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function handle(file: File, mode: "upload" | "scan") {
    await send(file, mode, false);
  }

  async function confirmDuplicate() {
    if (!duplicate) return;
    const { file, mode } = duplicate;
    setDuplicate(null);
    await send(file, mode, true);
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
        className="h-9 px-3 rounded-xl border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60 inline-flex items-center gap-1.5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3v12M6 9l6-6 6 6M4 21h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {busy === "upload" ? "Uploading…" : "Upload Document"}
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
      {duplicate && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setDuplicate(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg text-tal-plum mb-2">
              This document already exists
            </h3>
            <p className="text-sm text-tal-plum-soft mb-4">
              A file called{" "}
              <span className="font-medium text-tal-plum break-all">
                {duplicate.existingName}
              </span>{" "}
              is already in this folder. Upload again to keep both, or cancel.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDuplicate(null)}
                className="h-9 px-3 rounded-xl text-sm text-tal-plum hover:bg-tal-cream-soft"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDuplicate}
                className="h-9 px-4 rounded-xl bg-black text-white text-sm font-medium"
              >
                Upload anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function friendlyError(code?: string): string {
  switch (code) {
    case "unsupported_mime_type":
      return "That file type isn't supported. Try PDF, JPG, PNG or WebP.";
    case "file_too_large":
      return "That file is too large — max 20 MB.";
    case "unauthorized":
      return "Please sign in again.";
    default:
      return "Upload failed. Try again.";
  }
}
