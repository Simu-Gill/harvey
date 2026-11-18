"use client";

// Dashboard: the daily command centre — portfolio KPIs, 12-month
// collections trend, portfolio mix, recent activity, and loans
// that need attention.

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
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
  Banknote,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock,
  Gauge,
  Landmark,
  Percent,
  Receipt,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtAxis, fmtMoney, fmtDateShort } from "@/lib/format";
import { methodLabel } from "@/lib/types";
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

// row washes by status, shared by watchlist / loans / clients tables
export const ROW_TINT: Record<string, string> = {
  on_track: "bg-emerald-50/40 dark:bg-emerald-500/[0.045]",
  behind: "bg-amber-50/50 dark:bg-amber-500/[0.055]",
  overdue: "bg-red-50/50 dark:bg-red-500/[0.06]",
  completed: "bg-stone-100/60 dark:bg-stone-500/[0.06]",
  clean: "",
};

/** Small status pill with coloured text — used for health verdicts. */
function HealthPill({
  label,
  tone,
  icon: Icon,
}: {
  label: string;
  tone: "good" | "watch" | "risk" | "info";
  icon: React.ElementType;
}) {
  const tones = {
    good: "bg-emerald-50 text-emerald-700 ring-emerald-600/25 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/25",
    info: "bg-teal-50 text-teal-700 ring-teal-600/25 dark:bg-teal-500/15 dark:text-teal-300 dark:ring-teal-400/25",
    watch: "bg-amber-50 text-amber-700 ring-amber-600/25 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/25",
    risk: "bg-red-50 text-red-700 ring-red-600/25 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-400/25",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset",
        tones[tone]
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}

function collectionHealth(rate: number) {
  if (rate >= 0.9) return { label: "Strong", tone: "good" as const, icon: CheckCircle2 };
  if (rate >= 0.75) return { label: "Steady", tone: "info" as const, icon: CheckCircle2 };
  if (rate >= 0.55) return { label: "Watch", tone: "watch" as const, icon: Clock };
  return { label: "At Risk", tone: "risk" as const, icon: TriangleAlert };
}

function portfolioHealth(statusMix: DashboardDTO["statusMix"]) {
  const balance = (s: string) => statusMix.find((x) => x.status === s)?.balance ?? 0;
  const count = (s: string) => statusMix.find((x) => x.status === s)?.count ?? 0;
  const total = statusMix.reduce((s, x) => s + x.balance, 0);
  if (total <= 0) return { label: "No Book", tone: "info" as const, icon: CircleDashed };
  const overdueShare = balance("overdue") / total;
  const behindShare = balance("behind") / total;
  if (overdueShare > 0.15 || count("overdue") >= 3)
    return { label: "At Risk", tone: "risk" as const, icon: TriangleAlert };
  if (overdueShare > 0.05 || behindShare > 0.3)
    return { label: "Watch", tone: "watch" as const, icon: Clock };
  return { label: "Healthy", tone: "good" as const, icon: CheckCircle2 };
}

/** Round, human-friendly axis ticks (0, 4k, 8k, 12k …). */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.01; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

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

      {/* Portfolio ledger strip — clean card segments, no heavy green */}
      <Card className="card-lux overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
          {[
            {
              label: "Total Disbursed",
              value: kpis.totalDisbursed,
              hint: "across the whole book",
              icon: Banknote,
              tile: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/25",
              bar: "from-emerald-500 to-teal-500",
            },
            {
              label: "Interest Income",
              value: kpis.totalInterestEarned,
              hint: "collected to date",
              icon: TrendingUp,
              tile: "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-500/25",
              bar: "from-amber-400 to-orange-500",
            },
            {
              label: "Collection Rate",
              value: null,
              hint: "collected vs schedule",
              icon: Gauge,
              tile: "bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm shadow-teal-500/25",
              bar: "from-teal-500 to-emerald-500",
              custom: (
                <div className="mt-2.5">
                  <p className="font-display text-[24px] font-semibold leading-none tracking-tight">
                    {Math.round(kpis.collectionRate * 100)}%
                  </p>
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted shadow-[inset_0_1px_2px_oklch(0_0_0/0.06)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"
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
              icon: CalendarClock,
              tile: "bg-gradient-to-br from-stone-500 to-stone-700 text-white shadow-sm shadow-stone-500/20",
              bar: "from-stone-400 to-stone-600",
            },
          ].map((s, i) => (
            <div
              key={s.label}
              className={cn(
                "relative p-5",
                "border-border/70",
                i > 0 && "border-t sm:border-t-0 sm:border-l",
                i === 2 && "sm:border-t md:border-t-0",
                i === 2 && "border-l-0 sm:border-l md:border-l"
              )}
            >
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className={cn(
                    "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
                    s.tile
                  )}
                >
                  <s.icon className="size-4" strokeWidth={2.2} />
                </span>
                <p className="text-[10.5px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                  {s.label}
                </p>
              </div>
              {s.custom ?? (
                <p className="mt-3 font-display text-[24px] font-semibold leading-none tracking-tight">
                  <Money value={s.value ?? 0} />
                </p>
              )}
              <p className="mt-2.5 text-[11.5px] text-muted-foreground">{s.hint}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="card-lux lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.12em] text-emerald-700 uppercase dark:text-emerald-400">
                Cash flow
              </p>
              <CardTitle className="mt-0.5 text-[15px]">Collections</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Last 12 months · interest and principal split
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {(() => {
                const h = collectionHealth(kpis.collectionRate);
                return (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                      Collection Health
                    </span>
                    <HealthPill label={h.label} tone={h.tone} icon={h.icon} />
                  </div>
                );
              })()}
              <div className="hidden items-center gap-4 text-[11px] text-muted-foreground sm:flex">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-[3px] bg-[var(--chart-1)]" /> Principal
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-[3px] bg-[var(--chart-2)]" /> Interest
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[290px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthly as MonthPointDTO[]} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradPrincipal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.596 0.145 163)" />
                      <stop offset="100%" stopColor="oklch(0.596 0.145 163 / 0.55)" />
                    </linearGradient>
                    <linearGradient id="gradInterest" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.769 0.17 70)" />
                      <stop offset="100%" stopColor="oklch(0.769 0.17 70 / 0.55)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickMargin={8}
                  />
                  <YAxis
                    ticks={niceTicks(Math.max(...monthly.map((m) => m.collected), 0))}
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
                  <Bar dataKey="principal" name="Principal" stackId="c" fill="url(#gradPrincipal)" radius={[0, 0, 0, 0]} maxBarSize={26} />
                  <Bar dataKey="interest" name="Interest" stackId="c" fill="url(#gradInterest)" radius={[3, 3, 0, 0]} maxBarSize={26} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="card-lux">
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.12em] text-emerald-700 uppercase dark:text-emerald-400">
                Exposure
              </p>
              <CardTitle className="mt-0.5 text-[15px]">Portfolio Health</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {totalActive} active loans
              </p>
            </div>
            {(() => {
              const h = portfolioHealth(statusMix);
              return <HealthPill label={h.label} tone={h.tone} icon={h.icon} />;
            })()}
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
                <p className="text-[9.5px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Exposure
                </p>
                <p className="mt-0.5 font-display text-[22px] font-semibold tracking-tight">
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

      {/* Activity + attention — twin tables, equal height, 7 rows peeking */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="card-lux flex flex-col overflow-hidden lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between border-b">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.12em] text-emerald-700 uppercase dark:text-emerald-400">
                Latest activity
              </p>
              <CardTitle className="mt-0.5 text-[15px]">Recent Payments</CardTitle>
            </div>
            <button
              onClick={() => setView("payments")}
              className="inline-flex items-center gap-1 text-[12.5px] font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            >
              View ledger <ArrowRight className="size-3.5" />
            </button>
          </CardHeader>
          {recentPayments.length === 0 ? (
            <div className="flex h-[434px] items-center justify-center">
              <EmptyState
                icon={Receipt}
                title="No payments yet"
                description="Recorded collections will appear here instantly."
              />
            </div>
          ) : (
            <div className="h-[434px] overflow-y-auto scrollbar-slim">
              <Table>
                <TableHeader className="thead-lux sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Client</TableHead>
                    <TableHead className="hidden md:table-cell">Loan</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead className="hidden text-right lg:table-cell">Split</TableHead>
                    <TableHead className="pr-6 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.map((p) => (
                    <TableRow
                      key={p.id}
                      onClick={() => openLoan(p.loanId)}
                      className="cursor-pointer bg-emerald-50/25 transition-colors hover:bg-emerald-50/70 focus-visible:bg-emerald-50/70 dark:bg-emerald-500/[0.03] dark:hover:bg-emerald-500/[0.08] dark:focus-visible:bg-emerald-500/[0.08]"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && openLoan(p.loanId)}
                    >
                      <TableCell className="py-2.5 pl-6">
                        <div className="flex items-center gap-3">
                          <ClientAvatar name={p.clientName} className="size-8 text-[12px]" />
                          <div className="min-w-0">
                            <p className="truncate text-[13.5px] font-medium">{p.clientName}</p>
                            <p className="text-[11.5px] text-muted-foreground">
                              {methodLabel(p.method)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden font-mono text-[11.5px] text-muted-foreground md:table-cell">
                        {p.loanReference}
                      </TableCell>
                      <TableCell className="hidden text-[12.5px] tabular-nums text-muted-foreground md:table-cell">
                        {fmtDateShort(p.date)}
                      </TableCell>
                      <TableCell className="hidden text-right lg:table-cell">
                        <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 tabular-nums dark:bg-amber-500/10 dark:text-amber-300">
                          {fmtMoney(p.interestPart, currency)} int
                        </span>{" "}
                        <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 tabular-nums dark:bg-emerald-500/10 dark:text-emerald-300">
                          {fmtMoney(p.principalPart, currency)} prin
                        </span>
                      </TableCell>
                      <TableCell className="pr-6 text-right font-display text-[14.5px] font-semibold">
                        <Money value={p.amount} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        <Card className="card-lux flex flex-col overflow-hidden">
          <CardHeader className="flex-row items-center justify-between border-b">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.12em] text-red-600 uppercase dark:text-red-400">
                Watchlist
              </p>
              <CardTitle className="mt-0.5 text-[15px]">Needs Attention</CardTitle>
            </div>
          </CardHeader>
          {attention.length === 0 ? (
            <div className="flex h-[434px] items-center justify-center">
              <EmptyState
                icon={TriangleAlert}
                title="All clear"
                description="Every loan is on schedule — nothing needs chasing today."
              />
            </div>
          ) : (
            <div className="h-[434px] overflow-y-auto scrollbar-slim">
              <Table>
                <TableHeader className="thead-lux sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Client</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="pr-6 text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attention.map((l) => (
                    <TableRow
                      key={l.id}
                      onClick={() => openLoan(l.id)}
                      className={cn(
                        "group cursor-pointer transition-colors",
                        ROW_TINT[l.status],
                        l.status === "overdue"
                          ? "hover:bg-red-50/90 focus-visible:bg-red-50/90 dark:hover:bg-red-500/[0.11] dark:focus-visible:bg-red-500/[0.11]"
                          : "hover:bg-amber-50/90 focus-visible:bg-amber-50/90 dark:hover:bg-amber-500/[0.11] dark:focus-visible:bg-amber-500/[0.11]"
                      )}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && openLoan(l.id)}
                    >
                      <TableCell className="py-2.5 pl-6">
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden
                            className={cn(
                              "h-8 w-1 shrink-0 rounded-full",
                              l.status === "overdue"
                                ? "bg-gradient-to-b from-red-500 to-rose-500"
                                : "bg-gradient-to-b from-amber-400 to-orange-500"
                            )}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-[13.5px] font-medium">{l.clientName}</p>
                            <p className="truncate text-[11.5px] text-muted-foreground">
                              {l.reference}
                              {l.status === "overdue" ? (
                                <span className="font-medium text-red-600 dark:text-red-400">
                                  {" "}· {l.daysOverdue}d late
                                </span>
                              ) : (
                                <span className="font-medium text-amber-600 dark:text-amber-400">
                                  {" "}· behind schedule
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <StatusBadge status={l.status} className="px-2 py-0 text-[10.5px]" />
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-[13.5px] font-semibold">
                            <Money value={l.balance} />
                          </span>
                          <ChevronRight className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Portfolio position as of {format(new Date(), "EEEE, MMMM d, yyyy")} · figures update instantly with every entry
      </p>
    </div>
  );
}
