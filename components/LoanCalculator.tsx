"use client";

import { useState } from "react";
import {
  LOAN_ESTIMATE_NOTE,
  describeDuration,
  payoffEstimate,
  repaymentFor,
  type RepaymentFrequency,
} from "@/lib/loan-math";

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

export function LoanCalculator() {
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
          <div className="rounded-xl bg-tal-cream-soft/50 p-3 text-sm text-tal-plum" aria-live="polite">
            {!ready ? (
              <span className="text-tal-plum-soft">Fill in the boxes above to see the result.</span>
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
          <p className="text-xs text-tal-plum-soft">{LOAN_ESTIMATE_NOTE}</p>
        </div>
      )}
    </section>
  );
}
