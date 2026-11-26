// Server-side aggregation service: turns raw DB rows into the
// computed DTOs the frontend consumes. All lending math flows
// through src/lib/loan-math.ts so the numbers can never disagree.

import { db } from "./db";
import { format, subMonths, startOfMonth, isSameMonth } from "date-fns";
import {
  totalInterestOf,
  totalDueOf,
  installmentOf,
  monthlyInterestOf,
  maturityDateOf,
  monthsElapsedOf,
  expectedToDateOf,
  paidTotalsOf,
  loanSnapshot,
  buildSchedule,
  allocatePayment,
  round2,
} from "./loan-math";
import type {
  ClientDTO,
  DashboardDTO,
  LoanDTO,
  MonthPointDTO,
  PaymentDTO,
  RateUnit,
  ReportsDTO,
  SettingsDTO,
  LoanCore,
  PaymentLike,
} from "./types";
import type { Client, Loan, Payment, Setting } from "@prisma/client";

type LoanWithPayments = Loan & { payments: Payment[]; client?: Client | null };
type PaymentWithLoan = Payment & { loan: Loan & { client?: Client | null } };

// SQLite returns numeric columns as numbers while MySQL Decimal columns are
// Prisma Decimal objects. Normalize at the service boundary so all business
// math and API DTOs consistently use JavaScript numbers.
const numeric = (value: unknown): number => Number(value);

function normalizeLoan<T extends Loan>(loan: T): T & LoanCore {
  return {
    ...loan,
    principal: numeric(loan.principal),
    interestRate: numeric(loan.interestRate),
  } as T & LoanCore;
}

function normalizePayment<T extends Payment>(payment: T): T & PaymentLike {
  return {
    ...payment,
    amount: numeric(payment.amount),
    interestPart: numeric(payment.interestPart),
    principalPart: numeric(payment.principalPart),
  } as T & PaymentLike;
}

// ── Settings ────────────────────────────────────────────────────────
export async function getSettings(): Promise<SettingsDTO> {
  let s: Setting | null = await db.setting.findUnique({ where: { id: "singleton" } });
  if (!s) {
    s = await db.setting.create({ data: { id: "singleton" } });
  }
  return {
    businessName: s.businessName,
    tagline: s.tagline,
    licence: s.licence,
    email: s.email,
    phone: s.phone,
    address: s.address,
    currency: s.currency,
    defaultRate: numeric(s.defaultRate),
    rateUnit: s.rateUnit as RateUnit,
    defaultTerm: s.defaultTerm,
  };
}

// ── Loans ───────────────────────────────────────────────────────────
export function loanToDTO(loan: LoanWithPayments, at: Date = new Date()): LoanDTO {
  const normalized = normalizeLoan(loan);
  const payments = loan.payments.map(normalizePayment);
  const snap = loanSnapshot(normalized, payments, at);
  return {
    id: loan.id,
    reference: loan.reference,
    clientId: loan.clientId,
    clientName: loan.client?.name ?? "",
    principal: normalized.principal,
    interestRate: normalized.interestRate,
    rateUnit: loan.rateUnit as RateUnit,
    termMonths: loan.termMonths,
    startDate: loan.startDate.toISOString(),
    maturityDate: maturityDateOf(normalized).toISOString(),
    notes: loan.notes,
    createdAt: loan.createdAt.toISOString(),
    totalInterest: totalInterestOf(normalized),
    totalDue: totalDueOf(normalized),
    monthlyInstallment: installmentOf(normalized),
    monthlyInterest: monthlyInterestOf(normalized),
    monthsElapsed: monthsElapsedOf(normalized, at),
    expectedToDate: expectedToDateOf(normalized, at),
    paidTotal: snap.paidTotal,
    interestPaid: snap.interestPaid,
    principalPaid: snap.principalPaid,
    outstandingPrincipal: snap.outstandingPrincipal,
    outstandingInterest: snap.outstandingInterest,
    balance: snap.balance,
    progress: snap.progress,
    variance: snap.variance,
    status: snap.status,
    daysOverdue: snap.daysOverdue,
    lastPaymentAt: snap.lastPaymentAt,
    paymentCount: loan.payments.length,
  };
}

