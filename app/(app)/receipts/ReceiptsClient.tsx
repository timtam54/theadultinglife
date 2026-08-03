"use client";

import { GuardedLink as Link } from "@/components/GuardedLink";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ReceiptRow } from "@/lib/db/receipts";
import type { CategoryTotal } from "@/lib/services/receipts";

function formatFyLabel(financialYear: string): string {
  const match = financialYear.match(/^(\d{4})-(\d{4})$/);
  if (!match) return financialYear;
  return `${match[1]}–${match[2].slice(2)}`;
}

function formatFyRange(financialYear: string): string {
  const match = financialYear.match(/^(\d{4})-(\d{4})$/);
  if (!match) return financialYear;
  return `1 Jul ${match[1]} – 30 Jun ${match[2]}`;
}

const MONTHS = [
  { n: 7, label: "July" },
  { n: 8, label: "August" },
  { n: 9, label: "September" },
  { n: 10, label: "October" },
  { n: 11, label: "November" },
  { n: 12, label: "December" },
  { n: 1, label: "January" },
  { n: 2, label: "February" },
  { n: 3, label: "March" },
  { n: 4, label: "April" },
  { n: 5, label: "May" },
  { n: 6, label: "June" },
];

function monthLabel(m: number): string {
  return MONTHS.find((x) => x.n === m)?.label ?? String(m);
}

function currency(n: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(n);
}

interface Props {
  receipts: ReceiptRow[];
  rollup: {
    categories: CategoryTotal[];
    total: number;
    deductibleTotal: number;
  };
  financialYear: string;
  month: number | null;
  availableYears: string[];
}

