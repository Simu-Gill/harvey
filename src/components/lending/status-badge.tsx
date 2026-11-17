"use client";

// Status badges shared across loans, clients and dashboard.

import {
  CheckCircle2,
  CircleDashed,
  Clock,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LoanStatus } from "@/lib/types";

const MAP: Record<
  string,
  { label: string; icon: React.ElementType; className: string }
> = {
  on_track: {
    label: "On track",
    icon: CircleDashed,
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  },
  behind: {
    label: "Behind",
    icon: Clock,
    className: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20",
  },
  overdue: {
    label: "Overdue",
    icon: TriangleAlert,
    className: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/20",
  },
  completed: {
    label: "Settled",
    icon: CheckCircle2,
    className: "bg-stone-100 text-stone-600 ring-stone-500/20 dark:bg-stone-500/10 dark:text-stone-300 dark:ring-stone-400/20",
  },
  clean: {
    label: "No loans",
    icon: CircleDashed,
    className: "bg-stone-100 text-stone-500 ring-stone-400/20 dark:bg-stone-500/10 dark:text-stone-400 dark:ring-stone-500/20",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: LoanStatus | "clean";
  className?: string;
}) {
  const conf = MAP[status] ?? MAP.clean;
  const Icon = conf.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        conf.className,
        className
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {conf.label}
    </span>
  );
}

export const statusLabel = (s: string) => MAP[s]?.label ?? s;
