"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

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

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

// Maps common label variants (lowercased, punctuation stripped) to the
// page_questions.id for the drivers_licence page group. Order matters for
// the first-match wins mapping.
const LABEL_TO_QUESTION: Array<[RegExp, string]> = [
  [/licence.*(no|number|crn)/, "drivers_licence.licence_no"],
  [/\bcrn\b/, "drivers_licence.licence_no"],
  [/(sur|last).*(name)/, "drivers_licence.surname"],
  [/^surname$/, "drivers_licence.surname"],
  [/(given|first|middle).*(name)/, "drivers_licence.given_names"],
  [/date.*birth|\bdob\b/, "drivers_licence.date_of_birth"],
  [/^class$/, "drivers_licence.class"],
  [/^type$/, "drivers_licence.type"],
  [/effective|issue.*date|issued/, "drivers_licence.effective_date"],
  [/expiry|expires|valid.*until/, "drivers_licence.expiry_date"],
  [/condition/, "drivers_licence.conditions"],
  [/address/, "drivers_licence.address"],
  [/card.*number|card no/, "drivers_licence.card_number"],
];

function mapLabelToQuestionId(label: string): string | null {
  const norm = label.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  for (const [rx, qid] of LABEL_TO_QUESTION) {
    if (rx.test(norm)) return qid;
  }
  return null;
}

interface Props {
  subcategoryId: string;
  pageGroup: string;
  targetUserId?: string;
}

export function ScanLicenceButton({ subcategoryId, pageGroup, targetUserId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [awaitingBack, setAwaitingBack] = useState(false);
  const [frontId, setFrontId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function start() {
    setError(null);
    setStatus(null);
    setAwaitingBack(false);
    setFrontId(null);
    setTimeout(() => inputRef.current?.click(), 0);
  }

  async function uploadFile(file: File): Promise<FileResponse["file"]> {
    const form = new FormData();
    form.append("file", file);
    form.append("subcategoryId", subcategoryId);
    form.append("allowDuplicate", "1");
    if (targetUserId) form.append("targetUserId", targetUserId);
    const res = await fetch("/api/files", { method: "POST", body: form });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? "upload_failed");
    }
    const { file: uploaded } = (await res.json()) as FileResponse;
    return uploaded;
  }

  async function runScan(fileIds: string[]) {
    setStatus("Extracting fields with AI…");
    const form = new FormData();
    for (const id of fileIds) form.append("fileId", id);
    form.append("subcategoryId", subcategoryId);
    if (targetUserId) form.append("targetUserId", targetUserId);
    const res = await fetch("/api/scan-document", { method: "POST", body: form });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? "scan_failed");
    }
    const { scan } = (await res.json()) as ScanResponse;

    // Map extracted labels to page-form question IDs.
    const answers: Record<string, string> = {};
    for (const f of scan.fields) {
      const qid = mapLabelToQuestionId(f.label);
      if (qid && f.value) answers[qid] = f.value;
    }
    // Expiry may only come through in scan.expiryDate.
    if (scan.expiryDate && !answers["drivers_licence.expiry_date"]) {
      answers["drivers_licence.expiry_date"] = scan.expiryDate;
    }

    if (Object.keys(answers).length === 0) {
      throw new Error("nothing_extracted");
    }

    setStatus("Saving answers…");
    const saveRes = await fetch(`/api/page-form/${pageGroup}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers,
        targetUserId: targetUserId ?? undefined,
      }),
    });
    if (!saveRes.ok) {
      const j = (await saveRes.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? "save_failed");
    }

    router.refresh();
  }

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      if (!frontId) {
        setStatus("Uploading front of card…");
        const uploaded = await uploadFile(file);
        setFrontId(uploaded.id);
        setAwaitingBack(true);
        setStatus(null);
        setBusy(false);
        setTimeout(() => inputRef.current?.click(), 0);
        return;
      }

      setStatus("Uploading back of card…");
      const back = await uploadFile(file);
      await runScan([frontId, back.id]);
      setBusy(false);
      setStatus(null);
      setAwaitingBack(false);
      setFrontId(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(
        msg === "unsupported_mime_type"
          ? "That file type isn't supported. Try JPEG or PNG."
          : msg === "file_too_large"
            ? "That photo is too large (max 20MB)."
            : msg === "nothing_extracted"
              ? "Couldn't read the card. Try again in better light."
              : "Something went wrong. Try again."
      );
      setStatus(null);
      setBusy(false);
      setAwaitingBack(false);
      setFrontId(null);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="h-9 px-3 rounded-xl bg-white text-tal-plum text-sm font-medium hover:shadow-sm inline-flex items-center gap-1.5 disabled:opacity-60"
      >
        {busy ? (
          <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-tal-plum/30 border-t-tal-plum animate-spin" />
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 8h3l2-3h6l2 3h3v11H4V8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        )}
        {busy ? (status ?? "Working…") : awaitingBack ? "Take back photo" : "Scan card"}
      </button>
      {error && (
        <div className="w-full mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </div>
      )}
    </>
  );
}
