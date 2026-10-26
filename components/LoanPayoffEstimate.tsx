"use client";

import { LOAN_ESTIMATE_NOTE, describeDuration, payoffEstimate, type RepaymentFrequency } from "@/lib/loan-math";

// On a loan statement: roughly how long until it's paid off and how much
// interest is left, from the statement's own balance, rate and repayments.

const money = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

export function LoanPayoffEstimate({ answers }: { answers: Record<string, string | null> }) {
  const v = (k: string) => answers[`admin_loan_statements.${k}`] ?? "";
  const balance = Number(v("balance"));
  const rate = Number(v("interest_rate"));
  const repayment = Number(v("repayment"));
  const frequency = v("repayment_freq") as RepaymentFrequency;
  const fromIso = v("statement_date");

  const missing = [
    !(balance > 0) && "Current balance",
    !v("interest_rate") && "Interest rate",
    !(repayment > 0) && "Repayment amount",
    !["weekly", "fortnightly", "monthly"].includes(frequency) && "Repayment frequency",
  ].filter(Boolean) as string[];

  const from = fromIso && !Number.isNaN(Date.parse(fromIso)) ? new Date(fromIso) : new Date();
  const est = missing.length ? null : payoffEstimate({ balance, annualRatePct: rate, repayment, frequency, from });

  return (
    <div className="mt-4 rounded-xl border border-tal-line bg-tal-cream-soft/40 p-3">
      <div className="text-xs uppercase tracking-wider text-tal-plum-soft mb-1">Estimated time to pay off</div>
      {missing.length > 0 ? (
        <p className="text-sm text-tal-plum-soft">Add the {missing.join(", ")} above to see an estimate.</p>
      ) : !est ? (
        <p className="text-sm text-red-700">
          At this repayment the loan wouldn’t be paid off — the repayment doesn’t cover the interest.
        </p>
      ) : (
        <p className="text-sm text-tal-plum">
          About <strong>{describeDuration(est.days)}</strong> ({est.days.toLocaleString("en-AU")} days) — paid off around{" "}
          <strong>{est.payoffDate.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}</strong>, with about{" "}
          <strong>{money(est.totalInterest)}</strong> more interest ({money(est.totalPaid)} in repayments).
        </p>
      )}
      <p className="mt-1.5 text-xs text-tal-plum-soft">{LOAN_ESTIMATE_NOTE}</p>
    </div>
  );
}
