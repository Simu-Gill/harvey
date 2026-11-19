"use client";

// Clients registry: searchable, filterable table of borrowers with
// live portfolio positions. Row click opens the full client sheet.

import { useMemo, useState } from "react";
import { ChevronRight, Plus, Search, Users } from "lucide-react";
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
import { fmtDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ClientDTO } from "@/lib/types";
import { ClientAvatar } from "../client-avatar";
import { EmptyState } from "../empty-state";
import { Money } from "../money";
import { StatusBadge } from "../status-badge";
import { useApp } from "../store";
import { useClients } from "../queries";

type HealthFilter = "all" | "on_track" | "behind" | "overdue" | "clean";

// light row washes per health status (kept in sync with loans view)
const HEALTH_TINT: Record<string, { tint: string; hover: string }> = {
  on_track: {
    tint: "bg-emerald-50/40 dark:bg-emerald-500/[0.045]",
    hover: "hover:bg-emerald-50/80 focus-visible:bg-emerald-50/80 dark:hover:bg-emerald-500/[0.09] dark:focus-visible:bg-emerald-500/[0.09]",
  },
  behind: {
    tint: "bg-amber-50/50 dark:bg-amber-500/[0.055]",
    hover: "hover:bg-amber-50/90 focus-visible:bg-amber-50/90 dark:hover:bg-amber-500/[0.1] dark:focus-visible:bg-amber-500/[0.1]",
  },
  overdue: {
    tint: "bg-red-50/50 dark:bg-red-500/[0.06]",
    hover: "hover:bg-red-50/90 focus-visible:bg-red-50/90 dark:hover:bg-red-500/[0.11] dark:focus-visible:bg-red-500/[0.11]",
  },
  clean: {
    tint: "",
    hover: "hover:bg-emerald-50/60 focus-visible:bg-emerald-50/60 dark:hover:bg-emerald-500/[0.06] dark:focus-visible:bg-emerald-500/[0.06]",
  },
};

export function ClientsView() {
  const { data: clients, isLoading } = useClients();
  const openClient = useApp((s) => s.openClient);
  const openClientDialog = useApp((s) => s.openClientDialog);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<HealthFilter>("all");

  const stats = useMemo(() => {
    const list = clients ?? [];
    return {
      total: list.length,
      active: list.filter((c) => c.activeLoanCount > 0).length,
      outstanding: list.reduce((s, c) => s + c.outstandingBalance, 0),
      flagged: list.filter((c) => c.health === "behind" || c.health === "overdue").length,
    };
  }, [clients]);

  const rows = useMemo(() => {
    const list = clients ?? [];
    const q = query.trim().toLowerCase();
    const filtered = list.filter((c) => {
      if (filter !== "all" && c.health !== filter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.occupation ?? "").toLowerCase().includes(q)
      );
    });
    // sort: worst health first, then by outstanding
    const rank = { overdue: 0, behind: 1, on_track: 2, clean: 3 };
    return [...filtered].sort((a, b) => {
      const r = rank[a.health] - rank[b.health];
      if (r !== 0 && (a.activeLoanCount > 0 || b.activeLoanCount > 0)) return r;
      return b.outstandingBalance - a.outstandingBalance;
    });
  }, [clients, query, filter]);

  return (
    <div className="space-y-5">
      {/* stat chips */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total Clients", value: String(stats.total), tone: "text-foreground" },
          { label: "With Active Loans", value: String(stats.active), tone: "text-emerald-700 dark:text-emerald-400" },
          { label: "Total Outstanding", value: <Money value={stats.outstanding} />, tone: "text-foreground" },
          { label: "Behind / Overdue", value: String(stats.flagged), tone: stats.flagged > 0 ? "text-red-600 dark:text-red-400" : "text-foreground" },
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

      <Card className="card-lux overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, phone or occupation…"
              className="pl-9"
              aria-label="Search clients"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as HealthFilter)}>
              <SelectTrigger className="w-[170px]" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                <SelectItem value="on_track">On track</SelectItem>
                <SelectItem value="behind">Behind</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="clean">No active loans</SelectItem>
              </SelectContent>
            </Select>
            <Button className="gap-1.5 font-medium" onClick={() => openClientDialog()}>
              <Plus className="size-4" /> New Client
            </Button>
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No clients match"
              description="Try a different search, or register a new borrower to get started."
              action={
                <Button variant="outline" onClick={() => { setQuery(""); setFilter("all"); }}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto scrollbar-slim">
              <Table>
                <TableHeader className="thead-lux">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Client</TableHead>
                    <TableHead className="hidden md:table-cell">Occupation</TableHead>
                    <TableHead className="text-center">Loans</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Last Payment</TableHead>
                    <TableHead className="pr-6 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => (
                    <ClientRow key={c.id} client={c} onOpen={() => openClient(c.id)} />
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

function ClientRow({ client, onOpen }: { client: ClientDTO; onOpen: () => void }) {
  const wash = HEALTH_TINT[client.health] ?? HEALTH_TINT.clean;
  return (
    <TableRow
      onClick={onOpen}
      className={cn(
        "group cursor-pointer transition-colors",
        wash.tint,
        wash.hover,
        "focus-visible:outline-2 focus-visible:outline-emerald-500/40"
      )}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
    >
      <TableCell className="py-3 pl-6">
        <div className="flex items-center gap-3">
          <ClientAvatar name={client.name} />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-medium">{client.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {client.phone ?? "No phone on file"}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden text-[13px] text-muted-foreground md:table-cell">
        {client.occupation ?? "—"}
      </TableCell>
      <TableCell className="text-center text-[13px] tabular-nums">
        {client.activeLoanCount > 0 ? (
          <span>
            <span className="font-medium">{client.activeLoanCount}</span>
            <span className="text-muted-foreground"> / {client.loanCount}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">{client.loanCount}</span>
        )}
      </TableCell>
      <TableCell className="text-right text-[13.5px] font-semibold">
        {client.outstandingBalance > 0 ? (
          <Money value={client.outstandingBalance} />
        ) : (
          <span className="font-normal text-muted-foreground">Settled</span>
        )}
      </TableCell>
      <TableCell className="hidden text-right text-[13px] text-muted-foreground sm:table-cell">
        {client.lastPaymentAt ? fmtDateShort(client.lastPaymentAt) : "—"}
      </TableCell>
      <TableCell className="py-3.5 pr-6 text-right">
        <span className="inline-flex items-center gap-1.5">
          <StatusBadge status={client.health} />
          <ChevronRight className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
        </span>
      </TableCell>
    </TableRow>
  );
}
