"use client";

// Loan detail drawer: the complete story of one loan — terms, live
// position vs schedule, expected payment plan, and every payment
// received with its interest/principal allocation.

import {
  CalendarClock,
  CheckCircle2,
  HandCoins,
  Info,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { fmtDate, fmtMoney, methodLabel } from "@/lib/format";
import { Money } from "./money";
import { StatusBadge } from "./status-badge";
import { useApp } from "./store";
import { useDeletePayment, useLoanDetail } from "./queries";
import { cn } from "@/lib/utils";

export function LoanSheet() {
  const loanSheetId = useApp((s) => s.loanSheetId);
  const closeLoan = useApp((s) => s.closeLoan);
  const openClient = useApp((s) => s.openClient);
  const openPaymentDialog = useApp((s) => s.openPaymentDialog);
  const { data, isLoading } = useLoanDetail(loanSheetId);

  const loan = data?.loan;

  return (
    <Sheet open={!!loanSheetId} onOpenChange={(o) => !o && closeLoan()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {isLoading || !loan ? (
          <div className="space-y-3 p-6">
            <div className="h-7 w-56 animate-pulse rounded bg-muted" />
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
            <div className="h-40 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : (
          <>
            <SheetHeader className="border-b bg-muted/40 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <SheetTitle className="font-display text-xl leading-tight">
                    <button
                      className="hover:underline"
                      onClick={() => openClient(loan.clientId)}
                    >
                      {loan.clientName}
                    </button>
                  </SheetTitle>
                  <SheetDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono text-[12px] text-muted-foreground">
                      {loan.reference}
                    </span>
                    <StatusBadge status={loan.status} />
                  </SheetDescription>
                </div>
                {loan.status !== "completed" && (
                  <Button
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => openPaymentDialog(loan.id)}
                  >
                    <HandCoins className="size-3.5" /> Record Payment
                  </Button>
                )}
              </div>

              {/* Summary grid */}
              <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
                {[
                  { label: "Principal", value: loan.principal, sub: `${fmtMoney(loan.principalPaid)} repaid` },
                  {
                    label: "Interest (fixed)",
                    value: loan.totalInterest,
                    sub: `${loan.interestRate}%${loan.rateUnit === "monthly" ? "/mo" : " flat"} · ${loan.termMonths} mo`,
                  },
                  { label: "Total Due", value: loan.totalDue, sub: `${fmtMoney(loan.monthlyInstallment)}/mo expected` },
                  {
                    label: "Balance",
                    value: loan.balance,
                    sub:
                      loan.status === "completed"
                        ? `settled ${loan.lastPaymentAt ? fmtDate(loan.lastPaymentAt) : ""}`
                        : `${fmtMoney(loan.outstandingPrincipal)} prin + ${fmtMoney(loan.outstandingInterest)} int`,
                    highlight: true,
                  },
                ].map((s) => (
                  <div key={s.label} className="bg-card p-3.5">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {s.label}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-[17px] font-semibold tracking-tight",
                        s.highlight && loan.status !== "completed" && "text-emerald-700 dark:text-emerald-400"
                      )}
                    >
                      <Money value={s.value} />
                    </p>
                    <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">{s.sub}</p>
                  </div>
                ))}
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto scrollbar-slim">
              {/* Progress vs schedule */}
              <section className="border-b p-6">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    Progress vs Schedule
                  </h3>
                  <p className="text-[12px] tabular-nums text-muted-foreground">
                    <span className="font-medium text-foreground">
                      <Money value={loan.paidTotal} />
                    </span>{" "}
                    of <Money value={loan.totalDue} /> · {Math.round(loan.progress * 100)}%
                  </p>
                </div>
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      loan.status === "overdue"
                        ? "bg-red-500"
                        : loan.status === "behind"
                          ? "bg-amber-500"
                          : "bg-emerald-600 dark:bg-emerald-500"
                    )}
                    style={{ width: `${Math.min(100, Math.round(loan.progress * 100))}%` }}
                  />
                </div>
                {/* expected marker */}
                <div className="relative mt-1 h-4">
                  <div
                    className="absolute -top-[18px] flex flex-col items-center"
                    style={{
                      left: `${Math.min(
                        100,
                        Math.round((loan.expectedToDate / loan.totalDue) * 100)
                      )}%`,
                      transform: "translateX(-50%)",
                    }}
                  >
                    <span className="text-[10px] font-medium text-muted-foreground">▼ expected</span>
                  </div>
                </div>
                <ScheduleNote loan={loan} />
                <div className="mt-3 grid grid-cols-2 gap-3 text-[12.5px] sm:grid-cols-4">
                  <KV label="Disbursed" value={fmtDate(loan.startDate)} />
                  <KV label="Matures" value={fmtDate(loan.maturityDate)} />
                  <KV
                    label="Elapsed"
                    value={`${loan.monthsElapsed} of ${loan.termMonths} months`}
                  />
                  <KV
                    label={loan.daysOverdue > 0 ? "Days overdue" : "Days to maturity"}
                    value={
                      loan.daysOverdue > 0
                        ? String(loan.daysOverdue)
                        : String(
                            Math.max(
                              0,
                              differenceInDays(new Date(loan.maturityDate), new Date())
                            )
                          )
                    }
                    tone={loan.daysOverdue > 0 ? "danger" : undefined}
                  />
                </div>
              </section>

              {/* Expected plan */}
              <section className="border-b p-6">
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  Expected Payment Plan
                </h3>
                <div className="mt-3 overflow-hidden rounded-lg border">
                  <table className="w-full text-[12.5px]">
                    <thead>
                      <tr className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-2 text-left font-semibold">Instalment</th>
                        <th className="px-4 py-2 text-left font-semibold">Due around</th>
                        <th className="px-4 py-2 text-right font-semibold">Expected</th>
                        <th className="px-4 py-2 text-right font-semibold">Cumulative</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.schedule.map((r) => {
                        const past = new Date(r.dueDate) <= new Date();
                        return (
                          <tr key={r.month} className={cn(!past && "text-muted-foreground/70")}>
                            <td className="px-4 py-2">
                              #{r.month}
                              {past && loan.status !== "completed" && (
                                <span className="ml-2 inline-block size-1.5 rounded-full bg-emerald-500" title="Due to date" />
                              )}
                            </td>
                            <td className="px-4 py-2">{format(new Date(r.dueDate), "MMM d, yyyy")}</td>
                            <td className="px-4 py-2 text-right tabular-nums">
                              <Money value={r.expectedPayment} />
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">
                              <Money value={r.expectedCumulative} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 flex items-start gap-1.5 text-[11.5px] text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  Interest is fixed for the whole term — never compounding. The plan is the
                  expected pace; borrowers may pay any amount, any time.
                </p>
              </section>

              {/* Payments */}
              <section className="p-6">
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  Payments Received ({loan.paymentCount})
                </h3>
                {data.payments.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-dashed p-4 text-center text-[13px] text-muted-foreground">
                    No payments received yet on this loan.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y overflow-hidden rounded-lg border">
                    {data.payments.map((p) => (
                      <PaymentRow key={p.id} payment={p} loanId={loan.id} />
                    ))}
                  </ul>
                )}

                {loan.notes && (
                  <div className="mt-5 rounded-lg border bg-muted/30 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Loan Notes
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-foreground/80">
                      {loan.notes}
                    </p>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ScheduleNote({ loan }: { loan: NonNullable<ReturnType<typeof useLoanDetail>["data"]>["loan"] }) {
  if (loan.status === "completed") {
    return (
      <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
        <CheckCircle2 className="size-3.5" /> Fully settled — nothing outstanding.
      </p>
    );
  }
  const ahead = loan.variance >= 0;
  return (
    <p
      className={cn(
        "mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium",
        ahead
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
          : loan.status === "overdue"
            ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
            : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
      )}
    >
      {ahead ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
      <span className="tabular-nums">
        {ahead
          ? `${fmtMoney(loan.variance)} ahead of schedule`
          : `${fmtMoney(Math.abs(loan.variance))} behind schedule`}
      </span>
      <span className="font-normal opacity-80">
        (expected <Money value={loan.expectedToDate} /> by today)
      </span>
    </p>
  );
}

function KV({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 font-medium tabular-nums",
          tone === "danger" && "text-red-600 dark:text-red-400"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function PaymentRow({
  payment,
  loanId,
}: {
  payment: {
    id: string;
    amount: number;
    interestPart: number;
    principalPart: number;
    date: string;
    method: string;
    note: string | null;
  };
  loanId: string;
}) {
  const deletePayment = useDeletePayment();
  return (
    <li className="group flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40">
      <div className="w-[86px] shrink-0 text-[12px] tabular-nums text-muted-foreground">
        {fmtDate(payment.date)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-muted-foreground">
          {methodLabel(payment.method)}
          {payment.note ? ` · ${payment.note}` : ""}
        </p>
        <p className="text-[11.5px] tabular-nums">
          <span className="text-amber-600 dark:text-amber-400">
            {fmtMoney(payment.interestPart)} interest
          </span>
          <span className="mx-1 text-border">·</span>
          <span className="text-emerald-700 dark:text-emerald-400">
            {fmtMoney(payment.principalPart)} principal
          </span>
        </p>
      </div>
      <p className="text-[14px] font-semibold tabular-nums">
        <Money value={payment.amount} />
      </p>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            aria-label="Delete payment"
            className="rounded-md p-1.5 text-muted-foreground/0 transition-colors hover:bg-red-50 hover:text-red-600 group-hover:text-muted-foreground dark:hover:bg-red-500/10"
          >
            <Trash2 className="size-3.5" />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              <Money value={payment.amount} /> received on {fmtDate(payment.date)} will be
              removed, and this loan&apos;s allocation will be recalculated. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep payment</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={async () => {
                try {
                  await deletePayment.mutateAsync(payment.id);
                  toast.success("Payment deleted — loan recalculated");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed to delete payment");
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
