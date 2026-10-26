/*
 * Loan estimates — standard repayment (amortisation) maths, pure and safe
 * for client or server. Assumes a fixed interest rate and regular equal
 * repayments, with no fees, redraws or rate changes: always shown to people
 * as an estimate.
 */

export type RepaymentFrequency = "weekly" | "fortnightly" | "monthly";

export const PERIODS_PER_YEAR: Record<RepaymentFrequency, number> = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
};

export const LOAN_ESTIMATE_NOTE =
  "This is an estimate only. It assumes your interest rate and repayments stay the same, with no fees, extra repayments or redraws. Your lender can give you the exact figures.";

export interface PayoffEstimate {
  /** Repayments left (may be fractional — the last one is smaller). */
  repayments: number;
  /** Whole days until the loan is paid off. */
  days: number;
  payoffDate: Date;
  totalInterest: number;
  totalPaid: number;
}

/** How long a balance takes to pay off at a given repayment. Null when the
 *  repayment doesn't cover the interest (the loan would never be paid off). */
export function payoffEstimate(input: {
  balance: number;
  annualRatePct: number;
  repayment: number;
  frequency: RepaymentFrequency;
  from?: Date;
}): PayoffEstimate | null {
  const { balance, annualRatePct, repayment, frequency } = input;
  if (!(balance > 0) || !(repayment > 0) || !(annualRatePct >= 0)) return null;
  const perYear = PERIODS_PER_YEAR[frequency];
  const r = annualRatePct / 100 / perYear;
  let n: number;
  if (r === 0) n = balance / repayment;
  else {
    if (repayment <= balance * r) return null;
    n = -Math.log(1 - (r * balance) / repayment) / Math.log(1 + r);
  }
  const days = Math.ceil((n * 365.25) / perYear);
  const from = input.from ?? new Date();
  const payoffDate = new Date(from.getTime() + days * 86_400_000);
  const totalPaid = n * repayment;
  return { repayments: n, days, payoffDate, totalInterest: Math.max(totalPaid - balance, 0), totalPaid };
}

/** The repayment needed to pay a loan off over a number of years. */
export function repaymentFor(input: {
  amount: number;
  annualRatePct: number;
  years: number;
  frequency: RepaymentFrequency;
}): { repayment: number; totalInterest: number } | null {
  const { amount, annualRatePct, years, frequency } = input;
  if (!(amount > 0) || !(years > 0) || !(annualRatePct >= 0)) return null;
  const perYear = PERIODS_PER_YEAR[frequency];
  const n = years * perYear;
  const r = annualRatePct / 100 / perYear;
  const repayment = r === 0 ? amount / n : (amount * r) / (1 - Math.pow(1 + r, -n));
  return { repayment, totalInterest: repayment * n - amount };
}

/** "3 years 4 months", "7 months", "3 weeks". */
export function describeDuration(days: number): string {
  if (days < 60) {
    const weeks = Math.max(1, Math.round(days / 7));
    return `${weeks} week${weeks === 1 ? "" : "s"}`;
  }
  const months = Math.round(days / 30.44);
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} year${y === 1 ? "" : "s"}` : "", m ? `${m} month${m === 1 ? "" : "s"}` : ""].filter(Boolean).join(" ");
}
