"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RECEIPT_CATEGORIES } from "@/lib/services/receipt-scan";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";

type Scan = {
  supplier: string | null;
  abn: string | null;
  description: string | null;
  category: string | null;
  receiptDate: string | null;
  amount: number | null;
  gstAmount: number | null;
  gstClaimable: boolean | null;
  paymentMethod: string | null;
  invoiceNumber: string | null;
  confidence: "high" | "medium" | "low";
};

type Mode = "choose" | "scanning" | "form" | "saving";

interface FormState {
  receiptDate: string;
  amount: string;
  supplier: string;
  abn: string;
  description: string;
  category: string;
  businessPurpose: string;
  gstAmount: string;
  gstClaimable: "" | "yes" | "no";
  paymentMethod: string;
  invoiceNumber: string;
  isAsset: boolean;
  workRelatedPercent: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  receiptDate: "",
  amount: "",
  supplier: "",
  abn: "",
  description: "",
  category: "",
  businessPurpose: "",
  gstAmount: "",
  gstClaimable: "",
  paymentMethod: "",
  invoiceNumber: "",
  isAsset: false,
  workRelatedPercent: "",
  notes: "",
};

function scanToForm(scan: Scan): FormState {
  return {
    receiptDate: scan.receiptDate ?? "",
    amount: scan.amount != null ? String(scan.amount) : "",
    supplier: scan.supplier ?? "",
    abn: scan.abn ?? "",
    description: scan.description ?? "",
    category: scan.category ?? "",
    businessPurpose: "",
    gstAmount: scan.gstAmount != null ? String(scan.gstAmount) : "",
    gstClaimable:
      scan.gstClaimable === null ? "" : scan.gstClaimable ? "yes" : "no",
    paymentMethod: scan.paymentMethod ?? "",
    invoiceNumber: scan.invoiceNumber ?? "",
    isAsset: false,
    workRelatedPercent: "",
    notes: "",
  };
}

