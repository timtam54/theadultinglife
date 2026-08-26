"use client";

import { useEffect, useState } from "react";
import { RECEIPT_CATEGORIES } from "@/lib/services/receipt-scan";
import type { ReceiptRow, ReceiptStatus } from "@/lib/db/receipts";

interface Props {
  receipt: ReceiptRow;
  onClose: () => void;
  onSaved: (updated: ReceiptRow) => void;
}

interface FormState {
  receiptDate: string;
  amount: string;
  isRefund: boolean;
  supplier: string;
  abn: string;
  description: string;
  category: string;
  gstAmount: string;
  gstClaimable: "" | "yes" | "no";
  paymentMethod: string;
  invoiceNumber: string;
  businessPurpose: string;
  workRelatedPercent: string;
  isAsset: boolean;
  notes: string;
  status: ReceiptStatus;
}

function toForm(r: ReceiptRow): FormState {
  const amt = Number(r.amount);
  return {
    receiptDate: r.receipt_date,
    amount: Math.abs(amt).toString(),
    isRefund: amt < 0,
    supplier: r.supplier ?? "",
    abn: r.abn ?? "",
    description: r.description ?? "",
    category: r.category ?? "",
    gstAmount: r.gst_amount == null ? "" : String(r.gst_amount),
    gstClaimable:
      r.gst_claimable == null ? "" : r.gst_claimable ? "yes" : "no",
    paymentMethod: r.payment_method ?? "",
    invoiceNumber: r.invoice_number ?? "",
    businessPurpose: r.business_purpose ?? "",
    workRelatedPercent:
      r.work_related_percent == null ? "" : String(r.work_related_percent),
    isAsset: Boolean(r.is_asset),
    notes: r.notes ?? "",
    status: r.status,
  };
}

const inputCls =
  "w-full h-10 rounded-xl border border-tal-line px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tal-plum/40";

export function EditReceiptModal({ receipt, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(() => toForm(receipt));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [saving, onClose]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function save() {
    setError(null);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.receiptDate)) {
      setError("Date must be in YYYY-MM-DD format.");
      return;
    }
    const amountNum = Number(form.amount);
    if (!Number.isFinite(amountNum) || amountNum === 0) {
      setError("Amount is required.");
      return;
    }
    const signedAmount = form.isRefund ? -Math.abs(amountNum) : Math.abs(amountNum);
    const gstNum = form.gstAmount === "" ? null : Number(form.gstAmount);
    if (gstNum !== null && !Number.isFinite(gstNum)) {
      setError("GST amount must be a number.");
      return;
    }
    const workPctNum =
      form.workRelatedPercent === "" ? null : Number(form.workRelatedPercent);
    if (
      workPctNum !== null &&
      (!Number.isFinite(workPctNum) || workPctNum < 0 || workPctNum > 100)
    ) {
      setError("Work-related % must be between 0 and 100.");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        receiptDate: form.receiptDate,
        amount: signedAmount,
        supplier: form.supplier.trim() || null,
        abn: form.abn.trim() || null,
        description: form.description.trim() || null,
        category: form.category || null,
        gstAmount: gstNum,
        gstClaimable:
          form.gstClaimable === "" ? null : form.gstClaimable === "yes",
        paymentMethod: form.paymentMethod.trim() || null,
        invoiceNumber: form.invoiceNumber.trim() || null,
        businessPurpose: form.businessPurpose.trim() || null,
        workRelatedPercent: workPctNum,
        isAsset: form.isAsset,
        notes: form.notes.trim() || null,
        status: form.status,
      };

      const res = await fetch(`/api/receipts/${receipt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        receipt?: ReceiptRow;
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.receipt) {
        throw new Error(data.message ?? data.error ?? "save_failed");
      }
      onSaved(data.receipt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "save_failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
      onClick={saving ? undefined : onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-lg relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          aria-label="Close"
          className="absolute top-3 right-3 h-8 w-8 rounded-full text-tal-plum-soft hover:bg-tal-cream-soft hover:text-tal-plum flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <h3 className="font-display text-lg text-tal-plum mb-1 pr-8">
          Edit receipt
        </h3>
        <p className="text-xs text-tal-plum-soft mb-4">
          Changes are saved to your Sydney database. Attached image (if any)
          stays as-is.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Date">
            <input
              type="date"
              value={form.receiptDate}
              onChange={(e) => set("receiptDate", e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Amount (incl. GST)">
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

          <Field label="Description" className="sm:col-span-2">
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

          <Field label="Payment method">
            <input
              type="text"
              value={form.paymentMethod}
              onChange={(e) => set("paymentMethod", e.target.value)}
              className={inputCls}
            />
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
                set(
                  "gstClaimable",
                  e.target.value as FormState["gstClaimable"]
                )
              }
              className={inputCls}
            >
              <option value="">— n/a —</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </Field>

          <Field label="Invoice / receipt no.">
            <input
              type="text"
              value={form.invoiceNumber}
              onChange={(e) => set("invoiceNumber", e.target.value)}
              className={inputCls}
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

          <Field label="Business purpose" className="sm:col-span-2">
            <input
              type="text"
              value={form.businessPurpose}
              onChange={(e) => set("businessPurpose", e.target.value)}
              className={inputCls}
              placeholder="e.g. Client lunch, home office supplies"
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
              rows={3}
              className="w-full rounded-xl border border-tal-line px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tal-plum/40"
            />
          </Field>

          <Field label="Status" className="sm:col-span-2">
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as ReceiptStatus)}
              className={inputCls}
            >
              <option value="needs_checking">Needs checking</option>
              <option value="personal">Personal / not for tax</option>
              <option value="ready">Ready for accountant</option>
            </select>
          </Field>
        </div>

        {error && (
          <div className="mt-4 p-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 px-4 rounded-xl text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="h-10 px-5 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={"block " + (className ?? "")}>
      <span className="block text-[10px] uppercase tracking-widest text-tal-plum-soft mb-1 font-medium">
        {label}
      </span>
      {children}
    </label>
  );
}