export function ReceiptsClient({
  receipts,
  rollup,
  financialYear,
  month,
  availableYears,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [emailOpen, setEmailOpen] = useState(false);
  const [toEmail, setToEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [busyDelete, setBusyDelete] = useState<string | null>(null);

  const monthCounts = useMemo(() => {
    const map = new Map<number, number>();
    for (const r of receipts) {
      map.set(r.month, (map.get(r.month) ?? 0) + 1);
    }
    return map;
  }, [receipts]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(receipts.map((r) => r.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function sendEmail() {
    if (selected.size === 0 || !toEmail.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/receipts/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptIds: Array.from(selected),
          toEmail: toEmail.trim(),
          message: message.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error ?? "email_failed");
      }
      if (body.stubbed) {
        setSendResult(
          `Prepared ${body.attached} receipt(s). SMTP not configured on this server — email was not actually sent (dev mode).`
        );
      } else {
        setSendResult(
          `Sent ${body.attached} receipt(s) to ${toEmail.trim()}.`
        );
        setSelected(new Set());
      }
    } catch (e) {
      setSendResult(e instanceof Error ? e.message : "email_failed");
    } finally {
      setSending(false);
    }
  }

  async function deleteReceipt(id: string) {
    if (!confirm("Delete this receipt? This cannot be undone.")) return;
    setBusyDelete(id);
    try {
      const res = await fetch(`/api/receipts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete_failed");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "delete_failed");
    } finally {
      setBusyDelete(null);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-sm mb-3 flex-wrap">
        <Link
          href="/dashboard"
          className="text-tal-plum-soft hover:text-tal-plum transition-colors"
        >
          Dashboard
        </Link>
        <span className="text-tal-plum-soft/50" aria-hidden>
          /
        </span>
        <span className="text-tal-plum-soft">Receipts</span>
      </div>

      <div className="rounded-2xl bg-black text-white px-6 py-4 mb-6 shadow-md">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 shrink-0"
              aria-hidden
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 8h3l2-3h6l2 3h3v11H4V8Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <circle
                  cx="12"
                  cy="13"
                  r="3.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
              </svg>
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-2xl leading-tight">
                Receipt Register
              </h1>
              <p className="text-sm text-white/80 mt-1 max-w-xl">
                Photograph or upload a receipt and check the details. Use the
                Full financial year view to review or export your register.
              </p>
            </div>
          </div>
          <Link
            href="/receipts/new"
            className="h-10 px-4 rounded-xl bg-white text-tal-plum text-sm font-medium hover:bg-white/90 flex items-center gap-2 shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Add receipt
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <label className="text-sm text-tal-plum-soft">Financial year</label>
        <select
          value={financialYear}
          onChange={(e) => {
            const params = new URLSearchParams();
            params.set("fy", e.target.value);
            if (month) params.set("month", String(month));
            router.push(`/receipts?${params.toString()}`);
          }}
          className="h-9 px-3 rounded-xl border border-tal-line bg-white text-sm text-tal-plum"
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>
              {formatFyLabel(y)}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams();
              params.set("fy", financialYear);
              router.push(`/receipts?${params.toString()}`);
            }}
            title={formatFyRange(financialYear)}
            className={`h-8 px-3 rounded-full text-xs border ${
              month === null
                ? "bg-black text-white border-black"
                : "border-tal-line bg-white text-tal-plum hover:bg-tal-cream-soft"
            }`}
          >
            Full financial year
          </button>
          {MONTHS.map((m) => {
            const count = monthCounts.get(m.n) ?? 0;
            const active = month === m.n;
            return (
              <button
                key={m.n}
                type="button"
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set("fy", financialYear);
                  params.set("month", String(m.n));
                  router.push(`/receipts?${params.toString()}`);
                }}
                className={`h-8 px-3 rounded-full text-xs border ${
                  active
                    ? "bg-black text-white border-black"
                    : "border-tal-line bg-white text-tal-plum hover:bg-tal-cream-soft"
                }`}
              >
                {m.label}
                {count > 0 && (
                  <span
                    className={`ml-1 ${
                      active ? "text-white/80" : "text-tal-plum-soft"
                    }`}
                  >
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <div className="rounded-2xl border border-tal-line bg-white p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <div className="text-sm text-tal-plum-soft">
                {receipts.length} receipt{receipts.length === 1 ? "" : "s"} —{" "}
                {month ? monthLabel(month) : "full financial year"}
              </div>
              <div className="flex items-center gap-2">
                {selected.size > 0 && (
                  <>
                    <span className="text-sm text-tal-plum">
                      {selected.size} selected
                    </span>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="h-8 px-3 rounded-lg text-xs border border-tal-line bg-white text-tal-plum hover:bg-tal-cream-soft"
                    >
                      Clear
                    </button>
                  </>
                )}
                {receipts.length > 0 && (
                  <button
                    type="button"
                    onClick={selectAll}
                    className="h-8 px-3 rounded-lg text-xs border border-tal-line bg-white text-tal-plum hover:bg-tal-cream-soft"
                  >
                    Select all
                  </button>
                )}
                <button
                  type="button"
                  disabled={selected.size === 0}
                  onClick={() => setEmailOpen((v) => !v)}
                  className="h-8 px-3 rounded-lg text-xs bg-black text-white hover:bg-black/85 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Email selected
                </button>
              </div>
            </div>

            {emailOpen && selected.size > 0 && (
              <div className="mb-4 p-3 rounded-xl border border-tal-line bg-tal-cream-soft/40 space-y-2">
                <div className="text-xs text-tal-plum-soft">
                  Sends a CSV register plus each attached receipt file to the
                  address below.
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    placeholder="accountant@example.com"
                    className="flex-1 h-9 px-3 rounded-xl border border-tal-line bg-white text-sm text-tal-plum"
                  />
                  <button
                    type="button"
                    onClick={sendEmail}
                    disabled={sending || !toEmail.trim()}
                    className="h-9 px-4 rounded-xl bg-black text-white text-sm font-medium hover:bg-black/85 disabled:opacity-60"
                  >
                    {sending ? "Sending…" : `Send ${selected.size} receipt${selected.size === 1 ? "" : "s"}`}
                  </button>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Optional note to include with the email…"
                  className="w-full h-16 px-3 py-2 rounded-xl border border-tal-line bg-white text-sm text-tal-plum resize-y"
                />
                {sendResult && (
                  <div className="text-sm text-tal-plum">{sendResult}</div>
                )}
              </div>
            )}

            {receipts.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-tal-plum-soft mb-3">
                  No receipts yet for this{" "}
                  {month ? "month" : "financial year"}.
                </p>
                <Link
                  href="/receipts/new"
                  className="inline-block h-9 px-4 rounded-xl bg-black text-white text-sm font-medium hover:bg-black/85 leading-9"
                >
                  Add your first receipt
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-tal-line">
                {receipts.map((r) => {
                  const isChecked = selected.has(r.id);
                  return (
                    <li key={r.id} className="py-3 flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(r.id)}
                        className="mt-1 h-4 w-4"
                        aria-label="Select receipt"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-medium text-tal-plum truncate">
                            {r.supplier ?? "Unknown supplier"}
                          </span>
                          {r.category && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-tal-cream-soft text-tal-plum-soft">
                              {r.category}
                            </span>
                          )}
                          {r.ai_confidence && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wide ${
                                r.ai_confidence === "high"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : r.ai_confidence === "medium"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-red-100 text-red-800"
                              }`}
                              title={`AI confidence: ${r.ai_confidence}`}
                            >
                              AI {r.ai_confidence}
                            </span>
                          )}
                          {r.file_path && (
                            <span
                              className="text-[10px] text-tal-plum-soft"
                              title="Receipt image/PDF attached"
                            >
                              📎
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-tal-plum-soft mt-0.5">
                          {r.receipt_date} · {monthLabel(r.month)}{" "}
                          {r.payment_method ? `· ${r.payment_method}` : ""}
                        </div>
                        {r.description && (
                          <div className="text-sm text-tal-plum-soft mt-1 truncate">
                            {r.description}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-medium text-tal-plum">
                          {currency(Number(r.amount))}
                        </div>
                        {Number(r.deductible_amount) > 0 && (
                          <div className="text-xs text-emerald-700">
                            {currency(Number(r.deductible_amount))} deductible
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteReceipt(r.id)}
                          disabled={busyDelete === r.id}
                          className="text-[10px] text-red-600 hover:underline mt-1 disabled:opacity-50"
                        >
                          {busyDelete === r.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-tal-line bg-white p-4">
            <h2 className="font-display text-lg text-tal-plum mb-2">
              Totals
            </h2>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm text-tal-plum-soft">Total spent</span>
              <span className="font-medium text-tal-plum">
                {currency(rollup.total)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-tal-plum-soft">
                Deductible total
              </span>
              <span className="font-medium text-emerald-700">
                {currency(rollup.deductibleTotal)}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-tal-line bg-white p-4">
            <h2 className="font-display text-lg text-tal-plum mb-2">
              By category
            </h2>
            {rollup.categories.length === 0 ? (
              <p className="text-sm text-tal-plum-soft">Nothing to show yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {rollup.categories.map((c) => (
                  <li
                    key={c.category}
                    className="flex items-baseline justify-between text-sm"
                  >
                    <span className="text-tal-plum">{c.category}</span>
                    <span className="text-tal-plum-soft">
                      {currency(c.total)}{" "}
                      <span className="text-xs">({c.count})</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
