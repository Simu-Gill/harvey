"use client";

// Loan book: every disbursement with live position, filterable by
// status. Row click opens the full loan sheet with schedule.

import { useMemo, useState } from "react";
import { ChevronRight, Landmark, Plus, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtDateShort } from "@/lib/format";
import type { LoanDTO, LoanStatus } from "@/lib/types";
import { EmptyState } from "../empty-state";
import { Money } from "../money";
import { StatusBadge } from "../status-badge";
import { useApp } from "../store";
import { useLoans } from "../queries";
import { cn } from "@/lib/utils";

type Tab = "all" | LoanStatus;

export function LoansView() {
  const { data: loans, isLoading } = useLoans();
  const openLoan = useApp((s) => s.openLoan);
  const openLoanDialog = useApp((s) => s.openLoanDialog);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const list = loans ?? [];
    return {
      all: list.length,
      on_track: list.filter((l) => l.status === "on_track").length,
      behind: list.filter((l) => l.status === "behind").length,
      overdue: list.filter((l) => l.status === "overdue").length,
      completed: list.filter((l) => l.status === "completed").length,
    };
  }, [loans]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (loans ?? []).filter((l) => {
      if (tab !== "all" && l.status !== tab) return false;
      if (!q) return true;
      return (
        l.clientName.toLowerCase().includes(q) || l.reference.toLowerCase().includes(q)
      );
    });
  }, [loans, tab, query]);

  return (
    <div className="space-y-5">
      <Card className="card-lux">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
          <div className="-mx-1 overflow-x-auto px-1 pb-0.5 scrollbar-slim">
            <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList className="h-9">
              {(
                [
                  ["all", "All"],
                  ["on_track", "On Track"],
                  ["behind", "Behind"],
                  ["overdue", "Overdue"],
                  ["completed", "Settled"],
                ] as [Tab, string][]
              ).map(([value, label]) => (
                <TabsTrigger key={value} value={value} className="h-7 px-3 text-[12.5px]">
                  {label}
                  <span className="ml-1.5 tabular-nums text-muted-foreground">
                    {counts[value]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            </Tabs>
          </div>
          <div className="relative flex-1 lg:max-w-xs">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search client or reference…"
              className="pl-9"
              aria-label="Search loans"
            />
          </div>
          <Button className="gap-1.5 font-medium" onClick={() => openLoanDialog()}>
            <Plus className="size-4" /> New Loan
          </Button>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Landmark}
              title="No loans here"
              description="No loans match this filter yet."
            />
          ) : (
            <div className="overflow-x-auto scrollbar-slim">
              <Table>
                <TableHeader className="thead-lux">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Loan</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="hidden lg:table-cell">Terms</TableHead>
                    <TableHead className="hidden md:table-cell">Maturity</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Progress</TableHead>
                    <TableHead className="pr-6 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((l) => (
                    <LoanRow key={l.id} loan={l} onOpen={() => openLoan(l.id)} />
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

function LoanRow({ loan, onOpen }: { loan: LoanDTO; onOpen: () => void }) {
  return (
    <TableRow onClick={onOpen} className="group cursor-pointer transition-colors hover:bg-emerald-50/60 dark:hover:bg-emerald-500/[0.06]" tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
    >
      <TableCell className="py-3.5 pl-6">
        <p className="font-mono text-[12px] font-semibold text-emerald-800 dark:text-emerald-400">{loan.reference}</p>
        <p className="text-[11.5px] text-muted-foreground">
          {fmtDateShort(loan.startDate)} · <Money value={loan.principal} />
        </p>
      </TableCell>
      <TableCell className="text-[13.5px] font-medium">{loan.clientName}</TableCell>
      <TableCell className="hidden text-[12.5px] text-muted-foreground lg:table-cell">
        {loan.interestRate}%{loan.rateUnit === "monthly" ? "/mo" : " flat"} · {loan.termMonths} mo
      </TableCell>
      <TableCell className="hidden text-[12.5px] md:table-cell">
        <span className={cn(loan.daysOverdue > 0 && "font-medium text-red-600 dark:text-red-400")}>
          {fmtDateShort(loan.maturityDate)}
        </span>
        {loan.daysOverdue > 0 && (
          <span className="block text-[11px] text-red-500">{loan.daysOverdue}d late</span>
        )}
      </TableCell>
      <TableCell className="text-right text-[13px] tabular-nums text-muted-foreground">
        <Money value={loan.paidTotal} />
      </TableCell>
      <TableCell className="text-right text-[13.5px] font-semibold">
        {loan.status === "completed" ? (
          <span className="font-normal text-muted-foreground">Settled</span>
        ) : (
          <Money value={loan.balance} />
        )}
      </TableCell>
      <TableCell className="hidden w-32 pr-4 sm:table-cell">
        <div className="ml-auto flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted shadow-[inset_0_1px_2px_oklch(0_0_0/0.06)]">
            <div
              className={cn(
                "h-full rounded-full",
                loan.status === "overdue"
                  ? "bg-gradient-to-r from-red-500 to-rose-500"
                  : loan.status === "behind"
                    ? "bg-gradient-to-r from-amber-400 to-orange-500"
                    : "bg-gradient-to-r from-emerald-500 to-teal-500"
              )}
              style={{ width: `${Math.round(loan.progress * 100)}%` }}
            />
          </div>
          <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">
            {Math.round(loan.progress * 100)}%
          </span>
        </div>
      </TableCell>
      <TableCell className="py-3.5 pr-6 text-right">
        <span className="inline-flex items-center gap-1.5">
          <StatusBadge status={loan.status} />
          <ChevronRight className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
        </span>
      </TableCell>
    </TableRow>
  );
}
