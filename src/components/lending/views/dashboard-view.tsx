"use client";

// Dashboard: the daily command centre — portfolio KPIs, 12-month
// collections trend, portfolio mix, recent activity, and loans
// that need attention.

import {
  AreaChart,
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Landmark,
  Percent,
  Receipt,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtAxis, fmtMoney, fmtDateShort, methodLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardDTO, MonthPointDTO } from "@/lib/types";
import { KpiCard } from "../kpi-card";
import { Money, useCurrency } from "../money";
import { StatusBadge, statusLabel } from "../status-badge";
import { ClientAvatar } from "../client-avatar";
import { EmptyState } from "../empty-state";
import { PageSkeleton } from "../app-shell";
import { useApp } from "../store";
import { useDashboard } from "../queries";

// ── chart helpers ───────────────────────────────────────────────────
function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold text-popover-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-[3px]" style={{ background: p.color }} />
          {p.name}:
          <span className="ml-auto font-medium tabular-nums text-popover-foreground">
            {fmtMoney(p.value, currency)}
          </span>
        </p>
      ))}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  on_track: "var(--chart-1)",
  behind: "var(--chart-2)",
  overdue: "var(--chart-3)",
  completed: "var(--chart-5)",
};

export function DashboardView() {
  const { data, isLoading } = useDashboard();
  const currency = useCurrency();
  const openLoan = useApp((s) => s.openLoan);
  const setView = useApp((s) => s.setView);

  if (isLoading || !data) return <PageSkeleton rows={7} />;
  const { kpis, monthly, statusMix, recentPayments, attention } = data;

  const lastMonthDelta =
    kpis.collectedLastMonth > 0
      ? (kpis.collectedThisMonth - kpis.collectedLastMonth) / kpis.collectedLastMonth
      : null;

  const donutData = statusMix.filter((s) => s.count > 0);
  const totalActive = statusMix.reduce((s, x) => s + x.count, 0);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Principal Outstanding"
          value={kpis.outstandingPrincipal}
          icon={Landmark}
          tone="emerald"
          sub={`${kpis.activeLoans} active loans`}
        />
        <KpiCard
          label="Interest Outstanding"
          value={kpis.outstandingInterest}
          icon={Percent}
          tone="amber"
          sub="still to be collected"
        />
        <KpiCard
          label="Collected This Month"
          value={kpis.collectedThisMonth}
          icon={Wallet}
          tone="emerald"
          valueClassName="text-emerald-700 dark:text-emerald-400"
          sub={
            <span className="inline-flex flex-wrap items-center gap-x-1.5">
              <span className="tabular-nums">
                {fmtMoney(kpis.interestThisMonth, currency)} interest ·{" "}
                {fmtMoney(kpis.principalThisMonth, currency)} principal
              </span>
              {lastMonthDelta !== null && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 font-medium",
                    lastMonthDelta >= 0 ? "text-emerald-600" : "text-red-500"
                  )}
                >
                  {lastMonthDelta >= 0 ? (
                    <ArrowUpRight className="size-3.5" />
                  ) : (
                    <ArrowDownRight className="size-3.5" />
                  )}
                  {Math.abs(Math.round(lastMonthDelta * 100))}% vs last month
                </span>
              )}
            </span>
          }
        />
        <KpiCard
          label="Overdue Balance"
          value={kpis.overdueBalance}
          icon={TriangleAlert}
          tone={kpis.overdueCount > 0 ? "red" : "stone"}
          valueClassName={
            kpis.overdueCount > 0 ? "text-red-600 dark:text-red-400" : undefined
          }
          sub={
            kpis.overdueCount > 0
              ? `${kpis.overdueCount} loans past maturity`
              : "nothing past maturity"
          }
        />
      </div>

      {/* Portfolio strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border shadow-xs md:grid-cols-4">
        {[
          {
            label: "Total Disbursed",
            value: kpis.totalDisbursed,
            hint: "across the whole book",
          },
          {
            label: "Interest Income",
            value: kpis.totalInterestEarned,
            hint: "collected to date",
          },
          {
            label: "Collection Rate",
            value: null,
            hint: "collected vs schedule",
            custom: (
              <div className="mt-1.5">
                <p className="text-[22px] font-semibold leading-none tracking-tight">
                  {Math.round(kpis.collectionRate * 100)}%
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
                    style={{ width: `${Math.min(100, kpis.collectionRate * 100)}%` }}
                  />
                </div>
              </div>
            ),
          },
          {
            label: "Expected This Month",
            value: kpis.expectedThisMonth,
            hint: `${kpis.clientsWithActiveLoans} borrowers active`,
          },
        ].map((s) => (
          <div key={s.label} className="bg-card p-4 sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {s.label}
            </p>
            {s.custom ?? (
              <>
                <p className="mt-1.5 text-[22px] font-semibold leading-none tracking-tight">
                  <Money value={s.value ?? 0} />
                </p>
                <p className="mt-2 text-[12px] text-muted-foreground">{s.hint}</p>
              </>
            )}
            {s.custom && (
              <p className="mt-2 text-[12px] text-muted-foreground">{s.hint}</p>
            )}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[15px]">Collections &amp; Disbursements</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Last 12 months · interest and principal split
              </p>
            </div>
            <div className="hidden items-center gap-4 text-[11px] text-muted-foreground sm:flex">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px] bg-[var(--chart-1)]" /> Principal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px] bg-[var(--chart-2)]" /> Interest
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full bg-[var(--chart-5)]" /> Disbursed
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[290px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthly as MonthPointDTO[]} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickMargin={8}
                  />
                  <YAxis
                    tickFormatter={(v: number) => fmtAxis(v, currency)}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    width={52}
                  />
                  <Tooltip
                    content={(props) => (
                      <ChartTooltip {...(props as object)} currency={currency} />
                    )}
                    cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                  />
                  <Bar dataKey="principal" name="Principal" stackId="c" fill="var(--chart-1)" radius={[0, 0, 0, 0]} maxBarSize={26} />
                  <Bar dataKey="interest" name="Interest" stackId="c" fill="var(--chart-2)" radius={[3, 3, 0, 0]} maxBarSize={26} />
                  <Line
                    type="monotone"
                    dataKey="disbursed"
                    name="Disbursed"
                    stroke="var(--chart-5)"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Portfolio Health</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {totalActive} active loans
            </p>
          </CardHeader>
          <CardContent>
            <div className="relative h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="balance"
                    nameKey="status"
                    innerRadius="64%"
                    outerRadius="92%"
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {donutData.map((d) => (
                      <Cell key={d.status} fill={STATUS_COLORS[d.status]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                          <p className="font-semibold capitalize text-popover-foreground">
                            {statusLabel(payload[0].name as string)}
                          </p>
                          <p className="text-muted-foreground">
                            {payload[0].payload.count} loans ·{" "}
                            <span className="font-medium tabular-nums text-popover-foreground">
                              {fmtMoney(payload[0].payload.balance, currency)}
                            </span>
                          </p>
                        </div>
                      ) : null
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Exposure
                </p>
                <p className="text-xl font-semibold tracking-tight">
                  <Money value={kpis.portfolioBalance} compact />
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {statusMix.map((s) => (
                <li key={s.status} className="flex items-center gap-2.5 text-[13px]">
                  <span
                    className="size-2.5 rounded-[3px]"
                    style={{ background: STATUS_COLORS[s.status] }}
                  />
                  <span className="text-muted-foreground">{statusLabel(s.status)}</span>
                  <span className="ml-auto tabular-nums font-medium">{s.count}</span>
                  <span className="w-20 text-right tabular-nums text-muted-foreground">
                    <Money value={s.balance} compact />
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Activity + attention */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-[15px]">Recent Payments</CardTitle>
            <button
              onClick={() => setView("payments")}
              className="inline-flex items-center gap-1 text-[12.5px] font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            >
              View ledger <ArrowRight className="size-3.5" />
            </button>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {recentPayments.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No payments yet"
                description="Recorded collections will appear here instantly."
              />
            ) : (
              <ul className="divide-y border-t">
                {recentPayments.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => openLoan(p.loanId)}
                      className="flex w-full items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <ClientAvatar name={p.clientName} className="size-8 text-[12px]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium">{p.clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.loanReference} · {methodLabel(p.method)} · {fmtDateShort(p.date)}
                        </p>
                      </div>
                      <div className="hidden text-right text-[11.5px] text-muted-foreground sm:block">
                        <span className="tabular-nums text-amber-600 dark:text-amber-400">
                          {fmtMoney(p.interestPart, currency)}
                        </span>{" "}
                        int ·{" "}
                        <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
                          {fmtMoney(p.principalPart, currency)}
                        </span>{" "}
                        prin
                      </div>
                      <p className="w-24 text-right text-[14px] font-semibold">
                        <Money value={p.amount} />
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-[15px]">Needs Attention</CardTitle>
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-inset ring-red-600/15 dark:bg-red-500/10 dark:text-red-300">
              {attention.length}
            </span>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {attention.length === 0 ? (
              <EmptyState
                icon={TriangleAlert}
                title="All clear"
                description="Every loan is on schedule — nothing needs chasing today."
              />
            ) : (
              <ul className="divide-y border-t">
                {attention.map((l) => (
                  <li key={l.id}>
                    <button
                      onClick={() => openLoan(l.id)}
                      className="flex w-full items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium">{l.clientName}</p>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {l.reference}
                          {l.status === "overdue" ? (
                            <span className="font-medium text-red-600 dark:text-red-400">
                              · {l.daysOverdue}d late
                            </span>
                          ) : (
                            <span className="font-medium text-amber-600 dark:text-amber-400">
                              · behind schedule
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[14px] font-semibold">
                          <Money value={l.balance} />
                        </p>
                        <StatusBadge status={l.status} className="mt-0.5 px-2 py-0 text-[10.5px]" />
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Portfolio position as of {format(new Date(), "EEEE, MMMM d, yyyy")} · figures update instantly with every entry
      </p>
    </div>
  );
}
