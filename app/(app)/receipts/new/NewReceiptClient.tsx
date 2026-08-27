"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RECEIPT_CATEGORIES } from "@/lib/services/receipt-scan";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { AiConsentGate } from "@/components/AiConsentGate";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { useAiConsent } from "@/hooks/useAiConsent";
import type { ReceiptStatus } from "@/lib/db/receipts";

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
  isRefund: boolean | null;
  warnings: string[];
};

interface DuplicateHit {
  id: string;
  supplier: string | null;
  amount: number;
  receipt_date: string;
}

type Mode = "choose" | "scanning" | "form" | "saving";

interface FormState {
  receiptDate: string;
  amount: string;
  isRefund: boolean;
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
  // Empty string forces an explicit choice before saving so we never file a
  // receipt without knowing whether it's personal or tax-relevant.
  status: ReceiptStatus | "";
}

const EMPTY_FORM: FormState = {
  receiptDate: "",
  amount: "",
  isRefund: false,
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
  status: "",
};

function scanToForm(scan: Scan): FormState {
  return {
    receiptDate: scan.receiptDate ?? "",
    // Always store amount as a positive string; isRefund flips the sign on save.
    amount: scan.amount != null ? String(Math.abs(scan.amount)) : "",
    isRefund: scan.isRefund === true,
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
    status: "",
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
  const [warnings, setWarnings] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateHit[]>([]);
  const [duplicateAck, setDuplicateAck] = useState(false);
  const [nullFields, setNullFields] = useState<string[]>([]);
  const isDirty =
    (mode === "form" || mode === "scanning") &&
    JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);
  const { markSaved } = useUnsavedChangesGuard(isDirty);
  const consent = useAiConsent();

  async function handleFile(f: File) {
    const ok = await consent.requestConsent("scan-receipt");
    if (!ok) return;
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
      const dups = (body.duplicates ?? []) as DuplicateHit[];
      setConfidence(scan.confidence);
      setWarnings(scan.warnings ?? []);
      setDuplicates(dups);
      setDuplicateAck(false);
      // Which core fields the AI couldn't read — the user must type these in.
      const missing: string[] = [];
      if (!scan.receiptDate) missing.push("Date");
      if (scan.amount == null) missing.push("Amount");
      if (!scan.supplier) missing.push("Supplier");
      setNullFields(missing);
      setForm(scanToForm(scan));
      setMode("form");
    } catch (e) {
      setError(e instanceof Error ? e.message : "scan_failed");
      setConfidence(null);
      setWarnings([]);
      setDuplicates([]);
      setDuplicateAck(false);
      setNullFields([]);
      setForm(EMPTY_FORM);
      setMode("form");
    }
  }

  function startManual() {
    setFile(null);
    setConfidence(null);
    setWarnings([]);
    setDuplicates([]);
    setDuplicateAck(false);
    setNullFields([]);
    setForm({
      ...EMPTY_FORM,
      receiptDate: new Date().toISOString().slice(0, 10),
    });
    setMode("form");
  }

  // Re-check for duplicates when the user edits date/supplier/amount in the
  // manual flow (or fixes what the AI got wrong). Debounced to 400ms.
  useEffect(() => {
    if (mode !== "form") return;
    const amt = parseFloat(form.amount);
    const canQuery =
      !!form.receiptDate && isFinite(amt) && amt !== 0;
    const t = setTimeout(async () => {
      if (!canQuery) {
        setDuplicates((prev) => (prev.length === 0 ? prev : []));
        return;
      }
      try {
        const res = await fetch("/api/receipts/check-duplicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receiptDate: form.receiptDate,
            amount: form.isRefund ? -Math.abs(amt) : Math.abs(amt),
            supplier: form.supplier || null,
          }),
        });
        if (!res.ok) return;
        const body = (await res.json()) as { duplicates: DuplicateHit[] };
        setDuplicates(body.duplicates ?? []);
        setDuplicateAck(false);
      } catch {
        // Non-fatal — the server still validates on save.
      }
    }, 400);
    return () => clearTimeout(t);
  }, [mode, form.receiptDate, form.amount, form.isRefund, form.supplier]);

  async function save() {
    setError(null);
    if (!form.receiptDate) {
      setError("Please enter the receipt date.");
      return;
    }
    const rawAmount = parseFloat(form.amount);
    if (!isFinite(rawAmount) || rawAmount === 0) {
      setError("Please enter a valid amount.");
      return;
    }
    const amount = form.isRefund
      ? -Math.abs(rawAmount)
      : Math.abs(rawAmount);
    if (!form.status) {
      setError(
        "Choose how to file this receipt: Needs checking, Personal, or Ready for accountant."
      );
      return;
    }
    if (duplicates.length > 0 && !duplicateAck) {
      setError(
        `Looks like a duplicate of an existing receipt. Tick "Save anyway" below to continue, or Start over to skip.`
      );
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
      fd.append("status", form.status);
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
      <>
      {consent.pendingKind && (
        <AiConsentGate
          kind={consent.pendingKind}
          onGranted={consent.onGranted}
          onCancel={consent.onCancel}
        />
      )}
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
      </>
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
      {confidence && <AiDisclaimer />}
      {(confidence === "low" || nullFields.length > 0) && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <div className="text-sm font-medium text-amber-900 mb-1">
            {confidence === "low"
              ? "Hard to read — please double-check everything"
              : "A few fields need your input"}
          </div>
          {nullFields.length > 0 && (
            <div className="text-xs text-amber-800">
              Missing: {nullFields.join(", ")}. Type them in below.
            </div>
          )}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">
          <div className="text-xs font-medium text-amber-900 mb-1 uppercase tracking-wider">
            Heads up
          </div>
          <ul className="text-sm text-amber-900 list-disc pl-4 space-y-0.5">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {duplicates.length > 0 && (
        <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3">
          <div className="text-sm font-medium text-rose-900 mb-1">
            Looks like a duplicate
          </div>
          <ul className="text-xs text-rose-800 space-y-0.5 mb-2">
            {duplicates.map((d) => (
              <li key={d.id}>
                {d.receipt_date} · {d.supplier ?? "Unknown"} ·{" "}
                {new Intl.NumberFormat("en-AU", {
                  style: "currency",
                  currency: "AUD",
                }).format(Number(d.amount))}
              </li>
            ))}
          </ul>
          <label className="flex items-center gap-2 text-xs text-rose-900">
            <input
              type="checkbox"
              checked={duplicateAck}
              onChange={(e) => setDuplicateAck(e.target.checked)}
              className="h-4 w-4"
            />
            Save anyway — this isn&apos;t a duplicate.
          </label>
        </div>
      )}

      {file && (
        <div className="mb-4 flex items-center gap-2 text-xs text-tal-plum-soft bg-tal-cream-soft/50 rounded-lg px-3 py-2">
          <span>🔒 Original image kept:</span>
          <span className="font-medium text-tal-plum">{file.name}</span>
          <span>({(file.size / 1024).toFixed(0)} KB)</span>
        </div>
      )}

      {confidence && (
        <p className="mb-4 text-xs text-tal-plum-soft">
          Please confirm date, supplier, amount and GST below before saving.
          The AI can misread; only you know what&apos;s right.
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
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              {form.isRefund && (
                <span
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-rose-700"
                  aria-hidden
                >
                  −
                </span>
              )}
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                className={`${inputCls} ${form.isRefund ? "pl-5 text-rose-700" : ""}`}
                placeholder="0.00"
              />
            </div>
            <label className="inline-flex items-center gap-1.5 text-xs text-tal-plum shrink-0">
              <input
                type="checkbox"
                checked={form.isRefund}
                onChange={(e) => set("isRefund", e.target.checked)}
                className="h-4 w-4"
              />
              Refund
            </label>
          </div>
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
        <Field label="How should we file this? *" className="sm:col-span-2">
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                {
                  v: "needs_checking",
                  label: "Needs checking",
                  hint: "Come back and confirm the details later.",
                },
                {
                  v: "personal",
                  label: "Personal / not for tax",
                  hint: "Just keeping the record. Excluded from tax totals.",
                },
                {
                  v: "ready",
                  label: "Ready for accountant",
                  hint: "Reviewed and business/tax-relevant.",
                },
              ] as const
            ).map((opt) => {
              const active = form.status === opt.v;
              return (
                <label
                  key={opt.v}
                  className={
                    "block cursor-pointer rounded-xl border p-3 transition " +
                    (active
                      ? "border-tal-plum bg-tal-cream-soft shadow-sm"
                      : "border-tal-line bg-white hover:bg-tal-cream-soft/50")
                  }
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="status"
                      className="mt-1 h-4 w-4"
                      checked={active}
                      onChange={() => set("status", opt.v)}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-tal-plum">
                        {opt.label}
                      </div>
                      <div className="text-xs text-tal-plum-soft mt-0.5">
                        {opt.hint}
                      </div>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          {form.status === "ready" && !form.workRelatedPercent && (
            <p className="mt-2 text-xs text-amber-800">
              Tip: enter a work-related % above so the potentially-deductible
              amount reflects your business use.
            </p>
          )}
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className={`${inputCls} h-20 resize-y`}
          />
        </Field>
      </div>

      <p className="mt-4 text-xs text-tal-plum-soft">
        Work-related % helps you and your accountant see what might be
        claimable. The Adulting Life doesn&apos;t give tax advice — always
        confirm deductibility with your accountant.
      </p>

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
            setWarnings([]);
            setDuplicates([]);
            setDuplicateAck(false);
            setNullFields([]);
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
