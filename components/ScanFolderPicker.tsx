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

// Subcategories that need two-sided capture (front + back of a card).
const TWO_SIDED_FOLDERS = new Set<string>(["personal.drivers_licence"]);

export function ScanFolderPicker({ groups }: { groups: FolderPickerGroup[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<FolderPickerOption | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [awaitingBack, setAwaitingBack] = useState(false);
  const [frontFile, setFrontFile] = useState<{
    id: string;
    mime: string | null;
    filename: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFolder(f: FolderPickerOption) {
    setSelected(f);
    setError(null);
    setStatus(null);
    setAwaitingBack(false);
    setFrontFile(null);
    // Small tick so state settles before opening the picker.
    setTimeout(() => inputRef.current?.click(), 0);
  }

  async function uploadFile(file: File, subcategoryId: string): Promise<FileResponse["file"]> {
    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("subcategoryId", subcategoryId);
    uploadForm.append("allowDuplicate", "1");
    const uploadRes = await fetch("/api/files", {
      method: "POST",
      body: uploadForm,
    });
    if (!uploadRes.ok) {
      const j = (await uploadRes.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? "upload_failed");
    }
    const { file: uploaded } = (await uploadRes.json()) as FileResponse;
    return uploaded;
  }

  async function runScan(
    fileIds: string[],
    primary: { id: string; mime: string | null; filename: string },
    subcategoryId: string,
    categoryId: string
  ) {
    setStatus("Extracting fields with AI…");
    const scanForm = new FormData();
    for (const id of fileIds) scanForm.append("fileId", id);
    scanForm.append("subcategoryId", subcategoryId);
    const scanRes = await fetch("/api/scan-document", {
      method: "POST",
      body: scanForm,
    });
    if (!scanRes.ok) {
      const j = (await scanRes.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? "scan_failed");
    }
    const { scan } = (await scanRes.json()) as ScanResponse;

    writeScanPrefill({
      title: scan.title,
      fields: scan.fields,
      expiryDate: scan.expiryDate,
      notes: scan.notes,
      confidence: scan.confidence,
      sourceFileId: primary.id,
      sourceMime: primary.mime,
      sourceFilename: primary.filename,
    });
    router.push(
      `/records/${categoryId}/new?subcategory=${encodeURIComponent(subcategoryId)}&fromScan=1`
    );
  }

  async function handleFile(file: File) {
    if (!selected) return;
    setError(null);
    setBusy(true);
    try {
      const twoSided = TWO_SIDED_FOLDERS.has(selected.id);

      if (twoSided && !frontFile) {
        setStatus("Uploading front of card…");
        const uploaded = await uploadFile(file, selected.id);
        setFrontFile({
          id: uploaded.id,
          mime: uploaded.mime_type ?? file.type ?? null,
          filename: uploaded.filename ?? file.name,
        });
        setAwaitingBack(true);
        setStatus(null);
        setBusy(false);
        // Prompt for the back on the next tick so the user sees the message.
        setTimeout(() => inputRef.current?.click(), 0);
        return;
      }

      if (twoSided && frontFile) {
        setStatus("Uploading back of card…");
        const back = await uploadFile(file, selected.id);
        await runScan(
          [frontFile.id, back.id],
          frontFile,
          selected.id,
          selected.categoryId
        );
        return;
      }

      setStatus("Uploading document…");
      const uploaded = await uploadFile(file, selected.id);
      await runScan(
        [uploaded.id],
        {
          id: uploaded.id,
          mime: uploaded.mime_type ?? file.type ?? null,
          filename: uploaded.filename ?? file.name,
        },
        selected.id,
        selected.categoryId
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
      setAwaitingBack(false);
      setFrontFile(null);
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

      {awaitingBack && !busy && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-center justify-between gap-3">
          <span>
            Front captured. Now take a photo of the <strong>back</strong> of the card.
          </span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="h-9 px-3 rounded-lg bg-black text-white text-sm font-medium"
          >
            Take back photo
          </button>
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
