"use client";

// Record payment dialog — the daily workhorse. Pick a loan, type any
// amount, and see exactly how it splits between interest and principal
// and what remains — before you save.

import { useState } from "react";
import { Landmark, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { allocatePayment } from "@/lib/loan-math";
import { fmtMoney, toInputDate } from "@/lib/format";
import { methodLabel, PAYMENT_METHODS, type LoanDTO } from "@/lib/types";
import { Money } from "./money";
import { useApp } from "./store";
import { useCreatePayment, useLoans } from "./queries";
import { cn } from "@/lib/utils";

export function PaymentDialog() {
  const paymentDialogLoanId = useApp((s) => s.paymentDialogLoanId);
  const closePaymentDialog = useApp((s) => s.closePaymentDialog);
  const { data: loans } = useLoans();

  const activeLoans = (loans ?? []).filter((l) => l.status !== "completed");

  return (
    <Dialog
      open={paymentDialogLoanId !== undefined}
      onOpenChange={(o) => !o && closePaymentDialog()}
    >
      <DialogContent className="sm:max-w-xl">
        {activeLoans.length === 0 ? (
          <div className="pb-2 text-center">
            <DialogHeader>
              <DialogTitle className="font-display text-lg">Record Payment</DialogTitle>
              <DialogDescription className="mt-2">
                No active loans — every loan in the book is fully settled.
              </DialogDescription>
            </DialogHeader>
          </div>
        ) : (
          // remount per open so the form starts fresh
          <PaymentForm
            key={String(paymentDialogLoanId)}
            initialLoanId={paymentDialogLoanId ?? null}
            activeLoans={activeLoans}
            onClose={closePaymentDialog}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PaymentForm({
  initialLoanId,
  activeLoans,
  onClose,
}: {
  initialLoanId: string | null;
  activeLoans: LoanDTO[];
  onClose: () => void;
}) {
  const createPayment = useCreatePayment();

  const locked = !!initialLoanId;
  const [loanId, setLoanId] = useState<string>(initialLoanId ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(toInputDate());
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");

  const loan = activeLoans.find((l) => l.id === loanId) ?? null;

  const amt = Number(amount) || 0;

  // live allocation preview — same engine as the server
  let preview: ReturnType<typeof allocatePayment> | null = null;
  let exceeds = false;
  if (loan) {
    const core = {
      principal: loan.principal,
      interestRate: loan.interestRate,
      rateUnit: loan.rateUnit,
      termMonths: loan.termMonths,
      startDate: loan.startDate,
    };
    const prior = [{ interestPart: loan.interestPaid, principalPart: loan.principalPaid }];
    preview = allocatePayment(core, prior, amt, new Date(date));
    exceeds = amt > preview.balanceBefore + 0.005;
  }

  const canSubmit = !!loan && amt > 0 && !exceeds && !!date;

  const onSubmit = async () => {
    if (!loan || !preview) return;
    try {
      await createPayment.mutateAsync({
        loanId: loan.id,
        amount: amt,
        date,
        method,
        note: note.trim() || null,
      });
      toast.success(`${fmtMoney(amt)} received from ${loan.clientName}`, {
        description: `${fmtMoney(preview.interestPart)} interest · ${fmtMoney(preview.principalPart)} principal${
          preview.balanceAfter > 0.005
            ? ` · balance ${fmtMoney(preview.balanceAfter)}`
            : " · loan settled"
        }`,
      });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record payment");
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit();
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle className="font-display text-lg">Record Payment</DialogTitle>
        <DialogDescription>
          Payments clear interest first, then reduce principal.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label className="text-[12.5px] text-muted-foreground">
          Loan <span className="text-red-500">*</span>
        </Label>
        {locked && loan ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/60 px-3.5 py-3 dark:border-emerald-900/70 dark:bg-emerald-950/20">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <Landmark className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold">{loan.clientName}</p>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                {loan.reference} · {fmtMoney(loan.monthlyInstallment)}/month
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Balance</p>
              <p className="mt-0.5 text-[13px] font-semibold tabular-nums"><Money value={loan.balance} /></p>
            </div>
          </div>
        ) : (
          <Select value={loanId || undefined} onValueChange={setLoanId}>
            <SelectTrigger
              className={cn(
                "h-auto min-h-14 w-full rounded-xl px-3.5 py-2.5 text-left",
                loan &&
                  "border-emerald-200 bg-emerald-50/70 shadow-[0_1px_0_rgba(5,150,105,0.06)] hover:bg-emerald-50 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:hover:bg-emerald-950/35"
              )}
            >
              {loan ? (
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                    <Landmark className="size-4" />
                  </span>
                  <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_5.75rem_5.75rem] items-center gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold text-foreground">{loan.clientName}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{loan.reference}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Monthly</span>
                      <span className="mt-0.5 block text-[12px] font-medium tabular-nums text-foreground">{fmtMoney(loan.monthlyInstallment)}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Balance</span>
                      <span className="mt-0.5 block text-[12px] font-semibold tabular-nums text-foreground">{fmtMoney(loan.balance)}</span>
                    </span>
                  </span>
                </div>
              ) : (
                <div className="flex flex-1 items-center gap-3 text-muted-foreground">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
                    <Landmark className="size-4" />
                  </span>
                  <span className="text-[13px]">Choose a client loan</span>
                </div>
              )}
            </SelectTrigger>
            <SelectContent className="max-h-72 rounded-xl p-1 [&_[data-slot=select-scroll-down-button]]:hidden [&_[data-slot=select-scroll-up-button]]:hidden [&_[data-slot=select-viewport]]:pt-0">
              <div className="sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_6rem_6rem] gap-3 rounded-t-[10px] border-b border-emerald-200/80 bg-emerald-100/95 pb-2 pl-3 pr-9 pt-2 text-[9px] font-bold uppercase tracking-[0.09em] text-emerald-900 shadow-[0_1px_0_rgba(5,150,105,0.06)] backdrop-blur-sm dark:border-emerald-800/80 dark:bg-emerald-950/95 dark:text-emerald-200">
                <span>Client &amp; loan</span>
                <span className="text-right">Monthly</span>
                <span className="pr-1 text-right">Balance</span>
              </div>
              {activeLoans.map((l) => (
                <SelectItem
                  key={l.id}
                  value={l.id}
                  className="my-0.5 rounded-lg border border-transparent bg-muted/20 py-2.5 pr-9 pl-3 even:bg-emerald-50/45 focus:border-emerald-200 focus:bg-emerald-50 data-[state=checked]:border-emerald-200 data-[state=checked]:bg-emerald-100/80 dark:even:bg-emerald-950/20 dark:focus:border-emerald-800 dark:focus:bg-emerald-950/40 dark:data-[state=checked]:border-emerald-800 dark:data-[state=checked]:bg-emerald-900/35"
                >
                  <span className="grid w-[calc(var(--radix-select-trigger-width)-3.5rem)] min-w-0 shrink-0 grid-cols-[minmax(0,1fr)_6rem_6rem] items-center gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold">{l.clientName}</span>
                      <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">{l.reference}</span>
                    </span>
                    <span className="text-right text-[11.5px] font-medium tabular-nums">{fmtMoney(l.monthlyInstallment)}</span>
                    <span className="pr-1 text-right text-[11.5px] font-semibold tabular-nums">{fmtMoney(l.balance)}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr_1fr]">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-[12.5px] text-muted-foreground">
              Amount received <span className="text-red-500">*</span>
            </Label>
            {loan && (
              <button
                type="button"
                onClick={() => setAmount(String(loan.balance))}
                className="shrink-0 text-[10.5px] font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
              >
                Full balance
              </button>
            )}
          </div>
          <Input
            type="number"
            min={0}
            step="0.01"
            placeholder="e.g. 1300"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={cn(exceeds && "border-red-400 focus-visible:ring-red-300")}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12.5px] text-muted-foreground">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12.5px] text-muted-foreground">Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[12.5px] text-muted-foreground">Note</Label>
        <Input
          placeholder="Optional payment note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full"
        />
      </div>

      {/* allocation preview */}
      {loan && preview && amt > 0 && (
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <Wallet className="size-3.5" /> Allocation Preview
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-amber-50 p-2.5 dark:bg-amber-500/10">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Interest
              </p>
              <p className="mt-1 text-[14.5px] font-semibold tabular-nums text-amber-800 dark:text-amber-200">
                {fmtMoney(preview.interestPart)}
              </p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-2.5 dark:bg-emerald-500/10">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Principal
              </p>
              <p className="mt-1 text-[14.5px] font-semibold tabular-nums text-emerald-800 dark:text-emerald-200">
                {fmtMoney(preview.principalPart)}
              </p>
            </div>
            <div className="rounded-lg bg-card p-2.5 ring-1 ring-border">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                Balance after
              </p>
              <p className="mt-1 text-[14.5px] font-semibold tabular-nums">
                {fmtMoney(Math.max(0, preview.balanceAfter))}
              </p>
            </div>
          </div>
          {preview.balanceAfter <= 0.005 && !exceeds && (
            <p className="mt-3 rounded-md bg-emerald-600 p-2 text-center text-[12px] font-medium text-white">
              This settles the loan in full.
            </p>
          )}
          {exceeds && (
            <p className="mt-3 rounded-md bg-red-50 p-2 text-center text-[12px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
              Exceeds the remaining balance of {fmtMoney(preview.balanceBefore)}.
            </p>
          )}
        </div>
      )}

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!canSubmit || createPayment.isPending} className="gap-1.5">
          {createPayment.isPending && <Loader2 className="size-4 animate-spin" />}
          Save Payment
        </Button>
      </DialogFooter>
    </form>
  );
}
