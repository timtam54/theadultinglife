"use client";

import { useState } from "react";
import type { FileRow } from "@/lib/db/types";

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function FilesClient({ initial }: { initial: FileRow[] }) {
  const [files, setFiles] = useState<FileRow[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/files", { method: "POST", body: form });
      if (!res.ok) throw new Error("upload_failed");
      const json = (await res.json()) as { file: FileRow };
      setFiles((prev) => [json.file, ...prev]);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDownload(id: string) {
    const res = await fetch(`/api/files/${id}`);
    if (!res.ok) return;
    const json = (await res.json()) as { url: string };
    window.open(json.url, "_blank");
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this file?")) return;
    const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
    if (res.ok) {
      setFiles((prev) => prev.filter((f) => f.id !== id));
    }
  }

  return (
    <div>
      <label className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-tal-plum text-white font-medium cursor-pointer hover:bg-tal-plum-dark">
        {uploading ? "Uploading…" : "Upload file"}
        <input
          type="file"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
      </label>
      <label className="ml-2 inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-tal-line bg-white cursor-pointer hover:bg-tal-cream-soft">
        Capture photo
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {error && (
        <div className="mt-4 p-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">
          {error}
        </div>
      )}

      <div className="mt-6">
        {files.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-tal-line bg-white p-8 text-center text-tal-plum-soft">
            No files yet — upload your first above.
          </div>
        ) : (
          <ul className="space-y-2">
            {files.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded-xl border border-tal-line bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{f.filename}</div>
                  <div className="text-xs text-tal-plum-soft">
                    {fmtBytes(Number(f.size_bytes))} ·{" "}
                    {new Date(f.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(f.id)}
                    className="text-sm text-tal-plum hover:underline"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(f.id)}
                    className="text-sm text-red-700 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
