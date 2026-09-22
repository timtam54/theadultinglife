"use client";

import { useEffect, useState, useRef } from "react";
import { FileViewerButton } from "@/components/FileViewerButton";
import { AiConsentGate } from "@/components/AiConsentGate";
import { useAiConsent } from "@/hooks/useAiConsent";

// Shape returned by /api/scan-document. Matches ScanOutput in
// lib/services/document-scan.ts. Duplicated here to keep the client
// component free of a heavy server-only import.
export interface FileScanResult {
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
}

interface Props {
  /** Currently stored file id (or empty string). Empty = no file attached. */
  value: string;
  /** Called with the new file id after upload, or "" after remove. */
  onChange: (fileId: string) => void;
  /** The folder this file belongs to — passed through to the upload endpoint
   *  so file_objects.subcategory_id is populated correctly. */
  subcategoryId: string;
  /** Optional target user id (e.g. child form filled by parent). */
  targetUserId?: string;
  /** Repeater instance this file belongs to. Written to
   *  file_objects.instance_id so the file "belongs" to the entry and
   *  disappears from the folder-wide Documents pile. */
  instanceId?: string;
  /** When provided, right after upload the file is sent to /api/scan-document
   *  for AI extraction. The extracted result is passed to this callback, which
   *  the parent form uses to prefill sibling questions on the same entry. */
  onScanned?: (result: FileScanResult) => void;
  ariaLabel?: string;
  disabled?: boolean;
}

