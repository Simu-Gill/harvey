// Shared domain types used by both the API layer and the frontend.

export type RateUnit = "monthly" | "term";

export type LoanStatus = "on_track" | "behind" | "overdue" | "completed";

export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "mobile_money"
  | "check"
  | "other";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "mobile_money", label: "Mobile money" },
  { value: "check", label: "Cheque" },
  { value: "other", label: "Other" },
];

export const methodLabel = (m: string): string =>
  PAYMENT_METHODS.find((x) => x.value === m)?.label ?? m;

// ── Loan core (what math functions need) ────────────────────────────
export interface LoanCore {
  principal: number;
  interestRate: number;
  rateUnit: RateUnit;
  termMonths: number;
  startDate: string | Date;
}

export interface PaymentLike {
  amount: number;
  interestPart: number;
  principalPart: number;
  date: string | Date;
}

// ── API DTOs ────────────────────────────────────────────────────────
export interface LoanDTO {
  id: string;
  reference: string;
  clientId: string;
  clientName: string;
  principal: number;
  interestRate: number;
  rateUnit: RateUnit;
  termMonths: number;
  startDate: string;
  maturityDate: string;
  notes: string | null;
  createdAt: string;
  // computed
  totalInterest: number;
  totalDue: number;
  monthlyInstallment: number;
  monthlyInterest: number;
  monthsElapsed: number;
  expectedToDate: number;
  paidTotal: number;
  interestPaid: number;
  principalPaid: number;
  outstandingPrincipal: number;
  outstandingInterest: number;
  balance: number;
  progress: number;
  variance: number;
  status: LoanStatus;
  daysOverdue: number;
  lastPaymentAt: string | null;
  paymentCount: number;
}

export interface ClientDTO {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  idNumber: string | null;
  occupation: string | null;
  notes: string | null;
  createdAt: string;
  // computed
  loanCount: number;
  activeLoanCount: number;
  completedLoanCount: number;
  totalBorrowed: number;
  outstandingBalance: number;
  interestPaidToDate: number;
  lastPaymentAt: string | null;
  health: "on_track" | "behind" | "overdue" | "clean";
}

export interface PaymentDTO {
  id: string;
  loanId: string;
  loanReference: string;
  clientId: string;
  clientName: string;
  amount: number;
  interestPart: number;
  principalPart: number;
  date: string;
  method: string;
  note: string | null;
  recordedBy: string | null;
  createdAt: string;
}

export interface SettingsDTO {
  businessName: string;
  tagline: string;
  licence: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  defaultRate: number;
  rateUnit: RateUnit;
  defaultTerm: number;
}

export interface DashboardDTO {
  kpis: {
    activeLoans: number;
    outstandingPrincipal: number;
    outstandingInterest: number;
    portfolioBalance: number;
    collectedThisMonth: number;
    collectedLastMonth: number;
    interestThisMonth: number;
    principalThisMonth: number;
    overdueCount: number;
    overdueBalance: number;
    behindCount: number;
    disbursedThisMonth: number;
    totalDisbursed: number;
    totalInterestEarned: number;
    collectionRate: number; // 0..1
    totalClients: number;
    clientsWithActiveLoans: number;
    expectedThisMonth: number;
  };
  monthly: MonthPointDTO[];
  statusMix: { status: LoanStatus; count: number; balance: number }[];
  recentPayments: PaymentDTO[];
  attention: LoanDTO[];
}

export interface MonthPointDTO {
  key: string; // e.g. "2025-06"
  label: string; // "Jun"
  collected: number;
  interest: number;
  principal: number;
  disbursed: number;
  newLoans: number;
  paymentsCount: number;
}

export interface ReportsDTO {
  monthly: MonthPointDTO[];
  aging: { bucket: string; count: number; balance: number }[];
  topClients: {
    clientId: string;
    name: string;
    outstanding: number;
    loanCount: number;
    share: number;
  }[];
  stats: {
    totalLoans: number;
    activeCount: number;
    completedCount: number;
    avgLoanSize: number;
    avgTerm: number;
    weightedAvgMonthlyRate: number; // effective monthly rate on principal, portfolio-wide
    largestExposure: number;
    largestShare: number; // 0..1
    principalOutstanding: number;
  };
}
