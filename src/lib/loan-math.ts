// ─────────────────────────────────────────────────────────────────────
//  Loan mathematics for flat (fixed-interest) lending.
//
//  Model (matches the business practice exactly):
//  • Interest is FIXED for the whole term — never compounded,
//    never recalculated on the remaining balance.
//      rateUnit "monthly" → totalInterest = principal × rate% × termMonths
//      rateUnit "term"    → totalInterest = principal × rate%
//  • Total due      = principal + totalInterest
//  • Installment    = totalDue / termMonths (the expected monthly amount)
//  • Every payment is applied INTEREST FIRST (up to the unpaid
//    interest obligation), and the remainder reduces principal.
//    A payment may never exceed the remaining balance.
//  • Status is always DERIVED from the data, never stored:
//      completed  balance ≤ 0
//      overdue    past maturity date with balance > 0
//      behind     paid-to-date more than half an installment under schedule
//      on_track   everything else
// ─────────────────────────────────────────────────────────────────────

import {
  differenceInCalendarMonths,
  differenceInDays,
  addMonths,
  startOfMonth,
} from "date-fns";
import type {
  RateUnit,
  LoanCore,
  PaymentLike,
  LoanStatus,
} from "./types";

export const round2 = (n: number): number =>
  Math.round((n + Number.EPSILON) * 100) / 100;

export const money = (n: number): number => round2(Number.isFinite(n) ? n : 0);

/** Total interest obligation for the full term (fixed, never compounds). */
export function totalInterestOf(loan: LoanCore): number {
  const rate = loan.interestRate / 100;
  const ti =
    loan.rateUnit === "monthly"
      ? loan.principal * rate * loan.termMonths
      : loan.principal * rate;
  return round2(ti);
}

/** Principal + full-term interest. */
export function totalDueOf(loan: LoanCore): number {
  return round2(loan.principal + totalInterestOf(loan));
}

/** The expected monthly instalment. */
export function installmentOf(loan: LoanCore): number {
  return round2(totalDueOf(loan) / loan.termMonths);
}

/** Per-month interest accrual (evenly across the term). */
export function monthlyInterestOf(loan: LoanCore): number {
  return round2(totalInterestOf(loan) / loan.termMonths);
}

export function maturityDateOf(loan: LoanCore): Date {
  const start = new Date(loan.startDate);
  return addMonths(startOfMonth(start), loan.termMonths);
}

/** Whole months elapsed since disbursement, clamped to [0, term]. */
export function monthsElapsedOf(loan: LoanCore, at: Date = new Date()): number {
  const m = differenceInCalendarMonths(
    startOfMonth(at),
    startOfMonth(new Date(loan.startDate))
  );
  return Math.max(0, Math.min(m, loan.termMonths));
}

/** Cumulative amount the schedule expects collected by `at`. */
export function expectedToDateOf(loan: LoanCore, at: Date = new Date()): number {
  const due = totalDueOf(loan);
  return round2((due * monthsElapsedOf(loan, at)) / loan.termMonths);
}

export interface PaidTotals {
  paidTotal: number;
  interestPaid: number;
  principalPaid: number;
}

export function paidTotalsOf(payments: Pick<PaymentLike, "interestPart" | "principalPart">[]): PaidTotals {
  let interestPaid = 0;
  let principalPaid = 0;
  for (const p of payments) {
    interestPaid += p.interestPart;
    principalPaid += p.principalPart;
  }
  return {
    interestPaid: round2(interestPaid),
    principalPaid: round2(principalPaid),
    paidTotal: round2(interestPaid + principalPaid),
  };
}

export interface Allocation {
  interestPart: number;
  principalPart: number;
  balanceBefore: number;
  balanceAfter: number;
  remainingInterestBefore: number;
  remainingPrincipalBefore: number;
  accruedInterestDue: number;
}

/**
 * Interest due for payment allocation.
 *
 * The first installment period is billable immediately, so a payment made in
 * the loan's start month still clears one month's interest before principal.
 * Later periods remain calendar-based and prior interest payments are deducted
 * by allocatePayment, preventing split payments from charging interest twice.
 */
export function accruedInterestOf(loan: LoanCore, at: Date): number {
  const ti = totalInterestOf(loan);
  const loanMonth = startOfMonth(new Date(loan.startDate)).getTime();
  const paymentMonth = startOfMonth(at).getTime();
  if (paymentMonth < loanMonth) return 0;

  const periodsDue = Math.min(
    loan.termMonths,
    Math.max(1, monthsElapsedOf(loan, at))
  );
  return round2((ti * periodsDue) / loan.termMonths);
}

/**
 * Allocation of a payment — matches how the business actually thinks:
 *   1. first, the interest due for the current installment period is cleared
 *      (e.g. RM3,000 @ 10%/mo → RM300 interest in the first payment)
 *   2. whatever remains reduces the PRINCIPAL
 *   3. any surplus beyond outstanding principal pre-pays remaining
 *      (not-yet-accrued) interest — never the reverse.
 * A payment may never exceed the full remaining obligation.
 */