// Small file field for page-form questions. Renders one of:
//   - A drop-zone / upload button when no file attached
//   - A preview row (filename + View / Remove) when a file id is stored
//
// Uses POST /api/files to upload. The returned file id is stored as the
// question's answer value — no schema change needed on file_objects.
//
// When onScanned is set, the component also runs the upload through
// /api/scan-document (behind an AI consent gate) so the parent form can
// prefill the rest of the entry from the document. Matches the old
// records-mode "Scan document" flow.
export function FileFieldInput({
  value,
  onChange,
  subcategoryId,
  targetUserId,
  instanceId,
  onScanned,
  ariaLabel,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [uploadedMeta, setUploadedMeta] = useState<{
    filename: string;
    mime: string | null;
  } | null>(null);
  const consent = useAiConsent();

  // Re-hydrate metadata (filename + mime type) when the component mounts
  // with a file id already stored (page reload after previous save). Without
  // this, FileViewerButton receives mimeType=null and falls through to the
  // "Preview isn't available here" fallback even for PDFs and images.
  useEffect(() => {
    if (!value || uploadedMeta) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/files/${encodeURIComponent(value)}`);
        if (!res.ok) return;
        const body = (await res.json()) as {
          filename?: string | null;
          mime_type?: string | null;
        };
        if (cancelled) return;
        setUploadedMeta({
          filename: body.filename ?? "Attached file",
          mime: body.mime_type ?? null,
        });
      } catch {
        /* leave meta null — viewer will show fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Only file types the scan endpoint accepts. Everything else uploads
  // fine but skips the AI pass.
  const SCANNABLE_MIME = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "application/pdf",
  ]);

  async function runScan(fileId: string) {
    if (!onScanned) return;
    const ok = await consent.requestConsent("scan-document");
    if (!ok) return;
    setScanning(true);
    setScanNotice(null);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("fileId", fileId);
      fd.append("subcategoryId", subcategoryId);
      if (targetUserId) fd.append("targetUserId", targetUserId);
      const res = await fetch("/api/scan-document", { method: "POST", body: fd });
      const body = (await res.json().catch(() => ({}))) as {
        scan?: FileScanResult;
        error?: string;
      };
      if (!res.ok || !body.scan) {
        // Non-fatal — the file uploaded fine, just no AI prefill.
        setScanNotice(
          body.error === "unsupported_mime_type"
            ? "Scan skipped — that file type can't be read by AI."
            : "Scan didn't return anything. You can enter the details manually."
        );
        return;
      }
      onScanned(body.scan);
      const label =
        body.scan.confidence === "low"
          ? "Scanned — double-check the fields."
          : body.scan.confidence === "medium"
            ? "Scanned — review before saving."
            : "Scanned — review and save.";
      setScanNotice(label);
    } catch {
      setScanNotice(
        "Scan failed. You can still enter the details manually."
      );
    } finally {
      setScanning(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploading(true);
    setError(null);
    setScanNotice(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("subcategoryId", subcategoryId);
      // Duplicates within a per-entry file field are always fine — the
      // duplicate check is for the folder-wide Documents pile, not us.
      fd.append("allowDuplicate", "1");
      if (targetUserId) fd.append("targetUserId", targetUserId);
      if (instanceId) fd.append("instanceId", instanceId);
      const res = await fetch("/api/files", { method: "POST", body: fd });
      const body = (await res.json().catch(() => ({}))) as {
        file?: { id: string; filename: string; mime_type: string | null };
        error?: string;
      };
      if (!res.ok || !body.file) {
        throw new Error(body.error ?? "upload_failed");
      }
      setUploadedMeta({ filename: body.file.filename, mime: body.file.mime_type });
      onChange(body.file.id);
      // CSV files: parse client-side and hand back as a synthetic "Transactions"
      // field so the entry's transactions_json question gets populated.
      // Skips the AI scan entirely — CSVs are already structured.
      if (
        onScanned &&
        (body.file.mime_type === "text/csv" ||
          body.file.filename.toLowerCase().endsWith(".csv"))
      ) {
        try {
          const text = await file.text();
          const { headers, rows } = parseCsv(text);
          onScanned({
            title: body.file.filename.replace(/\.csv$/i, ""),
            fields: [
              {
                key: "transactions",
                label: "Transactions",
                type: "text",
                value: JSON.stringify({ headers, rows }),
              },
            ],
            expiryDate: null,
            notes: null,
            confidence: "high",
          });
          setScanNotice(`Loaded ${rows.length} transaction${rows.length === 1 ? "" : "s"} from the CSV.`);
        } catch {
          setScanNotice("Couldn't parse the CSV. Try again or paste it manually.");
        }
      } else if (
        onScanned &&
        body.file.mime_type &&
        SCANNABLE_MIME.has(body.file.mime_type)
      ) {
        // Auto-scan for AI prefill when configured and mime is supported.
        await runScan(body.file.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "upload_failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove() {
    const fileId = value;
    setUploadedMeta(null);
    setScanNotice(null);
    onChange("");
    // Fire-and-forget deletion of the underlying blob + row so the file
    // doesn't linger in the folder's Documents pile (or trip the duplicate
    // check on the next upload of the same filename).
    if (fileId) {
      void fetch(`/api/files/${encodeURIComponent(fileId)}`, {
        method: "DELETE",
      });
    }
  }

  const hasFile = value.length > 0;
  const busy = uploading || scanning;

  return (
    <div className="w-full">
      {hasFile ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-tal-line bg-white px-3 py-2">
          <div className="flex items-center gap-2 min-w-0 text-sm text-tal-plum">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            <FileViewerButton
              fileId={value}
              filename={uploadedMeta?.filename ?? "Attached file"}
              mimeType={uploadedMeta?.mime ?? null}
              title="View attached file"
              className="truncate text-tal-plum hover:underline"
            >
              {uploadedMeta?.filename ?? "View file"}
            </FileViewerButton>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {scanning && (
              <span className="inline-flex items-center gap-1.5 text-xs text-tal-plum-soft">
                <Spinner />
                Extracting…
              </span>
            )}
            {onScanned && !scanning && (
              <button
                type="button"
                onClick={() => runScan(value)}
                disabled={disabled}
                className="text-xs text-tal-plum hover:underline disabled:opacity-60"
                title="Re-run AI extraction on this file"
              >
                Rescan
              </button>
            )}
            <button
              type="button"
              onClick={remove}
              disabled={disabled || busy}
              className="text-xs text-red-700 hover:underline disabled:opacity-60"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label
          className={
            "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-black text-white text-sm font-medium cursor-pointer shadow-sm transition-all hover:bg-tal-plum hover:scale-105 " +
            (disabled || busy ? "opacity-70 cursor-not-allowed hover:scale-100" : "")
          }
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            aria-label={ariaLabel}
            disabled={disabled || busy}
            onChange={(e) => void handleFiles(e.target.files)}
          />
          {busy ? (
            <Spinner />
          ) : onScanned ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10M12 8v8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 4v12M6 10l6-6 6 6M4 20h16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          <span>
            {uploading
              ? "Uploading…"
              : scanning
                ? "Extracting fields with AI…"
                : onScanned
                  ? "Upload & scan a file"
                  : "Upload a file"}
          </span>
        </label>
      )}
      {scanning && hasFile && (
        <div className="mt-1 text-xs text-tal-plum-soft inline-flex items-center gap-1.5">
          <Spinner />
          Extracting fields with AI…
        </div>
      )}
      {scanNotice && (
        <div className="mt-1 text-xs text-tal-plum-soft">{scanNotice}</div>
      )}
      {error && (
        <div className="mt-1 text-xs text-red-700">
          Upload failed. Try again.
        </div>
      )}
      {consent.pendingKind && (
        <AiConsentGate
          kind={consent.pendingKind}
          onGranted={consent.onGranted}
          onCancel={consent.onCancel}
        />
      )}
    </div>
  );
}

// Minimal CSV parser. Handles double-quoted fields, escaped quotes, and
// commas inside quoted values. Newlines inside quoted values also work.
// First non-empty row is treated as the headers.
function parseCsv(input: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = input.replace(/\r\n?/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        cur.push(field);
        field = "";
      } else if (c === "\n") {
        cur.push(field);
        field = "";
        rows.push(cur);
        cur = [];
      } else {
        field += c;
      }
    }
  }
  // Flush trailing.
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  // Drop empty trailing rows.
  while (rows.length > 0 && rows[rows.length - 1].every((f) => f === "")) {
    rows.pop();
  }
  if (rows.length === 0) return { headers: [], rows: [] };
  const headers = rows.shift() ?? [];
  return { headers, rows };
}

// Small spinning circle. Uses currentColor so it inherits from parent
// text colour — matches the surrounding label/link.
function Spinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
