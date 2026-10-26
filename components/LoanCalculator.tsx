"use client";

import { useState } from "react";
import {
  LOAN_ESTIMATE_NOTE,
  describeDuration,
  payoffEstimate,
  repaymentFor,
  type RepaymentFrequency,
} from "@/lib/loan-math";
import { startPrefilledEntry } from "@/lib/form-events";

// Loan calculator at the top of Loans / Loan Statements: what a loan's
// repayments would be, or how long a balance takes to pay off. Nothing is
// saved.

const money = (n: number, cents = false) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: cents ? 2 : 0 });
const FREQS: { id: RepaymentFrequency; label: string }[] = [
  { id: "weekly", label: "Weekly" },
  { id: "fortnightly", label: "Fortnightly" },
  { id: "monthly", label: "Monthly" },
];
const input =
  "w-full h-10 rounded-xl border border-tal-line bg-white px-3 text-sm text-tal-plum";

/** yyyy-mm-dd, local. */
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function LoanCalculator({ folderId }: { folderId: "admin.loans" | "admin.loan_statements" }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"repayment" | "payoff">("repayment");
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [years, setYears] = useState("");
  const [repayment, setRepayment] = useState("");
  const [frequency, setFrequency] = useState<RepaymentFrequency>("monthly");

  const n = (s: string) => Number(s.replace(/[$,\s]/g, ""));
  const repay = mode === "repayment" ? repaymentFor({ amount: n(amount), annualRatePct: n(rate), years: n(years), frequency }) : null;
  const payoff =
    mode === "payoff" ? payoffEstimate({ balance: n(amount), annualRatePct: n(rate), repayment: n(repayment), frequency }) : null;
  const ready = amount && rate && (mode === "repayment" ? years : repayment);

  // The figures as a new loan / statement, for the person to check and save.
  function useFigures() {
    const today = new Date();
    const end =
      mode === "repayment"
        ? new Date(today.getFullYear() + n(years), today.getMonth(), today.getDate())
        : payoff?.payoffDate ?? null;
    const repaymentAmount = mode === "repayment" ? repay?.repayment : n(repayment);
    const amt = (v: number | undefined) => (v == null || !Number.isFinite(v) ? "" : String(Math.round(v * 100) / 100));
    const answers: Record<string, string> =
      folderId === "admin.loans"
        ? {
            ...(mode === "repayment" ? { "loans.original_amount": amt(n(amount)) } : {}),
            "loans.interest_rate": amt(n(rate)),
            "loans.payment_amount": amt(repaymentAmount),
            "loans.payment_frequency": frequency,
            ...(mode === "repayment" ? { "loans.start_date": iso(today) } : {}),
            ...(end ? { "loans.end_date": iso(end) } : {}),
          }
        : {
            "admin_loan_statements.balance": amt(n(amount)),
            "admin_loan_statements.interest_rate": amt(n(rate)),
            "admin_loan_statements.repayment": amt(repaymentAmount),
            "admin_loan_statements.repayment_freq": frequency,
            "admin_loan_statements.statement_date": iso(today),
            ...(end ? { "admin_loan_statements.end_date": iso(end) } : {}),
          };
    startPrefilledEntry({ subcategoryId: folderId, answers: Object.fromEntries(Object.entries(answers).filter(([, v]) => v)) });
  }
  const canUse = ready && (mode === "repayment" ? !!repay : !!payoff);

  return (
    <section className="mb-6 rounded-2xl border border-tal-line bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="no-hover-fx w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span>
          <span className="block font-medium text-tal-plum">Loan calculator</span>
          <span className="block text-xs text-tal-plum-soft">
            Work out repayments, or how long a loan will take to pay off.
          </span>
        </span>
        <span aria-hidden className="text-tal-plum">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4">
          <div className="inline-flex rounded-xl border border-tal-line p-1">
            {(
              [
                ["repayment", "What will my repayments be?"],
                ["payoff", "How long to pay it off?"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                aria-pressed={mode === id}
                className={
                  "no-hover-fx h-9 px-3 rounded-lg text-sm " +
                  (mode === id ? "bg-black text-white" : "text-tal-plum hover:bg-tal-cream-soft")
                }
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="block">
              <span className="block text-xs text-tal-plum-soft mb-1">{mode === "repayment" ? "Loan amount ($)" : "Balance owing ($)"}</span>
              <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={input} placeholder="e.g. 450000" />
            </label>
            <label className="block">
              <span className="block text-xs text-tal-plum-soft mb-1">Interest rate (% a year)</span>
              <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} className={input} placeholder="e.g. 6.2" />
            </label>
            {mode === "repayment" ? (
              <label className="block">
                <span className="block text-xs text-tal-plum-soft mb-1">Loan term (years)</span>
                <input inputMode="decimal" value={years} onChange={(e) => setYears(e.target.value)} className={input} placeholder="e.g. 30" />
              </label>
            ) : (
              <label className="block">
                <span className="block text-xs text-tal-plum-soft mb-1">Repayment amount ($)</span>
                <input inputMode="decimal" value={repayment} onChange={(e) => setRepayment(e.target.value)} className={input} placeholder="e.g. 1500" />
              </label>
            )}
            <label className="block">
              <span className="block text-xs text-tal-plum-soft mb-1">Repayments</span>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value as RepaymentFrequency)} className={input}>
                {FREQS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {/* Works it out as you type — no button needed, so the result is
              made obvious. */}
          <div className="rounded-xl border-2 border-black bg-tal-cream-soft p-4 text-base text-tal-plum" aria-live="polite">
            <div className="text-xs font-semibold uppercase tracking-wider text-tal-plum-soft mb-1">Your result</div>
            {!ready ? (
              <span className="text-sm text-tal-plum-soft">Fill in the boxes above — your result appears here as you type.</span>
            ) : mode === "repayment" ? (
              repay ? (
                <>
                  Repayments of about <strong>{money(repay.repayment, true)}</strong> {frequency}, with about{" "}
                  <strong>{money(repay.totalInterest)}</strong> interest over the life of the loan.
                </>
              ) : (
                <span className="text-red-700">Check the amounts — they need to be numbers above zero.</span>
              )
            ) : payoff ? (
              <>
                About <strong>{describeDuration(payoff.days)}</strong> to pay off — around{" "}
                <strong>{payoff.payoffDate.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}</strong> — with
                about <strong>{money(payoff.totalInterest)}</strong> interest.
              </>
            ) : (
              <span className="text-red-700">
                At this repayment the loan wouldn’t be paid off — the repayment doesn’t cover the interest.
              </span>
            )}
          </div>
          {canUse && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={useFigures}
                className="h-10 px-4 rounded-xl bg-black text-white text-sm font-medium"
              >
                {folderId === "admin.loans" ? "Add these figures as a new loan" : "Add these figures as a new statement"}
              </button>
              <span className="text-xs text-tal-plum-soft">
                Starts a new entry below with these figures filled in — check it, add the name and lender, then press Save.
              </span>
            </div>
          )}
          <p className="text-xs text-tal-plum-soft">{LOAN_ESTIMATE_NOTE}</p>
        </div>
      )}
    </section>
  );
}