export function allocatePayment(
  loan: LoanCore,
  priorPayments: Pick<PaymentLike, "interestPart" | "principalPart">[],
  amount: number,
  at: Date = new Date()
): Allocation {
  const ti = totalInterestOf(loan);
  const { interestPaid, principalPaid } = paidTotalsOf(priorPayments);
  const remainingInterest = round2(Math.max(0, ti - interestPaid));
  const remainingPrincipal = round2(Math.max(0, loan.principal - principalPaid));
  const balance = round2(remainingInterest + remainingPrincipal);

  const accruedDue = round2(
    Math.min(Math.max(0, accruedInterestOf(loan, at) - interestPaid), remainingInterest)
  );

  const amt = round2(amount);
  const toAccruedInterest = round2(Math.min(amt, accruedDue));
  const restAfterInterest = round2(amt - toAccruedInterest);
  const toPrincipal = round2(Math.min(restAfterInterest, remainingPrincipal));
  const leftover = round2(restAfterInterest - toPrincipal);
  const toFutureInterest = round2(
    Math.min(leftover, remainingInterest - toAccruedInterest)
  );

  return {
    interestPart: round2(toAccruedInterest + toFutureInterest),
    principalPart: toPrincipal,
    balanceBefore: balance,
    balanceAfter: round2(balance - amt),
    remainingInterestBefore: remainingInterest,
    remainingPrincipalBefore: remainingPrincipal,
    accruedInterestDue: accruedDue,
  };
}

export interface LoanSnapshot {
  status: LoanStatus;
  balance: number;
  outstandingPrincipal: number;
  outstandingInterest: number;
  paidTotal: number;
  interestPaid: number;
  principalPaid: number;
  progress: number; // 0..1 of totalDue collected
  expectedToDate: number;
  variance: number; // paid − expected  (positive = ahead)
  daysOverdue: number;
  monthsElapsed: number;
  lastPaymentAt: string | null;
}

/** Derive the live position & status of a loan. */
export function loanSnapshot(
  loan: LoanCore,
  payments: PaymentLike[],
  at: Date = new Date()
): LoanSnapshot {
  const ti = totalInterestOf(loan);
  const due = totalDueOf(loan);
  const { paidTotal, interestPaid, principalPaid } = paidTotalsOf(payments);

  const outstandingPrincipal = round2(Math.max(0, loan.principal - principalPaid));
  const outstandingInterest = round2(Math.max(0, ti - interestPaid));
  const balance = round2(outstandingPrincipal + outstandingInterest);

  const expected = expectedToDateOf(loan, at);
  const install = installmentOf(loan);
  const variance = round2(paidTotal - expected);

  const maturity = maturityDateOf(loan);
  const daysOverdue =
    at > maturity && balance > 0.005 ? Math.max(0, differenceInDays(at, maturity)) : 0;

  let status: LoanStatus;
  if (balance <= 0.005) status = "completed";
  else if (daysOverdue > 0) status = "overdue";
  else if (variance < -install * 0.5) status = "behind";
  else status = "on_track";

  const sorted = [...payments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return {
    status,
    balance,
    outstandingPrincipal,
    outstandingInterest,
    paidTotal,
    interestPaid,
    principalPaid,
    progress: due > 0 ? Math.min(1, paidTotal / due) : 0,
    expectedToDate: expected,
    variance,
    daysOverdue,
    monthsElapsed: monthsElapsedOf(loan, at),
    lastPaymentAt: sorted.length
      ? new Date(sorted[0].date).toISOString()
      : null,
  };
}

/** The expected collection plan, month by month. */
export function buildSchedule(loan: LoanCore) {
  const install = installmentOf(loan);
  const due = totalDueOf(loan);
  const start = startOfMonth(new Date(loan.startDate));
  const rows: { month: number; dueDate: Date; expectedPayment: number; expectedCumulative: number }[] = [];
  let cumulative = 0;
  for (let m = 1; m <= loan.termMonths; m++) {
    cumulative = round2(cumulative + install);
    const expected = m === loan.termMonths ? due : cumulative; // last row absorbs rounding
    rows.push({
      month: m,
      dueDate: addMonths(start, m),
      expectedPayment: m === loan.termMonths ? round2(due - cumulative + install) : install,
      expectedCumulative: expected,
    });
  }
  return rows;
}

export const rateLabel = (rate: number, unit: RateUnit) =>
  unit === "monthly" ? `${fmtRate(rate)}/mo` : `${fmtRate(rate)} flat`;

function fmtRate(r: number) {
  return `${Number.isInteger(r) ? r : r.toFixed(1)}%`;
}
