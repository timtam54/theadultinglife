"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileDownloadLink } from "@/components/FileDownloadLink";
import { writeScanPrefill } from "@/lib/scan-prefill";
import type { FileRow } from "@/lib/db/types";

interface Props {
  files: FileRow[];
  categoryId: string;
  subcategoryId: string;
}

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

function fileKind(mime: string | null): {
  label: string;
  scannable: boolean;
} {
  if (!mime) return { label: "File", scannable: false };
  if (mime === "application/pdf") return { label: "PDF", scannable: true };
  if (mime.startsWith("image/")) return { label: "Image", scannable: true };
  return { label: mime.split("/")[1]?.toUpperCase() || "File", scannable: false };
}

export function FolderFileList({ files, categoryId, subcategoryId }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<{ id: string; message: string } | null>(
    null
  );

  async function handleCapture(file: FileRow) {
    setErrorId(null);
    setBusyId(file.id);
    try {
      const fd = new FormData();
      fd.append("fileId", file.id);
      fd.append("subcategoryId", subcategoryId);
      const res = await fetch("/api/scan-document", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        const message =
          j.error === "unsupported_mime_type"
            ? "This file type can't be scanned."
            : j.error === "file_too_large"
              ? "File is too large to scan."
              : j.error === "AI is not configured on this server."
                ? "AI isn't configured on this server."
                : "Scan failed. Try again.";
        setErrorId({ id: file.id, message });
        return;
      }
      const { scan } = (await res.json()) as ScanResponse;
      writeScanPrefill({
        title: scan.title,
        fields: scan.fields,
        expiryDate: scan.expiryDate,
        notes: scan.notes,
        confidence: scan.confidence,
        sourceFileId: file.id,
        sourceMime: file.mime_type,
        sourceFilename: file.filename,
      });
      router.push(
        `/records/${categoryId}/new?subcategory=${encodeURIComponent(subcategoryId)}&fromScan=1`
      );
    } catch {
      setErrorId({ id: file.id, message: "Scan failed. Try again." });
    } finally {
      setBusyId(null);
    }
  }

  if (files.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-tal-line bg-white p-6 text-sm text-tal-plum-soft">
        No documents uploaded to this folder yet.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {files.map((f) => {
        const kind = fileKind(f.mime_type);
        const busy = busyId === f.id;
        const err = errorId?.id === f.id ? errorId.message : null;
        return (
          <li
            key={f.id}
            className="rounded-xl border border-tal-line bg-white px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex items-center gap-3">
                <span
                  className={
                    "shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md " +
                    (kind.label === "PDF"
                      ? "bg-red-100 text-red-800"
                      : kind.label === "Image"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-700")
                  }
                >
                  {kind.label}
                </span>
                <div className="min-w-0">
                  <div className="font-medium truncate">{f.filename}</div>
                  <div className="text-xs text-tal-plum-soft">
                    {new Date(f.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {kind.scannable && (
                  <button
                    type="button"
                    onClick={() => handleCapture(f)}
                    disabled={busy || busyId !== null}
                    className="h-9 px-3 rounded-xl border border-violet-300 bg-violet-50 text-violet-800 text-sm font-medium hover:bg-violet-100 disabled:opacity-60 inline-flex items-center gap-1.5"
                    title="Use AI to extract fields from this document and prefill a new record."
                  >
                    <span aria-hidden>✨</span>
                    {busy ? "Extracting…" : "AI Data Capture"}
                  </button>
                )}
                <FileDownloadLink fileId={f.id}>Download</FileDownloadLink>
              </div>
            </div>
            {err && (
              <div className="mt-2 text-xs text-red-700">{err}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
