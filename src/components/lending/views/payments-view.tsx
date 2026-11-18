"use client";

// Collections ledger: the complete, filterable record of every
// payment received, with interest/principal split and CSV export.

import { useMemo, useState } from "react";
import { Download, Receipt, Search } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { methodLabel, PAYMENT_METHODS } from "@/lib/types";
import { EmptyState } from "../empty-state";
import { Money } from "../money";
import { useApp } from "../store";
import { usePayments } from "../queries";

export function PaymentsView() {
  const { data: payments, isLoading } = usePayments();
  const openLoan = useApp((s) => s.openLoan);
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("all");
  const [method, setMethod] = useState("all");

  const months = useMemo(() => {
    const set = new Map<string, string>();
    for (const p of payments ?? []) {
      const d = new Date(p.date);
      const key = format(d, "yyyy-MM");
      if (!set.has(key)) set.set(key, format(d, "MMMM yyyy"));
    }
    return [...set.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [payments]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (payments ?? []).filter((p) => {
      if (month !== "all" && format(new Date(p.date), "yyyy-MM") !== month) return false;
      if (method !== "all" && p.method !== method) return false;
      if (!q) return true;
      return (
        p.clientName.toLowerCase().includes(q) ||
        p.loanReference.toLowerCase().includes(q) ||
        (p.note ?? "").toLowerCase().includes(q)
      );
    });
  }, [payments, query, month, method]);

  const totals = useMemo(() => {
    let amount = 0, interest = 0, principal = 0;
    for (const p of rows) {
      amount += p.amount;
      interest += p.interestPart;
      principal += p.principalPart;
    }
    return { amount, interest, principal, count: rows.length };
  }, [rows]);

  const exportCsv = () => {
    const header = ["Date", "Client", "Loan", "Amount", "Interest", "Principal", "Method", "Note"];
    const lines = rows.map((p) =>
      [
        format(new Date(p.date), "yyyy-MM-dd"),
        p.clientName,
        p.loanReference,
        p.amount.toFixed(2),
        p.interestPart.toFixed(2),
        p.principalPart.toFixed(2),
        methodLabel(p.method),
        (p.note ?? "").replace(/"/g, '""'),
      ]
        .map((v) => `"${v}"`)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `collections-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* summary strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Payments Shown", value: String(totals.count), tone: "text-foreground" },
          { label: "Total Collected", value: <Money value={totals.amount} />, tone: "text-emerald-700 dark:text-emerald-400" },
          { label: "Interest Portion", value: <Money value={totals.interest} />, tone: "text-amber-700 dark:text-amber-400" },
          { label: "Principal Portion", value: <Money value={totals.principal} />, tone: "text-foreground" },
        ].map((s) => (
          <div key={s.label} className="card-lux accent-top rounded-xl border bg-card p-4">
            <p className="text-[10.5px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
              {s.label}
            </p>
            <p className={cn("mt-2 font-display text-[22px] font-semibold leading-none tracking-tight", s.tone)}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <Card className="card-lux">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search client, reference or note…"
              className="pl-9"
              aria-label="Search payments"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[160px]" aria-label="Filter by month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {months.map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-[150px]" aria-label="Filter by method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-1.5" onClick={exportCsv}>
              <Download className="size-4" /> CSV
            </Button>
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-13 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No payments match"
              description="Adjust the filters, or record a new payment with the button above."
            />
          ) : (
            <div className="max-h-[640px] overflow-auto scrollbar-slim">
              <Table>
                <TableHeader className="thead-lux sticky top-0 z-10 bg-card after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="hidden sm:table-cell">Loan</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="hidden text-right md:table-cell">Interest</TableHead>
                    <TableHead className="hidden text-right md:table-cell">Principal</TableHead>
                    <TableHead className="hidden lg:table-cell">Method</TableHead>
                    <TableHead className="hidden pr-6 xl:table-cell">Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => (
                    <TableRow
                      key={p.id}
                      onClick={() => openLoan(p.loanId)}
                      className="cursor-pointer transition-colors hover:bg-emerald-50/60 dark:hover:bg-emerald-500/[0.06]"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && openLoan(p.loanId)}
                    >
                      <TableCell className="py-3 pl-6 text-[12.5px] tabular-nums text-muted-foreground">
                        {format(new Date(p.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-[13.5px] font-medium">{p.clientName}</TableCell>
                      <TableCell className="hidden font-mono text-[11.5px] text-muted-foreground sm:table-cell">
                        {p.loanReference}
                      </TableCell>
                      <TableCell className="text-right text-[13.5px] font-semibold">
                        <span className="rounded-lg bg-emerald-50 px-2 py-1 font-display text-emerald-800 tabular-nums dark:bg-emerald-500/10 dark:text-emerald-300">
                          <Money value={p.amount} />
                        </span>
                      </TableCell>
                      <TableCell className="hidden text-right text-[12.5px] tabular-nums text-amber-700 dark:text-amber-400 md:table-cell">
                        {fmtMoney(p.interestPart)}
                      </TableCell>
                      <TableCell className="hidden text-right text-[12.5px] tabular-nums text-emerald-700 dark:text-emerald-400 md:table-cell">
                        {fmtMoney(p.principalPart)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {methodLabel(p.method)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden max-w-[180px] truncate pr-6 text-[12px] text-muted-foreground xl:table-cell">
                        {p.note ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
