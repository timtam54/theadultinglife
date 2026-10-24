"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileViewerButton } from "@/components/FileViewerButton";
import { confirmDialog } from "@/components/confirm-dialog";

// Several photos attached to one form entry — e.g. the scene photos for one
// accident. Photos are stored as files linked to the entry (instance id), so
// they also appear in the folder's Documents and in downloads. On a phone,
// "Add photos" offers the camera.

interface EntryFile {
  id: string;
  filename: string;
  mime_type: string | null;
}

export function EntryPhotos({
  subcategoryId,
  instanceId,
  targetUserId,
  label = "Photos",
  hint,
}: {
  subcategoryId: string;
  instanceId: string;
  targetUserId?: string;
  label?: string;
  hint?: string;
}) {
  const [photos, setPhotos] = useState<EntryFile[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ subcategoryId, instanceId });
    if (targetUserId) qs.set("targetUserId", targetUserId);
    const res = await fetch(`/api/files?${qs}`);
    if (!res.ok) return;
    const { files } = (await res.json()) as { files: EntryFile[] };
    const images = files.filter((f) => f.mime_type?.startsWith("image/"));
    setPhotos(images);
    const urls: Record<string, string> = {};
    await Promise.all(
      images.map(async (f) => {
        const r = await fetch(`/api/files/${encodeURIComponent(f.id)}`);
        if (r.ok) urls[f.id] = ((await r.json()) as { url: string }).url;
      })
    );
    setThumbs(urls);
  }, [subcategoryId, instanceId, targetUserId]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function add(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    let failed = 0;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("subcategoryId", subcategoryId);
      fd.append("instanceId", instanceId);
      fd.append("allowDuplicate", "1");
      if (targetUserId) fd.append("targetUserId", targetUserId);
      const res = await fetch("/api/files", { method: "POST", body: fd }).catch(() => null);
      if (!res?.ok) failed++;
    }
    if (failed) setError(`${failed} photo${failed === 1 ? "" : "s"} couldn't be uploaded. Try again.`);
    await load();
    setBusy(false);
  }

  async function remove(id: string) {
    if (!(await confirmDialog("Remove this photo?\nThis can't be undone.", { confirmLabel: "Remove" }))) return;
    setError(null);
    const res = await fetch(`/api/files/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setError("Couldn't remove that photo. Try again.");
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="mt-5 rounded-xl border border-tal-line bg-tal-cream-soft/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-tal-plum">{label}</div>
          {hint && <p className="text-xs text-tal-plum-soft mt-0.5">{hint}</p>}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-60"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 8h3l2-3h6l2 3h3v11H4V8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          {busy ? "Uploading…" : "Add photos"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const f = e.target.files;
            void add(f).finally(() => {
              if (inputRef.current) inputRef.current.value = "";
            });
          }}
        />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}
      {photos.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-2">
          {photos.map((p) => (
            <li key={p.id} className="relative">
              <FileViewerButton
                fileId={p.id}
                filename={p.filename}
                mimeType={p.mime_type}
                title={`View ${p.filename}`}
                className="no-hover-fx block w-full aspect-square overflow-hidden rounded-lg border border-tal-line bg-white"
              >
                {thumbs[p.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
                  <img src={thumbs[p.id]} alt={p.filename} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] text-tal-plum-soft">Loading…</span>
                )}
              </FileViewerButton>
              <button
                type="button"
                onClick={() => void remove(p.id)}
                aria-label={`Remove ${p.filename}`}
                className="no-hover-fx absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 text-white text-xs leading-6"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
