"use client";

// Client detail drawer: full borrower profile, every loan, and the
// complete payment history across all their loans.

import {
  BadgeCheck,
  HandCoins,
  Landmark,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Receipt,
  ScrollText,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import { fmtDate, fmtDateShort, fmtMoney, methodLabel } from "@/lib/format";
import { ClientAvatar } from "./client-avatar";
import { Money } from "./money";
import { StatusBadge } from "./status-badge";
import { useApp } from "./store";
import { useClientDetail, useDeleteClient } from "./queries";

export function ClientSheet() {
  const clientSheetId = useApp((s) => s.clientSheetId);
  const closeClient = useApp((s) => s.closeClient);
  const openLoan = useApp((s) => s.openLoan);
  const openLoanDialog = useApp((s) => s.openLoanDialog);
  const openPaymentDialog = useApp((s) => s.openPaymentDialog);
  const openClientDialog = useApp((s) => s.openClientDialog);

  const { data, isLoading } = useClientDetail(clientSheetId);
  const deleteClient = useDeleteClient();

  const client = data?.client;
  const activeLoanId = data?.loans.find((l) => l.status !== "completed")?.id;

  return (
    <Sheet open={!!clientSheetId} onOpenChange={(o) => !o && closeClient()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <SheetHeader className="space-y-0 border-b bg-muted/40 p-6">
          {isLoading || !client ? (
            <div className="space-y-2">
              <div className="h-6 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-64 animate-pulse rounded bg-muted" />
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <ClientAvatar name={client.name} className="size-14 text-lg" />
              <div className="min-w-0 flex-1">
                <SheetTitle className="truncate font-display text-xl leading-tight">
                  {client.name}
                </SheetTitle>
                <SheetDescription className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>{client.occupation ?? "Borrower"}</span>
                  <span className="text-border">·</span>
                  <span>Client since {fmtDate(client.createdAt)}</span>
                  {client.activeLoanCount > 0 && <StatusBadge status={client.health} />}
                </SheetDescription>
              </div>
              <StatusBadge status={client.health} className="mt-1" />
            </div>
          )}

          {client && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" className="h-8 gap-1.5" onClick={() => openLoanDialog(client.id)}>
                <Landmark className="size-3.5" /> New Loan
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                onClick={() => openPaymentDialog(activeLoanId)}
              >
                <HandCoins className="size-3.5" /> Record Payment
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5"
                onClick={() => openClientDialog(client.id)}
              >
                <Pencil className="size-3.5" /> Edit
              </Button>
            </div>
          )}
        </SheetHeader>

        {client && data && (
          <div className="flex-1 overflow-y-auto scrollbar-slim">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-px border-b bg-border sm:grid-cols-4">
              {[
                { label: "Total Borrowed", value: <Money value={client.totalBorrowed} /> },
                { label: "Outstanding", value: <Money value={client.outstandingBalance} className="font-semibold" /> },
                { label: "Interest Paid", value: <Money value={client.interestPaidToDate} /> },
                {
                  label: "Loans",
                  value: (
                    <span>
                      <span className="font-semibold">{client.activeLoanCount}</span>
                      <span className="text-muted-foreground"> active / {client.loanCount}</span>
                    </span>
                  ),
                },
              ].map((s) => (
                <div key={s.label} className="bg-card p-4">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {s.label}
                  </p>
                  <p className="mt-1 text-[15px]">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 border-b p-6 sm:grid-cols-2">
              <ContactLine icon={Phone} label="Phone" value={client.phone} />
              <ContactLine icon={Mail} label="Email" value={client.email} />
              <ContactLine icon={MapPin} label="Address" value={client.address} />
              <ContactLine icon={BadgeCheck} label="ID Number" value={client.idNumber} />
            </div>

            {/* Loans */}
            <section className="border-b p-6">
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Loan History
              </h3>
              {data.loans.length === 0 ? (
                <p className="mt-3 text-[13px] text-muted-foreground">
                  No loans yet for this client.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {data.loans.map((l) => (
                    <li key={l.id}>
                      <button
                        onClick={() => openLoan(l.id)}
                        className="group flex w-full items-center gap-4 rounded-lg border bg-card p-3.5 text-left transition-colors hover:border-emerald-600/30 hover:bg-accent/40"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                            {l.reference}
                            <StatusBadge status={l.status} className="px-2 py-0 text-[10px]" />
                          </p>
                          <p className="mt-1 text-[13px]">
                            <Money value={l.principal} /> principal ·{" "}
                            <span className="text-muted-foreground">
                              {l.interestRate}%{l.rateUnit === "monthly" ? "/mo" : " flat"} ·{" "}
                              {l.termMonths} mo
                            </span>
                          </p>
                          <div className="mt-2 h-1.5 w-full max-w-[240px] overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
                              style={{ width: `${Math.round(l.progress * 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[15px] font-semibold">
                            {l.status === "completed" ? (
                              <span className="text-muted-foreground">Settled</span>
                            ) : (
                              <Money value={l.balance} />
                            )}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {Math.round(l.progress * 100)}% collected
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Payment history */}
            <section className="border-b p-6">
              <h3 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                <Receipt className="size-4" /> Payment History
              </h3>
              {data.payments.length === 0 ? (
                <p className="mt-3 text-[13px] text-muted-foreground">
                  No payments received yet.
                </p>
              ) : (
                <ul className="mt-3 max-h-96 divide-y overflow-y-auto rounded-lg border scrollbar-slim">
                  {data.payments.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="w-16 shrink-0 text-[12px] tabular-nums text-muted-foreground">
                        {fmtDateShort(p.date)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[11px] text-muted-foreground">{p.loanReference}</p>
                        <p className="text-[12px] text-muted-foreground">
                          {methodLabel(p.method)}
                          {p.note ? ` · ${p.note}` : ""}
                        </p>
                      </div>
                      <div className="hidden text-right text-[11px] text-muted-foreground sm:block">
                        <span className="tabular-nums text-amber-600 dark:text-amber-400">
                          {fmtMoney(p.interestPart)}
                        </span>{" "}
                        int ·{" "}
                        <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
                          {fmtMoney(p.principalPart)}
                        </span>{" "}
                        prin
                      </div>
                      <p className="w-20 text-right text-[13.5px] font-semibold">
                        <Money value={p.amount} />
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Notes + danger zone */}
            <section className="p-6">
              {client.notes && (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    <ScrollText className="size-3.5" /> Notes
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/80">
                    {client.notes}
                  </p>
                </div>
              )}

              {client.loanCount === 0 && (
                <>
                  <Separator className="my-5" />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10">
                        <Trash2 className="size-3.5" /> Remove client
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove {client.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This client has no loans on record. The record will be permanently
                          deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 text-white hover:bg-red-700"
                          onClick={async () => {
                            try {
                              await deleteClient.mutateAsync(client.id);
                              toast.success(`${client.name} removed`);
                              useApp.getState().closeClient();
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Failed to remove client");
                            }
                          }}
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ContactLine({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-[13px] text-foreground">{value ?? "—"}</p>
      </div>
    </div>
  );
}
