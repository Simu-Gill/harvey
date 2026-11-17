"use client";

// New loan dialog with a live terms preview: as the officer types,
// the fixed interest, total obligation, monthly instalment and
// maturity date update instantly — no surprises at disbursement.

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { addMonths, format } from "date-fns";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  totalInterestOf,
  totalDueOf,
  installmentOf,
} from "@/lib/loan-math";
import { toInputDate } from "@/lib/format";
import { useApp } from "./store";
import { useClients, useCreateLoan, useSettings } from "./queries";
import { Money } from "./money";

export function LoanDialog() {
  const loanDialogClientId = useApp((s) => s.loanDialogClientId);
  const closeLoanDialog = useApp((s) => s.closeLoanDialog);
  const openClientDialog = useApp((s) => s.openClientDialog);
  const openLoan = useApp((s) => s.openLoan);

  const { data: clients } = useClients();
  const { data: settings } = useSettings();
  const createLoan = useCreateLoan();

  const form = useForm({
    defaultValues: {
      clientId: "",
      principal: "" as string | number,
      interestRate: "" as string | number,
      rateUnit: "monthly" as "monthly" | "term",
      termMonths: "" as string | number,
      startDate: toInputDate(),
      notes: "",
    },
  });

  // prefill from settings & context each time it opens
  useEffect(() => {
    if (loanDialogClientId !== undefined) {
      form.reset({
        clientId: loanDialogClientId ?? "",
        principal: "",
        interestRate: settings?.defaultRate ?? 10,
        rateUnit: settings?.rateUnit ?? "monthly",
        termMonths: settings?.defaultTerm ?? 3,
        startDate: toInputDate(),
        notes: "",
      });
    }
  }, [loanDialogClientId, settings, form]);

  const values = form.watch();
  const principal = Number(values.principal) || 0;
  const rate = Number(values.interestRate) || 0;
  const term = Math.max(1, Number(values.termMonths) || 0);
  const startDate = values.startDate ? new Date(values.startDate) : new Date();

  const preview = useMemo(() => {
    const core = {
      principal,
      interestRate: rate,
      rateUnit: values.rateUnit,
      termMonths: term,
      startDate,
    };
    const ti = principal > 0 && rate >= 0 && term > 0 ? totalInterestOf(core) : 0;
    const due = principal > 0 ? totalDueOf(core) : 0;
    const inst = principal > 0 && term > 0 ? installmentOf(core) : 0;
    return {
      totalInterest: ti,
      totalDue: due,
      installment: inst,
      monthlyInterest: term > 0 ? ti / term : 0,
      maturity: principal > 0 ? addMonths(startDate, term) : null,
    };
  }, [principal, rate, term, startDate, values.rateUnit]);

  const canSubmit =
    !!values.clientId && principal > 0 && rate >= 0 && term >= 1 && !!values.startDate;

  const onSubmit = async () => {
    try {
      const loan = await createLoan.mutateAsync({
        clientId: values.clientId,
        principal,
        interestRate: rate,
        rateUnit: values.rateUnit,
        termMonths: term,
        startDate: values.startDate,
        notes: (values.notes as string)?.trim() || null,
      });
      toast.success(`Loan ${loan.reference} disbursed to ${loan.clientName}`, {
        description: `${principal.toLocaleString()} at ${rate}%${values.rateUnit === "monthly" ? "/mo" : " flat"} for ${term} months`,
      });
      closeLoanDialog();
      openLoan(loan.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create loan");
    }
  };

  return (
    <Dialog
      open={loanDialogClientId !== undefined}
      onOpenChange={(o) => !o && closeLoanDialog()}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">New Loan</DialogTitle>
          <DialogDescription>
            Disburse a new flat-interest loan. The terms preview updates as you type.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* form side */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[12.5px] text-muted-foreground">
                  Client <span className="text-red-500">*</span>
                </Label>
                {clients && clients.length > 0 ? (
                  <Select
                    value={values.clientId || undefined}
                    onValueChange={(v) => form.setValue("clientId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select borrower…" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => openClientDialog()}
                  >
                    Register a client first
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[12.5px] text-muted-foreground">
                  Principal amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  step="0.01"
                  placeholder="e.g. 3000"
                  {...form.register("principal")}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[12.5px] text-muted-foreground">Interest rate</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    placeholder="10"
                    {...form.register("interestRate")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12.5px] text-muted-foreground">Rate basis</Label>
                  <Select
                    value={values.rateUnit}
                    onValueChange={(v) => form.setValue("rateUnit", v as "monthly" | "term")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">% per month</SelectItem>
                      <SelectItem value="term">% whole term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[12.5px] text-muted-foreground">
                    Term (months) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    placeholder="3"
                    {...form.register("termMonths")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12.5px] text-muted-foreground">Start date</Label>
                  <Input type="date" {...form.register("startDate")} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[12.5px] text-muted-foreground">Purpose / notes</Label>
                <Textarea
                  rows={2}
                  placeholder="e.g. Stock expansion — Kantamanto shop"
                  {...form.register("notes")}
                />
              </div>
            </div>

            {/* preview side */}
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Terms Preview
              </p>
              <dl className="mt-3 space-y-3">
                <PreviewRow
                  label={`Fixed interest (${rate || 0}%${values.rateUnit === "monthly" ? "/mo" : " flat"})`}
                  value={<Money value={preview.totalInterest} cents />}
                  hint={
                    values.rateUnit === "monthly"
                      ? `${preview.monthlyInterest ? preview.monthlyInterest.toFixed(2) : "0"} per month`
                      : "one-off for the term"
                  }
                />
                <PreviewRow
                  label="Total obligation"
                  value={<Money value={preview.totalDue} cents />}
                  hint="principal + interest"
                  strong
                />
                <PreviewRow
                  label="Expected instalment"
                  value={<Money value={preview.installment} cents />}
                  hint={`per month × ${term || 0}`}
                />
                <PreviewRow
                  label="Matures"
                  value={
                    <span className="tabular-nums">
                      {preview.maturity ? format(preview.maturity, "MMM d, yyyy") : "—"}
                    </span>
                  }
                  hint={`${term || 0} months from start`}
                />
              </dl>
              <p className="mt-4 rounded-md bg-emerald-50 p-2.5 text-[11.5px] leading-relaxed text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                Interest is fixed for the full term — it never compounds, and paying early
                never adds interest.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={closeLoanDialog}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || form.formState.isSubmitting} className="gap-1.5">
              {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Disburse Loan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PreviewRow({
  label,
  value,
  hint,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[12.5px] text-muted-foreground">
        {label}
        {hint && <span className="block text-[10.5px] opacity-75">{hint}</span>}
      </dt>
      <dd className={`text-right text-[14px] tabular-nums ${strong ? "font-semibold" : "font-medium"}`}>
        {value}
      </dd>
    </div>
  );
}
