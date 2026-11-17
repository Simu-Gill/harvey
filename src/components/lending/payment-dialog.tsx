"use client";

// Record payment dialog — the daily workhorse. Pick a loan, type any
// amount, and see exactly how it splits between interest and principal
// and what remains — before you save.

import { useState } from "react";
import { Loader2, Wallet } from "lucide-react";
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
import { fmtMoney, toInputDate, methodLabel } from "@/lib/format";
import { PAYMENT_METHODS, type LoanDTO } from "@/lib/types";
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
          Payments clear accrued interest first, then reduce principal.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label className="text-[12.5px] text-muted-foreground">
          Loan <span className="text-red-500">*</span>
        </Label>
        {locked && loan ? (
          <div className="rounded-lg border bg-muted/40 px-3.5 py-2.5">
            <p className="text-[13.5px] font-medium">{loan.clientName}</p>
            <p className="text-[12px] text-muted-foreground">
              {loan.reference} · balance <Money value={loan.balance} />
            </p>
          </div>
        ) : (
          <Select value={loanId || undefined} onValueChange={setLoanId}>
            <SelectTrigger>
              <SelectValue placeholder="Select loan…" />
            </SelectTrigger>
            <SelectContent>
              {activeLoans.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.clientName} — {l.reference} (bal {fmtMoney(l.balance)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[12.5px] text-muted-foreground">
            Amount received <span className="text-red-500">*</span>
          </Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            placeholder="e.g. 1300"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={cn(exceeds && "border-red-400 focus-visible:ring-red-300")}
          />
          {loan && (
            <button
              type="button"
              onClick={() => setAmount(String(loan.balance))}
              className="text-[11.5px] font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            >
              Pay full balance ({fmtMoney(loan.balance)})
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12.5px] text-muted-foreground">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[12.5px] text-muted-foreground">Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger>
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
        <div className="space-y-1.5">
          <Label className="text-[12.5px] text-muted-foreground">Note</Label>
          <Input
            placeholder="e.g. Interest only"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
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
