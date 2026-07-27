"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderPickerGrid,
  type FolderPickerGroup,
  type FolderPickerOption,
} from "@/components/FolderPickerGrid";

export function UploadFolderPicker({
  groups,
}: {
  groups: FolderPickerGroup[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<FolderPickerOption | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFolder(f: FolderPickerOption) {
    setSelected(f);
    setError(null);
    setStatus(null);
    setTimeout(() => inputRef.current?.click(), 0);
  }

  async function handleFile(file: File) {
    if (!selected) return;
    setError(null);
    setStatus(`Uploading “${file.name}” to ${selected.name}…`);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("subcategoryId", selected.id);
      const res = await fetch("/api/files", { method: "POST", body: form });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "upload_failed");
      }
      router.push(
        `/records/${selected.categoryId}/${encodeURIComponent(selected.id)}`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(
        msg === "file_too_large"
          ? "That file is too large."
          : "Upload failed. Try again."
      );
      setStatus(null);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />

      {busy && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 flex items-center gap-3">
          <span className="inline-block h-4 w-4 rounded-full border-2 border-emerald-300 border-t-emerald-700 animate-spin" />
          <span>{status}</span>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <FolderPickerGrid
        groups={groups}
        disabled={busy}
        onPick={pickFolder}
        emptyLabel="You don't have any folders to upload into yet."
      />
    </div>
  );
}
