"use client";

// Reports: monthly performance, aging of the active book,
// borrower concentration, and portfolio statistics.

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtAxis, fmtMoney } from "@/lib/format";
import { EmptyState } from "../empty-state";
import { Money, useCurrency } from "../money";
import { PageSkeleton } from "../app-shell";
import { niceTicks } from "./dashboard-view";
import { useApp } from "../store";
import { useReports } from "../queries";
import { cn } from "@/lib/utils";

const AGING_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "#fb923c",
  "var(--chart-3)",
  "#7f1d1d",
];

const CONCENTRATION_TONES = [
  "border-l-rose-600 bg-rose-100/95 dark:border-l-rose-400 dark:bg-rose-500/[0.16]",
  "border-l-rose-500 bg-rose-100/75 dark:border-l-rose-400/80 dark:bg-rose-500/[0.12]",
  "border-l-rose-400 bg-rose-50 dark:border-l-rose-400/60 dark:bg-rose-500/[0.09]",
  "border-l-slate-400 bg-slate-100/95 dark:border-l-slate-500 dark:bg-slate-800/70",
  "border-l-slate-300 bg-slate-100/75 dark:border-l-slate-600 dark:bg-slate-800/50",
];

export function ReportsView() {
  const { data, isLoading } = useReports();
  const currency = useCurrency();
  const openClient = useApp((s) => s.openClient);

  if (isLoading || !data) return <PageSkeleton rows={6} />;
  const { monthly, aging, topClients, stats } = data;
  const maxAging = Math.max(...aging.map((a) => a.balance), 1);

  return (
    <div className="space-y-5">
      {/* stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Loans Disbursed", value: String(stats.totalLoans), hint: `${stats.activeCount} active · ${stats.completedCount} settled` },
          { label: "Average Loan Size", value: <Money value={stats.avgLoanSize} />, hint: `avg term ${stats.avgTerm} months` },
          { label: "Avg Monthly Rate", value: `${stats.weightedAvgMonthlyRate.toFixed(1)}%`, hint: "weighted by outstanding principal" },
          { label: "Largest Exposure", value: <Money value={stats.largestExposure} />, hint: `${Math.round(stats.largestShare * 100)}% of active book` },
        ].map((s) => (
          <div key={s.label} className="card-lux accent-top rounded-xl border bg-card p-4">
            <p className="text-[10.5px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
              {s.label}
            </p>
            <p className="mt-2 font-display text-[22px] font-semibold leading-none tracking-tight">
              {s.value}
            </p>
            <p className="mt-2 text-[11.5px] text-muted-foreground">{s.hint}</p>
          </div>
        ))}
      </div>

      {/* monthly table + chart */}
      <Card className="card-lux">
        <CardHeader>
          <p className="text-[10px] font-semibold tracking-[0.12em] text-emerald-700 uppercase dark:text-emerald-400">
            Performance
          </p>
          <CardTitle className="mt-0.5 text-[15px]">Monthly Performance</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Disbursements vs collections, last 12 months
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.596 0.145 163)" />
                    <stop offset="100%" stopColor="oklch(0.596 0.145 163 / 0.5)" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickMargin={8} />
                <YAxis
                  ticks={niceTicks(Math.max(...monthly.map((m) => Math.max(m.collected, m.disbursed)), 0))}
                  tickFormatter={(v: number) => fmtAxis(v, currency)} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={52} />
                <Tooltip
                  cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                        <p className="mb-1 font-semibold text-popover-foreground">{label}</p>
                        {payload.map((p) => (
                          <p key={p.name} className="flex items-center gap-2 text-muted-foreground">
                            <span className="size-2 rounded-[3px]" style={{ background: p.color }} />
                            {p.name}: <span className="ml-auto font-medium tabular-nums text-popover-foreground">{fmtMoney(p.value as number, currency)}</span>
                          </p>
                        ))}
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="collected" name="Collected" fill="url(#gradCollected)" radius={[3, 3, 0, 0]} maxBarSize={22} />
                <Bar dataKey="disbursed" name="Disbursed" fill="var(--chart-5)" radius={[3, 3, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-5 overflow-x-auto scrollbar-slim">
            <table className="w-full text-[12.5px]">
              <thead className="thead-lux">
                <tr>
                  <th className="pr-4 pl-6 text-left">Month</th>
                  <th className="px-4 text-right">Disbursed</th>
                  <th className="px-4 text-right">New Loans</th>
                  <th className="px-4 text-right">Collected</th>
                  <th className="hidden px-4 text-right md:table-cell">Interest</th>
                  <th className="hidden px-4 text-right md:table-cell">Principal</th>
                  <th className="px-4 pr-6 text-right">Payments</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...monthly].reverse().map((m) => (
                  <tr key={m.key} className="hover:bg-muted/40">
                    <td className="py-2 pr-4 font-medium">
                      {format(new Date(`${m.key}-01`), "MMMM yyyy")}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtMoney(m.disbursed, currency)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{m.newLoans}</td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {fmtMoney(m.collected, currency)}
                    </td>
                    <td className="hidden px-4 py-2 text-right tabular-nums text-amber-700 dark:text-amber-400 md:table-cell">
                      {fmtMoney(m.interest, currency)}
                    </td>
                    <td className="hidden px-4 py-2 text-right tabular-nums md:table-cell">
                      {fmtMoney(m.principal, currency)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{m.paymentsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        {/* aging */}
        <Card className="card-lux flex h-[410px] flex-col gap-0 overflow-hidden py-0">
          <CardHeader className="shrink-0 border-b border-emerald-100/80 py-5">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-emerald-700 uppercase dark:text-emerald-400">
              Risk
            </p>
            <CardTitle className="mt-0.5 text-[15px]">Aging — Active Book</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Outstanding balance by how far past maturity
            </p>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 py-4">
            <ul className="grid h-full grid-rows-5 gap-2.5">
              {aging.map((a, i) => (
                <li key={a.bucket} className="flex min-h-0 flex-col justify-center rounded-lg border border-emerald-100/90 bg-gradient-to-r from-emerald-50/75 to-transparent px-3 py-2 dark:border-emerald-500/15 dark:from-emerald-500/[0.06]">
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className={cn("font-medium", i >= 3 && a.balance > 0 && "text-red-600 dark:text-red-400")}>
                      {a.bucket}
                      <span className="ml-2 text-[11.5px] font-normal text-muted-foreground">
                        {a.count} loan{a.count === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums">
                      <Money value={a.balance} />
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((a.balance / maxAging) * 100)}%`,
                        background: AGING_COLORS[i],
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* concentration */}
        <Card className="card-lux flex h-[410px] flex-col gap-0 overflow-hidden py-0">
          <CardHeader className="shrink-0 border-b border-emerald-100/80 py-5">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-emerald-700 uppercase dark:text-emerald-400">
              Concentration
            </p>
            <CardTitle className="mt-0.5 text-[15px]">Borrower Concentration</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Largest outstanding balances — click to open client
            </p>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 px-0 pb-0">
            {topClients.length === 0 ? (
              <EmptyState icon={BarChart3} title="Nothing outstanding" description="Every loan in the book is fully settled." />
            ) : (
              <ul className="h-full divide-y divide-rose-200/70 overflow-y-auto bg-slate-100/50 scrollbar-slim dark:divide-rose-500/15 dark:bg-slate-900/20">
                {topClients.map((c, i) => (
                  <li
                    key={c.clientId}
                    className={cn(
                      "border-l-4",
                      CONCENTRATION_TONES[Math.min(i, CONCENTRATION_TONES.length - 1)]
                    )}
                  >
                    <button
                      onClick={() => openClient(c.clientId)}
                      className="flex min-h-[58px] w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-rose-200/55 dark:hover:bg-rose-500/[0.18]"
                    >
                      <span className="w-5 text-center text-[12px] font-semibold text-muted-foreground tabular-nums">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium">{c.name}</p>
                        <div className="mt-1 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-white/80 shadow-inner dark:bg-slate-950/35">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-rose-600 to-rose-400"
                            style={{ width: `${Math.round(c.share * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[13.5px] font-semibold tabular-nums">
                          <Money value={c.outstanding} />
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {Math.round(c.share * 100)}% of book · {c.loanCount} loan{c.loanCount === 1 ? "" : "s"}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