export async function getLoans(partnerId?: string): Promise<LoanDTO[]> {
  const loans = await db.loan.findMany({
    where: partnerId ? { client: { partners: { some: { id: partnerId } } } } : undefined,
    include: { client: true, payments: true },
    orderBy: { startDate: "desc" },
  });
  return loans.map((l) => loanToDTO(l));
}

export async function getLoanDetail(id: string, partnerId?: string) {
  const loan = await db.loan.findFirst({
    where: { id, ...(partnerId ? { client: { partners: { some: { id: partnerId } } } } : {}) },
    include: { client: true, payments: { orderBy: { date: "asc" } } },
  });
  if (!loan) return null;
  return {
    loan: loanToDTO(loan),
    schedule: buildSchedule(normalizeLoan(loan)).map((r) => ({
      month: r.month,
      dueDate: r.dueDate.toISOString(),
      expectedPayment: r.expectedPayment,
      expectedCumulative: r.expectedCumulative,
    })),
    payments: loan.payments
      .map((p) => paymentToDTO({ ...p, loan }))
      .sort((a, b) => b.date.localeCompare(a.date)),
  };
}

// ── Payments ────────────────────────────────────────────────────────
export function paymentToDTO(p: PaymentWithLoan): PaymentDTO {
  return {
    id: p.id,
    loanId: p.loanId,
    loanReference: p.loan.reference,
    clientId: p.loan.clientId,
    clientName: p.loan.client?.name ?? "",
    amount: numeric(p.amount),
    interestPart: numeric(p.interestPart),
    principalPart: numeric(p.principalPart),
    date: p.date.toISOString(),
    method: p.method,
    note: p.note,
    recordedBy: p.recordedBy,
    createdAt: p.createdAt.toISOString(),
  };
}

