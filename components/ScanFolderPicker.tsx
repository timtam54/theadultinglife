"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { writeScanPrefill } from "@/lib/scan-prefill";
import {
  FolderPickerGrid,
  type FolderPickerGroup,
  type FolderPickerOption,
} from "@/components/FolderPickerGrid";

interface ScanResponse {
  scan: {
    title: string;
    fields: {
      key: string;
      label: string;
      type: "text" | "date" | "number";
      value: string;
    }[];
    expiryDate: string | null;
    notes: string | null;
    confidence: "high" | "medium" | "low";
  };
}

interface FileResponse {
  file: { id: string; mime_type: string | null; filename: string };
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";

export function ScanFolderPicker({ groups }: { groups: FolderPickerGroup[] }) {
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
    // Small tick so state settles before opening the picker.
    setTimeout(() => inputRef.current?.click(), 0);
  }

  async function handleFile(file: File) {
    if (!selected) return;
    setError(null);
    setStatus("Uploading document…");
    setBusy(true);
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("subcategoryId", selected.id);
      const uploadRes = await fetch("/api/files", {
        method: "POST",
        body: uploadForm,
      });
      if (!uploadRes.ok) {
        const j = (await uploadRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(j.error ?? "upload_failed");
      }
      const { file: uploaded } = (await uploadRes.json()) as FileResponse;

      setStatus("Extracting fields with AI…");
      const scanForm = new FormData();
      scanForm.append("fileId", uploaded.id);
      scanForm.append("subcategoryId", selected.id);
      const scanRes = await fetch("/api/scan-document", {
        method: "POST",
        body: scanForm,
      });
      if (!scanRes.ok) {
        const j = (await scanRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(j.error ?? "scan_failed");
      }
      const { scan } = (await scanRes.json()) as ScanResponse;

      writeScanPrefill({
        title: scan.title,
        fields: scan.fields,
        expiryDate: scan.expiryDate,
        notes: scan.notes,
        confidence: scan.confidence,
        sourceFileId: uploaded.id,
        sourceMime: uploaded.mime_type ?? file.type ?? null,
        sourceFilename: uploaded.filename ?? file.name,
      });
      router.push(
        `/records/${selected.categoryId}/new?subcategory=${encodeURIComponent(selected.id)}&fromScan=1`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(
        msg === "unsupported_mime_type"
          ? "That file type isn't supported. Try JPEG, PNG, WebP or PDF."
          : msg === "file_too_large"
            ? "That file is too large (max 20MB)."
            : "Something went wrong. Try again."
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
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />

      {busy && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 flex items-center gap-3">
          <span className="inline-block h-4 w-4 rounded-full border-2 border-violet-300 border-t-violet-700 animate-spin" />
          <span>
            {selected ? (
              <>
                <strong>{selected.name}:</strong> {status}
              </>
            ) : (
              status
            )}
          </span>
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
        emptyLabel="You don't have any folders that accept scanned documents yet."
      />
    </div>
  );
}