export function NewReceiptClient() {
  const router = useRouter();
  const scanInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("choose");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [confidence, setConfidence] = useState<Scan["confidence"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isDirty =
    (mode === "form" || mode === "scanning") &&
    JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);
  const { markSaved } = useUnsavedChangesGuard(isDirty);

  async function handleFile(f: File) {
    setError(null);
    setFile(f);
    setMode("scanning");
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/receipts/scan", {
        method: "POST",
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error ?? "scan_failed");
      }
      const scan = body.scan as Scan;
      setConfidence(scan.confidence);
      setForm(scanToForm(scan));
      setMode("form");
    } catch (e) {
      setError(e instanceof Error ? e.message : "scan_failed");
      setConfidence(null);
      setForm(EMPTY_FORM);
      setMode("form");
    }
  }

  function startManual() {
    setFile(null);
    setConfidence(null);
    setForm({
      ...EMPTY_FORM,
      receiptDate: new Date().toISOString().slice(0, 10),
    });
    setMode("form");
  }

  async function save() {
    setError(null);
    if (!form.receiptDate) {
      setError("Please enter the receipt date.");
      return;
    }
    const amount = parseFloat(form.amount);
    if (!isFinite(amount) || amount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    setMode("saving");
    try {
      const fd = new FormData();
      fd.append("receiptDate", form.receiptDate);
      fd.append("amount", String(amount));
      if (form.supplier) fd.append("supplier", form.supplier);
      if (form.abn) fd.append("abn", form.abn);
      if (form.description) fd.append("description", form.description);
      if (form.category) fd.append("category", form.category);
      if (form.businessPurpose)
        fd.append("businessPurpose", form.businessPurpose);
      if (form.gstAmount) fd.append("gstAmount", form.gstAmount);
      if (form.gstClaimable)
        fd.append(
          "gstClaimable",
          form.gstClaimable === "yes" ? "true" : "false"
        );
      if (form.paymentMethod) fd.append("paymentMethod", form.paymentMethod);
      if (form.invoiceNumber) fd.append("invoiceNumber", form.invoiceNumber);
      if (form.isAsset) fd.append("isAsset", "true");
      if (form.workRelatedPercent)
        fd.append("workRelatedPercent", form.workRelatedPercent);
      if (form.notes) fd.append("notes", form.notes);
      if (confidence) fd.append("aiConfidence", confidence);
      if (file) fd.append("file", file);

      const res = await fetch("/api/receipts", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "save_failed");
      markSaved();
      router.push("/receipts");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "save_failed");
      setMode("form");
    }
  }

  if (mode === "choose") {
    return (
      <div className="rounded-2xl border border-tal-line bg-white p-6">
        <h1 className="font-display text-2xl text-tal-plum mb-2">
          Add a receipt
        </h1>
        <p className="text-sm text-tal-plum-soft mb-6 max-w-lg">
          Snap a photo or upload a PDF and AI will fill in supplier, date,
          amount, GST and category for you. You confirm before saving.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => scanInputRef.current?.click()}
            className="flex-1 h-32 rounded-2xl border-2 border-dashed border-tal-line bg-tal-cream-soft/40 hover:bg-tal-cream-soft text-tal-plum flex flex-col items-center justify-center gap-2"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 8h3l2-3h6l2 3h3v11H4V8Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            <span className="font-medium">Take a photo</span>
            <span className="text-xs text-tal-plum-soft">Use camera</span>
          </button>

          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            className="flex-1 h-32 rounded-2xl border-2 border-dashed border-tal-line bg-tal-cream-soft/40 hover:bg-tal-cream-soft text-tal-plum flex flex-col items-center justify-center gap-2"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 4v11m0 0l-4-4m4 4l4-4M4 19h16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-medium">Upload a file</span>
            <span className="text-xs text-tal-plum-soft">Image or PDF</span>
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={startManual}
            className="text-sm text-tal-plum-soft hover:text-tal-plum hover:underline"
          >
            Skip AI and enter manually
          </button>
        </div>

        <input
          ref={scanInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />

        {error && (
          <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (mode === "scanning") {
    return (
      <div className="rounded-2xl border border-tal-line bg-white p-8 text-center">
        <div className="animate-pulse text-tal-plum mb-2">
          Reading your receipt…
        </div>
        <p className="text-sm text-tal-plum-soft">
          This usually takes a few seconds.
        </p>
      </div>
    );
  }

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="rounded-2xl border border-tal-line bg-white p-6">
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
        <h1 className="font-display text-2xl text-tal-plum">
          Confirm receipt details
        </h1>
        {confidence && (
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide ${
              confidence === "high"
                ? "bg-emerald-100 text-emerald-800"
                : confidence === "medium"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-red-100 text-red-800"
            }`}
          >
            AI confidence: {confidence}
          </span>
        )}
      </div>
      {confidence === "low" && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          The AI wasn&apos;t sure about some fields — please double-check
          everything before saving.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Date *">
          <input
            type="date"
            value={form.receiptDate}
            onChange={(e) => set("receiptDate", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Amount (incl. GST) *">
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Supplier">
          <input
            type="text"
            value={form.supplier}
            onChange={(e) => set("supplier", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="ABN">
          <input
            type="text"
            value={form.abn}
            onChange={(e) => set("abn", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Description">
          <input
            type="text"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Category">
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            className={inputCls}
          >
            <option value="">— Choose —</option>
            {RECEIPT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="GST amount">
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.gstAmount}
            onChange={(e) => set("gstAmount", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="GST claimable">
          <select
            value={form.gstClaimable}
            onChange={(e) =>
              set("gstClaimable", e.target.value as FormState["gstClaimable"])
            }
            className={inputCls}
          >
            <option value="">— n/a —</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>
        <Field label="Payment method">
          <input
            type="text"
            value={form.paymentMethod}
            onChange={(e) => set("paymentMethod", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Invoice / receipt no.">
          <input
            type="text"
            value={form.invoiceNumber}
            onChange={(e) => set("invoiceNumber", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Business purpose">
          <input
            type="text"
            value={form.businessPurpose}
            onChange={(e) => set("businessPurpose", e.target.value)}
            className={inputCls}
            placeholder="e.g. Client lunch, home office supplies"
          />
        </Field>
        <Field label="Work-related %">
          <input
            type="number"
            min="0"
            max="100"
            value={form.workRelatedPercent}
            onChange={(e) => set("workRelatedPercent", e.target.value)}
            className={inputCls}
            placeholder="0–100"
          />
        </Field>
        <Field label="Asset?" className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-tal-plum">
            <input
              type="checkbox"
              checked={form.isAsset}
              onChange={(e) => set("isAsset", e.target.checked)}
              className="h-4 w-4"
            />
            <span>Yes, this is a depreciating asset</span>
          </label>
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className={`${inputCls} h-20 resize-y`}
          />
        </Field>
      </div>

      {file && (
        <div className="mt-4 text-xs text-tal-plum-soft">
          📎 Attached: <span className="font-medium">{file.name}</span> (
          {(file.size / 1024).toFixed(0)} KB)
        </div>
      )}

      {error && (
        <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="mt-6 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("choose");
            setForm(EMPTY_FORM);
            setFile(null);
            setConfidence(null);
            setError(null);
          }}
          className="h-10 px-4 rounded-xl border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft"
        >
          Start over
        </button>
        <button
          type="button"
          onClick={save}
          disabled={mode === "saving"}
          className="h-10 px-4 rounded-xl bg-black text-white text-sm font-medium hover:bg-black/85 disabled:opacity-60"
        >
          {mode === "saving" ? "Saving…" : "Save receipt"}
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full h-9 px-3 rounded-xl border border-tal-line bg-white text-sm text-tal-plum";

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="block text-xs text-tal-plum-soft mb-1">{label}</span>
      {children}
    </label>
  );
}