export async function getPayments(opts?: {
  loanId?: string;
  limit?: number;
  partnerId?: string;
}): Promise<PaymentDTO[]> {
  const rows = await db.payment.findMany({
    where: {
      ...(opts?.loanId ? { loanId: opts.loanId } : {}),
      ...(opts?.partnerId ? { loan: { client: { partners: { some: { id: opts.partnerId } } } } } : {}),
    },
    include: { loan: { include: { client: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    ...(opts?.limit ? { take: opts.limit } : {}),
  });
  return rows.map(paymentToDTO);
}

/** Replays every payment of a loan chronologically and re-derives the
 *  interest/principal split — keeps history consistent after inserts
 *  with back-dates or deletions. */
export async function recomputeLoanAllocations(loanId: string) {
  const loan = await db.loan.findUnique({
    where: { id: loanId },
    include: { payments: true },
  });
  if (!loan) return;
  const ordered = [...loan.payments].sort(
    (a, b) => a.date.getTime() - b.date.getTime() || a.createdAt.getTime() - b.createdAt.getTime()
  );
  const prior: { interestPart: number; principalPart: number }[] = [];
  const normalizedLoan = normalizeLoan(loan);
  for (const p of ordered) {
    const alloc = allocatePayment(normalizedLoan, prior, numeric(p.amount), p.date);
    if (
      alloc.interestPart !== numeric(p.interestPart) ||
      alloc.principalPart !== numeric(p.principalPart)
    ) {
      await db.payment.update({
        where: { id: p.id },
        data: { interestPart: alloc.interestPart, principalPart: alloc.principalPart },
      });
    }
    prior.push({ interestPart: alloc.interestPart, principalPart: alloc.principalPart });
  }
}

// ── Clients ─────────────────────────────────────────────────────────
export async function getClients(partnerId?: string): Promise<ClientDTO[]> {
  const clients = await db.client.findMany({
    where: partnerId ? { partners: { some: { id: partnerId } } } : undefined,
    include: { partners: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });
  const loans = await db.loan.findMany({
    where: partnerId ? { client: { partners: { some: { id: partnerId } } } } : undefined,
    include: { payments: true },
  });
  const byClient = new Map<string, LoanWithPayments[]>();
  for (const l of loans) {
    const arr = byClient.get(l.clientId) ?? [];
    arr.push(l);
    byClient.set(l.clientId, arr);
  }
  const now = new Date();

  return clients.map((c) => {
    const list = byClient.get(c.id) ?? [];
    let outstanding = 0;
    let borrowed = 0;
    let interestPaid = 0;
    let active = 0;
    let completed = 0;
    let lastPayment: Date | null = null;
    let health: ClientDTO["health"] = "clean";
    const rank = { overdue: 3, behind: 2, on_track: 1, completed: 0 };
    let worst = 0;
    for (const l of list) {
      const dto = loanToDTO(l, now);
      borrowed += numeric(l.principal);
      interestPaid += dto.interestPaid;
      if (dto.status === "completed") completed++;
      else {
        active++;
        outstanding += dto.balance;
        worst = Math.max(worst, rank[dto.status]);
      }
      for (const p of l.payments) {
        if (!lastPayment || p.date > lastPayment) lastPayment = p.date;
      }
    }
    if (worst === 3) health = "overdue";
    else if (worst === 2) health = "behind";
    else if (worst === 1) health = "on_track";
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      address: c.address,
      idNumber: c.idNumber,
      occupation: c.occupation,
      notes: c.notes,
      partners: c.partners,
      createdAt: c.createdAt.toISOString(),
      loanCount: list.length,
      activeLoanCount: active,
      completedLoanCount: completed,
      totalBorrowed: round2(borrowed),
      outstandingBalance: round2(outstanding),
      interestPaidToDate: round2(interestPaid),
      lastPaymentAt: lastPayment ? lastPayment.toISOString() : null,
      health,
    };
  });
}

export async function getClientDetail(id: string, partnerId?: string) {
  const client = await db.client.findFirst({
    where: { id, ...(partnerId ? { partners: { some: { id: partnerId } } } : {}) },
  });
  if (!client) return null;
  const loans = await db.loan.findMany({
    where: { clientId: id },
    include: { client: true, payments: true },
    orderBy: { startDate: "desc" },
  });
  const loanDTOs = loans.map((l) => loanToDTO(l));
  const payments = loans
    .flatMap((l) => l.payments.map((p) => ({ ...p, loan: l })))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map(paymentToDTO);

  const all = await getClients(partnerId);
  const summary = all.find((c) => c.id === id)!;
  return { client: summary, loans: loanDTOs, payments };
}

// ── Dashboard ───────────────────────────────────────────────────────
function monthSeries(points: number): { key: string; label: string; start: Date }[] {
  const out: { key: string; label: string; start: Date }[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const d = subMonths(new Date(), i);
    out.push({ key: format(d, "yyyy-MM"), label: format(d, "MMM"), start: startOfMonth(d) });
  }
  return out;
}

export async function getDashboard(partnerId?: string): Promise<DashboardDTO> {
  const now = new Date();
  const loanWhere = partnerId ? { client: { partners: { some: { id: partnerId } } } } : undefined;
  const loans = await db.loan.findMany({ where: loanWhere, include: { client: true, payments: true } });
  const dtos = loans.map((l) => loanToDTO(l, now));
  const recent = await getPayments({ limit: 20, partnerId });

  const active = dtos.filter((l) => l.status !== "completed");
  const overdue = dtos.filter((l) => l.status === "overdue");
  const behind = dtos.filter((l) => l.status === "behind");

  const sum = (arr: LoanDTO[], f: (l: LoanDTO) => number) =>
    round2(arr.reduce((s, l) => s + f(l), 0));

  const outstandingPrincipal = sum(active, (l) => l.outstandingPrincipal);
  const outstandingInterest = sum(active, (l) => l.outstandingInterest);
  const portfolioBalance = round2(outstandingPrincipal + outstandingInterest);

  // month collections
  const allPayments = await db.payment.findMany({ where: partnerId ? { loan: { client: { partners: { some: { id: partnerId } } } } } : undefined });
  const thisMonth = allPayments.filter((p) => isSameMonth(p.date, now));
  const lastMonthDate = subMonths(now, 1);
  const lastMonth = allPayments.filter((p) => isSameMonth(p.date, lastMonthDate));
  const mSum = (arr: Payment[], f: (p: Payment) => number) =>
    round2(arr.reduce((s, p) => s + f(p), 0));

  const disbursedThisMonth = sum(
    dtos.filter((l) => isSameMonth(new Date(l.startDate), now)),
    (l) => l.principal
  );

  const expectedThisMonth = round2(
    active.reduce((s, l) => s + Math.min(l.monthlyInstallment, l.balance), 0)
  );

  const collectionRate = (() => {
    const expected = sum(dtos, (l) => l.expectedToDate);
    const paid = sum(dtos, (l) => l.paidTotal);
    return expected > 0 ? Math.min(1.5, paid / expected) : 1;
  })();

  const monthly: MonthPointDTO[] = monthSeries(12).map((m) => {
    const pays = allPayments.filter((p) => format(p.date, "yyyy-MM") === m.key);
    const disb = dtos.filter((l) => format(new Date(l.startDate), "yyyy-MM") === m.key);
    return {
      key: m.key,
      label: m.label,
      collected: mSum(pays, (p) => numeric(p.amount)),
      interest: mSum(pays, (p) => numeric(p.interestPart)),
      principal: mSum(pays, (p) => numeric(p.principalPart)),
      disbursed: sum(disb, (l) => l.principal),
      newLoans: disb.length,
      paymentsCount: pays.length,
    };
  });

  const statusOrder = ["on_track", "behind", "overdue"] as const;
  const statusMix = statusOrder.map((status) => {
    const arr = dtos.filter((l) => l.status === status);
    return { status, count: arr.length, balance: sum(arr, (l) => l.balance) };
  });

  const attention = [...overdue, ...behind].sort((a, b) => {
      if (a.status === b.status) return a.variance - b.variance;
      return b.daysOverdue - a.daysOverdue;
    });

  const clientsWithActive = new Set(active.map((l) => l.clientId)).size;
  const totalClients = await db.client.count({ where: partnerId ? { partners: { some: { id: partnerId } } } : undefined });

  return {
    kpis: {
      activeLoans: active.length,
      outstandingPrincipal,
      outstandingInterest,
      portfolioBalance,
      collectedThisMonth: mSum(thisMonth, (p) => numeric(p.amount)),
      collectedLastMonth: mSum(lastMonth, (p) => numeric(p.amount)),
      interestThisMonth: mSum(thisMonth, (p) => numeric(p.interestPart)),
      principalThisMonth: mSum(thisMonth, (p) => numeric(p.principalPart)),
      overdueCount: overdue.length,
      overdueBalance: sum(overdue, (l) => l.balance),
      behindCount: behind.length,
      disbursedThisMonth,
      totalDisbursed: sum(dtos, (l) => l.principal),
      totalInterestEarned: sum(dtos, (l) => l.interestPaid),
      collectionRate,
      totalClients,
      clientsWithActiveLoans: clientsWithActive,
      expectedThisMonth,
    },
    monthly,
    statusMix,
    recentPayments: recent,
    attention,
  };
}

// ── Reports ─────────────────────────────────────────────────────────
export async function getReports(partnerId?: string): Promise<ReportsDTO> {
  const now = new Date();
  const loans = await db.loan.findMany({ where: partnerId ? { client: { partners: { some: { id: partnerId } } } } : undefined, include: { client: true, payments: true } });
  const dtos = loans.map((l) => loanToDTO(l, now));
  const allPayments = await db.payment.findMany({ where: partnerId ? { loan: { client: { partners: { some: { id: partnerId } } } } } : undefined });

  const monthly = monthSeries(12).map((m) => {
    const pays = allPayments.filter((p) => format(p.date, "yyyy-MM") === m.key);
    const disb = dtos.filter((l) => format(new Date(l.startDate), "yyyy-MM") === m.key);
    const rSum = (f: (p: Payment) => number) => round2(pays.reduce((s, p) => s + f(p), 0));
    return {
      key: m.key,
      label: m.label,
      collected: rSum((p) => numeric(p.amount)),
      interest: rSum((p) => numeric(p.interestPart)),
      principal: rSum((p) => numeric(p.principalPart)),
      disbursed: round2(disb.reduce((s, l) => s + l.principal, 0)),
      newLoans: disb.length,
      paymentsCount: pays.length,
    };
  });

  // aging on the active portfolio
  const active = dtos.filter((l) => l.status !== "completed");
  const buckets = [
    { bucket: "Current", min: -1, max: 0 },
    { bucket: "1–30 days late", min: 1, max: 30 },
    { bucket: "31–60 days late", min: 31, max: 60 },
    { bucket: "61–90 days late", min: 61, max: 90 },
    { bucket: "90+ days late", min: 91, max: Infinity },
  ].map((b) => {
    const arr = active.filter(
      (l) => l.daysOverdue >= b.min && l.daysOverdue <= b.max
    );
    return {
      bucket: b.bucket,
      count: arr.length,
      balance: round2(arr.reduce((s, l) => s + l.balance, 0)),
    };
  });

  // top clients by outstanding
  const byClient = new Map<string, { name: string; outstanding: number; loanCount: number }>();
  for (const l of active) {
    const e = byClient.get(l.clientId) ?? { name: l.clientName, outstanding: 0, loanCount: 0 };
    e.outstanding = round2(e.outstanding + l.balance);
    e.loanCount++;
    byClient.set(l.clientId, e);
  }
  const totalOutstanding = round2([...byClient.values()].reduce((s, e) => s + e.outstanding, 0));
  const topClients = [...byClient.entries()]
    .map(([clientId, e]) => ({
      clientId,
      name: e.name,
      outstanding: e.outstanding,
      loanCount: e.loanCount,
      share: totalOutstanding > 0 ? e.outstanding / totalOutstanding : 0,
    }))
    .sort((a, b) => b.outstanding - a.outstanding);

  const principalOutstanding = round2(
    active.reduce((s, l) => s + l.outstandingPrincipal, 0)
  );
  const wAvgRate =
    principalOutstanding > 0
      ? round2(
          (active.reduce(
            (s, l) => s + l.outstandingPrincipal * (l.monthlyInterest / l.principal),
            0
          ) /
            principalOutstanding) *
            100
        )
      : 0;
  const largestExposure = Math.max(0, ...active.map((l) => l.balance));

  return {
    monthly,
    aging: buckets,
    topClients,
    stats: {
      totalLoans: dtos.length,
      activeCount: active.length,
      completedCount: dtos.filter((l) => l.status === "completed").length,
      avgLoanSize: dtos.length
        ? round2(dtos.reduce((s, l) => s + l.principal, 0) / dtos.length)
        : 0,
      avgTerm: dtos.length
        ? round2(dtos.reduce((s, l) => s + l.termMonths, 0) / dtos.length)
        : 0,
      weightedAvgMonthlyRate: wAvgRate,
      largestExposure,
      largestShare: totalOutstanding > 0 ? largestExposure / totalOutstanding : 0,
      principalOutstanding,
    },
  };
}
