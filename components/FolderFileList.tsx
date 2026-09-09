"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileDownloadLink } from "@/components/FileDownloadLink";
import { FileViewerButton } from "@/components/FileViewerButton";
import { ShareButton } from "@/components/ShareButton";
import { writeScanPrefill } from "@/lib/scan-prefill";
import type { FileRow } from "@/lib/db/types";
import { truncateForRow } from "@/lib/ui/truncate";

interface Props {
  files: FileRow[];
  categoryId: string;
  subcategoryId: string;
  /** Optional short hint for what typically goes in this folder — shown in
   *  the empty state so users get an obvious "e.g. your ABN registration
   *  letter" prompt when they land on a blank folder. */
  folderName?: string;
}

// Short, plain-English examples of what typically lives in each folder.
// Shown in the empty-state so users have an obvious "aha, this is where I
// upload X" hint. Falls back to a category-level default below.
const EMPTY_HINTS: Record<string, string> = {
  // Personal
  "personal.birth_certificates":
    "Upload a scan or photo of the birth certificate itself.",
  "personal.marriage_certificate":
    "Upload a scan or photo of the marriage certificate.",
  "personal.passport_travel":
    "Passport photo page, visas, travel insurance certificates.",
  "personal.drivers_licence":
    "Photo of the front and back of the licence.",
  "personal.will_funeral":
    "Signed will, funeral directives, executor notes.",
  "personal.power_of_attorney":
    "Signed Power of Attorney document(s).",
  "personal.advanced_health_directive":
    "Signed Advance Health Directive.",
  "personal.electoral_roll":
    "Electoral enrolment confirmation letter or screenshot.",
  "personal.tax_file_number":
    "TFN letter from the ATO. Consider redacting the number itself before uploading.",
  "personal.abn":
    "ABN registration confirmation letter or the ABR extract.",
  "personal.copies_of_licences":
    "Photos of any other licences and ID cards (student ID, seniors card, working with children, etc.).",
  "personal.home_rates_rent":
    "Council rates notice, lease agreement, mortgage statement.",
  // Health
  "health.medicare":
    "Photo of your Medicare card (front).",
  "health.health_insurance":
    "Policy documents, member cards, claim receipts.",
  "health.immunisations":
    "Immunisation history statement from MyGov / Medicare.",
  "health.blood_tests":
    "Pathology / blood test results.",
  "health.dental_records":
    "X-rays, treatment plans, invoices.",
  "health.hospital_discharge":
    "Discharge summary and any related paperwork.",
  "health.concession_cards":
    "Photo of the front and back of any concession or pension card.",
  // Education
  "education.qualifications":
    "Certificates, diplomas, transcripts, statements of attainment.",
  // Employment
  "employment.employment_contract":
    "Signed employment contract or letter of offer.",
  "employment.pay_history":
    "Payslips, PAYG summaries, group certificates.",
  "employment.super":
    "Super fund welcome letter, latest statement, member number.",
  // Admin
  "admin.bank_statements":
    "PDF or photo of monthly bank statements.",
  "admin.loan_statements":
    "Home loan, car loan, personal loan statements.",
  "admin.insurances":
    "Home, contents, car, income protection policy schedules.",
  "admin.utility_bills":
    "Electricity, gas, water, internet, phone bills.",
  "admin.invoices_jul_jun":
    "Receipts and invoices for tax time. Tip: use the Receipts area for individual receipts — this folder is for anything else.",
};

const CATEGORY_FALLBACK_HINT: Record<string, string> = {
  personal: "Upload any documents that relate to this folder (scans, photos, PDFs).",
  health: "Upload any health-related documents (test results, referrals, policy docs).",
  education: "Upload certificates, transcripts, or enrolment paperwork.",
  employment: "Upload contracts, payslips, or work-related documents.",
  admin: "Upload statements, bills, receipts, or any relevant paperwork.",
};

function emptyStateHint(
  subcategoryId: string,
  categoryId: string
): string {
  return (
    EMPTY_HINTS[subcategoryId] ??
    CATEGORY_FALLBACK_HINT[categoryId] ??
    "Upload any documents that relate to this folder."
  );
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
      <div className="rounded-2xl border border-dashed border-tal-line bg-white p-6 flex items-start gap-3">
        <span
          aria-hidden
          className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-tal-cream-soft text-tal-plum"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3v13M8 7l4-4 4 4"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M6 12v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium text-tal-plum">
            No documents uploaded to this folder yet.
          </div>
          <div className="text-xs text-tal-plum-soft mt-1 leading-relaxed">
            {emptyStateHint(subcategoryId, categoryId)}
          </div>
        </div>
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
                <div className="min-w-0 flex-1">
                  <FileViewerButton
                    fileId={f.id}
                    filename={f.filename}
                    mimeType={f.mime_type}
                    title={f.filename}
                    className="font-medium text-left text-tal-plum hover:underline disabled:opacity-60 break-all"
                  >
                    {truncateForRow(f.filename, 40)}
                  </FileViewerButton>
                  <div className="text-xs text-tal-plum-soft">
                    {new Date(f.created_at).toLocaleDateString("en-AU")}
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
                <ShareButton
                  subcategoryId={subcategoryId}
                  itemKind="file"
                  itemId={f.id}
                  itemLabel={f.filename}
                  variant="icon"
                />
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
