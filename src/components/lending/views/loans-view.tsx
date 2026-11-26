"use client";

// Loan book: every disbursement with live position. Status KPIs up top,
// a refined segmented filter, and rows washed by status colour.

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock,
  Landmark,
  Plus,
  Search,
  TriangleAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const STATUS_META: Record<
  LoanStatus,
  {
    label: string;
    icon: React.ElementType;
    value: string; // foreground tone
    chip: string; // icon tile
    tint: string; // row wash
    hover: string;
  }
> = {
  on_track: {
    label: "On Track",
    icon: CircleDashed,
    value: "text-emerald-700 dark:text-emerald-400",
    chip: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25",
    tint: "bg-emerald-50/40 dark:bg-emerald-500/[0.045]",
    hover: "hover:bg-emerald-50/80 focus-visible:bg-emerald-50/80 dark:hover:bg-emerald-500/[0.09] dark:focus-visible:bg-emerald-500/[0.09]",
  },
  behind: {
    label: "Behind",
    icon: Clock,
    value: "text-amber-700 dark:text-amber-400",
    chip: "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/25",
    tint: "bg-amber-50/50 dark:bg-amber-500/[0.055]",
    hover: "hover:bg-amber-50/90 focus-visible:bg-amber-50/90 dark:hover:bg-amber-500/[0.1] dark:focus-visible:bg-amber-500/[0.1]",
  },
  overdue: {
    label: "Overdue",
    icon: TriangleAlert,
    value: "text-red-600 dark:text-red-400",
    chip: "bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-md shadow-red-500/25",
    tint: "bg-red-50/50 dark:bg-red-500/[0.06]",
    hover: "hover:bg-red-50/90 focus-visible:bg-red-50/90 dark:hover:bg-red-500/[0.11] dark:focus-visible:bg-red-500/[0.11]",
  },
  completed: {
    label: "Settled",
    icon: CheckCircle2,
    value: "text-stone-600 dark:text-stone-300",
    chip: "bg-gradient-to-br from-stone-500 to-stone-700 text-white shadow-md shadow-stone-500/20",
    tint: "bg-stone-100/60 dark:bg-stone-500/[0.06]",
    hover: "hover:bg-stone-100 dark:hover:bg-stone-500/[0.1]",
  },
};

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

  const TABS: [Tab, string][] = [
    ["all", "All"],
    ["on_track", "On Track"],
    ["behind", "Behind"],
    ["overdue", "Overdue"],
    ["completed", "Settled"],
  ];

  return (
    <div className="space-y-5">
      {/* status KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(Object.keys(STATUS_META) as LoanStatus[]).map((s) => {
          const meta = STATUS_META[s];
          const Icon = meta.icon;
          return (
            <button
              key={s}
              onClick={() => setTab(tab === s ? "all" : s)}
              aria-pressed={tab === s}
              className={cn(
                "card-lux accent-top group relative min-w-0 overflow-hidden rounded-xl border bg-card p-3.5 text-left transition-all duration-200",
                "hover:-translate-y-0.5 hover:border-ring/40",
                tab === s && "border-emerald-500/40 ring-2 ring-emerald-500/20"
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={cn(
                    "inline-flex size-9 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105",
                    meta.chip
                  )}
                >
                  <Icon className="size-[17px]" strokeWidth={2.2} />
                </span>
                <p className="text-[10.5px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                  {meta.label}
                </p>
              </div>
              <p
                className={cn(
                  "mt-3 font-display text-[26px] leading-none font-semibold tracking-tight tabular-nums",
                  meta.value
                )}
              >
                {counts[s]}
              </p>
              <p className="mt-1.5 text-[11.5px] text-muted-foreground">
                {s === "completed" ? "fully repaid" : "loans"} · click to filter
              </p>
            </button>
          );
        })}
      </div>

      <Card className="card-lux gap-0 overflow-hidden py-0">
        <div className="relative overflow-hidden border-b border-emerald-200/70 bg-gradient-to-r from-emerald-100 via-teal-50 to-amber-100/80 p-4 dark:border-emerald-500/20 dark:from-emerald-500/[0.16] dark:via-teal-500/[0.1] dark:to-amber-500/[0.09]">
          <div aria-hidden className="pointer-events-none absolute -top-16 left-24 size-40 rounded-full bg-emerald-300/15 blur-3xl dark:bg-emerald-400/[0.06]" />
          <div className="relative space-y-3.5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
                  <Landmark className="size-[18px]" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[9.5px] font-semibold tracking-[0.16em] text-emerald-700 uppercase dark:text-emerald-400">Lending book</p>
                  <h2 className="font-display text-[17px] font-semibold leading-tight tracking-tight">Loan portfolio</h2>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">{rows.length} records match the current view</p>
                </div>
              </div>
              <div className="flex items-center gap-2 lg:translate-y-2">
                <div className="relative min-w-0 flex-1 sm:w-[280px] sm:flex-none">
                  <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-emerald-700/60 dark:text-emerald-400/70" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search client or reference…"
                    className="h-10 border-emerald-300/80 bg-emerald-50/90 pl-9 shadow-sm dark:border-emerald-500/25 dark:bg-emerald-950/35"
                    aria-label="Search loans"
                  />
                </div>
                <Button className="h-10 gap-1.5 font-medium shadow-sm" onClick={() => openLoanDialog()}>
                  <Plus className="size-4" /> New Loan
                </Button>
              </div>
            </div>
            <div className="-mx-1 overflow-x-auto px-1 pb-0.5 scrollbar-slim">
              <div role="tablist" aria-label="Filter loans by status" className="inline-flex items-center gap-1 rounded-xl border border-slate-300/80 bg-slate-200/80 p-1 shadow-sm dark:border-slate-500/30 dark:bg-slate-900/45">
                {TABS.map(([value, label]) => {
                  const active = tab === value;
                  return (
                    <button key={value} role="tab" aria-selected={active} onClick={() => setTab(value)} className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium whitespace-nowrap transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/60",
                      active ? "border border-emerald-800/20 bg-emerald-700 text-white shadow-sm dark:bg-emerald-500 dark:text-emerald-950" : "border border-slate-300/80 bg-white/85 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900 dark:border-slate-600/40 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-100"
                    )}>
                      {label}
                      <span
                      className={cn(
                        "rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums",
                        active ? "bg-white/20 text-white dark:bg-emerald-950/20 dark:text-emerald-950" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                      )}
                      >{counts[value]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
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
  const meta = STATUS_META[loan.status];
  return (
    <TableRow
      onClick={onOpen}
      className={cn(
        "group cursor-pointer transition-colors",
        meta.tint,
        meta.hover,
        "focus-visible:outline-2 focus-visible:outline-emerald-500/40"
      )}
      tabIndex={0}
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
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/60 shadow-[inset_0_1px_2px_oklch(0_0_0/0.08)] dark:bg-white/10">
            <div
              className={cn(
                "h-full rounded-full",
                loan.status === "overdue"
                  ? "bg-gradient-to-r from-red-500 to-rose-500"
                  : loan.status === "behind"
                    ? "bg-gradient-to-r from-amber-400 to-orange-500"
                    : loan.status === "completed"
                      ? "bg-gradient-to-r from-stone-400 to-stone-500"
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
